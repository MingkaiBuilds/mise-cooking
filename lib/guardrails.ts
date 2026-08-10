import { env } from "cloudflare:workers";
import type { RecipeResult } from "./recipe";

const encoder = new TextEncoder();

export type GuardrailConfig = {
  pilotBudgetMicros: number;
  budgetPeriod: string;
  dailyGenerationLimit: number;
  userDailyGenerationLimit: number;
  hourlyRequestLimit: number;
  reservationMicros: number;
  cacheTtlSeconds: number;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

type CachedRecipeRow = {
  recipe_json: string;
  model: string;
  created_at: number;
};

type BudgetRow = {
  spent_micros: number;
  reserved_micros: number;
  request_count: number;
};

let schemaInitialization: { db: D1Database; promise: Promise<void> } | null = null;

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getGuardrailConfig(): GuardrailConfig {
  return {
    pilotBudgetMicros: Math.round(positiveNumber(process.env.PILOT_BUDGET_USD, 200) * 1_000_000),
    budgetPeriod: (process.env.BUDGET_PERIOD || "founding-pilot-2026").slice(0, 80),
    dailyGenerationLimit: Math.round(positiveNumber(process.env.DAILY_GENERATION_LIMIT, 300)),
    userDailyGenerationLimit: Math.round(positiveNumber(process.env.USER_DAILY_GENERATION_LIMIT, 8)),
    hourlyRequestLimit: Math.round(positiveNumber(process.env.HOURLY_REQUEST_LIMIT, 120)),
    reservationMicros: Math.round(positiveNumber(process.env.GENERATION_RESERVATION_USD, 0.02) * 1_000_000),
    cacheTtlSeconds: Math.round(positiveNumber(process.env.CACHE_TTL_DAYS, 90) * 86_400),
    inputUsdPerMillion: positiveNumber(process.env.MODEL_INPUT_USD_PER_MILLION, 0.2),
    outputUsdPerMillion: positiveNumber(process.env.MODEL_OUTPUT_USD_PER_MILLION, 1.2),
  };
}

export function getRuntimeDb(): D1Database | null {
  return ((env as unknown as { DB?: D1Database }).DB ?? null);
}

async function initializeRuntimeSchema(db: D1Database) {
  const existing = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM sqlite_schema
       WHERE type = 'table'
         AND name IN ('budget_ledger', 'generation_locks', 'quota_counters', 'recipe_cache')`,
    )
    .first<{ count: number }>();
  if (Number(existing?.count ?? 0) === 4) return;

  // Keep these idempotent statements aligned with db/schema.ts and checked-in migrations.
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS budget_ledger (
         period TEXT PRIMARY KEY NOT NULL,
         spent_micros INTEGER DEFAULT 0 NOT NULL,
         reserved_micros INTEGER DEFAULT 0 NOT NULL,
         request_count INTEGER DEFAULT 0 NOT NULL,
         updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
       )`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS generation_locks (
         cache_key TEXT PRIMARY KEY NOT NULL,
         expires_at INTEGER NOT NULL
       )`,
    ),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_generation_locks_expires_at
       ON generation_locks (expires_at)`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS quota_counters (
         bucket TEXT NOT NULL,
         window TEXT NOT NULL,
         count INTEGER DEFAULT 0 NOT NULL,
         updated_at INTEGER DEFAULT (unixepoch()) NOT NULL,
         PRIMARY KEY (bucket, window)
       )`,
    ),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_quota_counters_updated_at
       ON quota_counters (updated_at)`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS recipe_cache (
         cache_key TEXT PRIMARY KEY NOT NULL,
         video_id TEXT NOT NULL,
         source_url TEXT NOT NULL,
         recipe_json TEXT NOT NULL,
         model TEXT NOT NULL,
         input_tokens INTEGER DEFAULT 0 NOT NULL,
         output_tokens INTEGER DEFAULT 0 NOT NULL,
         estimated_cost_micros INTEGER DEFAULT 0 NOT NULL,
         hit_count INTEGER DEFAULT 0 NOT NULL,
         created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
         expires_at INTEGER NOT NULL
       )`,
    ),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_recipe_cache_video_id
       ON recipe_cache (video_id)`,
    ),
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_recipe_cache_expires_at
       ON recipe_cache (expires_at)`,
    ),
  ]);
  await db.prepare("PRAGMA optimize").run();
}

export function ensureRuntimeSchema(db: D1Database) {
  if (schemaInitialization?.db === db) return schemaInitialization.promise;

  const promise = initializeRuntimeSchema(db).catch((error) => {
    if (schemaInitialization?.db === db) schemaInitialization = null;
    throw error;
  });
  schemaInitialization = { db, promise };
  return promise;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function anonymousRequestId(request: Request, salt: string) {
  const network =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return (await sha256(`${salt}|${network}|${userAgent}`)).slice(0, 32);
}

export function normalizeTikTokIdentity(value: string) {
  const url = new URL(value);
  const videoId = url.pathname.match(/\/video\/(\d+)/)?.[1];
  return videoId ?? `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
}

export function normalizeDietary(value: string | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 200);
}

export async function buildRecipeCacheKey(videoId: string, servings: number, dietary: string) {
  return sha256(`v1|${videoId}|${servings}|${dietary}`);
}

function changes(result: D1Result) {
  return Number((result.meta as { changes?: number } | undefined)?.changes ?? 0);
}

function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function utcHour(now = new Date()) {
  return now.toISOString().slice(0, 13);
}

export async function consumeQuota(
  db: D1Database,
  bucket: string,
  window: string,
  limit: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare(
      `INSERT INTO quota_counters (bucket, window, count, updated_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT(bucket, window) DO UPDATE SET
         count = quota_counters.count + 1,
         updated_at = excluded.updated_at
       WHERE quota_counters.count < ?`,
    )
    .bind(bucket, window, now, limit)
    .run();
  return changes(result) > 0;
}

export async function allowHourlyRequest(db: D1Database, anonymousId: string, limit: number) {
  return consumeQuota(db, `request:${anonymousId}`, utcHour(), limit);
}

export async function allowUserGeneration(db: D1Database, anonymousId: string, limit: number) {
  return consumeQuota(db, `generation:${anonymousId}`, utcDay(), limit);
}

export async function allowGlobalGeneration(db: D1Database, limit: number) {
  return consumeQuota(db, "generation:global", utcDay(), limit);
}

export async function getCachedRecipe(db: D1Database, cacheKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `SELECT recipe_json, model, created_at
       FROM recipe_cache
       WHERE cache_key = ? AND expires_at > ?`,
    )
    .bind(cacheKey, now)
    .first<CachedRecipeRow>();
  if (!row) return null;

  try {
    const recipe = JSON.parse(row.recipe_json) as RecipeResult;
    await db
      .prepare("UPDATE recipe_cache SET hit_count = hit_count + 1 WHERE cache_key = ?")
      .bind(cacheKey)
      .run();
    return { recipe, model: row.model, createdAt: row.created_at };
  } catch {
    await db.prepare("DELETE FROM recipe_cache WHERE cache_key = ?").bind(cacheKey).run();
    return null;
  }
}

export async function saveCachedRecipe(
  db: D1Database,
  input: {
    cacheKey: string;
    videoId: string;
    sourceUrl: string;
    recipe: RecipeResult;
    model: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCostMicros: number;
    ttlSeconds: number;
  },
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO recipe_cache (
         cache_key, video_id, source_url, recipe_json, model,
         input_tokens, output_tokens, estimated_cost_micros,
         hit_count, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         recipe_json = excluded.recipe_json,
         model = excluded.model,
         input_tokens = excluded.input_tokens,
         output_tokens = excluded.output_tokens,
         estimated_cost_micros = excluded.estimated_cost_micros,
         created_at = excluded.created_at,
         expires_at = excluded.expires_at`,
    )
    .bind(
      input.cacheKey,
      input.videoId,
      input.sourceUrl,
      JSON.stringify(input.recipe),
      input.model,
      input.inputTokens,
      input.outputTokens,
      input.estimatedCostMicros,
      now,
      now + input.ttlSeconds,
    )
    .run();
}

export async function acquireGenerationLock(db: D1Database, cacheKey: string) {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare("DELETE FROM generation_locks WHERE expires_at <= ?").bind(now).run();
  const result = await db
    .prepare("INSERT OR IGNORE INTO generation_locks (cache_key, expires_at) VALUES (?, ?)")
    .bind(cacheKey, now + 180)
    .run();
  return changes(result) > 0;
}

export async function releaseGenerationLock(db: D1Database, cacheKey: string) {
  await db.prepare("DELETE FROM generation_locks WHERE cache_key = ?").bind(cacheKey).run();
}

export async function reserveBudget(
  db: D1Database,
  period: string,
  limitMicros: number,
  reservationMicros: number,
) {
  if (reservationMicros > limitMicros) return false;
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare(
      `INSERT INTO budget_ledger (
         period, spent_micros, reserved_micros, request_count, updated_at
       ) VALUES (?, 0, ?, 0, ?)
       ON CONFLICT(period) DO UPDATE SET
         reserved_micros = budget_ledger.reserved_micros + excluded.reserved_micros,
         updated_at = excluded.updated_at
       WHERE budget_ledger.spent_micros + budget_ledger.reserved_micros + excluded.reserved_micros <= ?`,
    )
    .bind(period, reservationMicros, now, limitMicros)
    .run();
  return changes(result) > 0;
}

export async function releaseBudgetReservation(
  db: D1Database,
  period: string,
  reservationMicros: number,
) {
  await db
    .prepare(
      `UPDATE budget_ledger
       SET reserved_micros = MAX(0, reserved_micros - ?), updated_at = ?
       WHERE period = ?`,
    )
    .bind(reservationMicros, Math.floor(Date.now() / 1000), period)
    .run();
}

export async function settleBudget(
  db: D1Database,
  period: string,
  reservationMicros: number,
  actualMicros: number,
) {
  await db
    .prepare(
      `UPDATE budget_ledger
       SET reserved_micros = MAX(0, reserved_micros - ?),
           spent_micros = spent_micros + ?,
           request_count = request_count + 1,
           updated_at = ?
       WHERE period = ?`,
    )
    .bind(reservationMicros, actualMicros, Math.floor(Date.now() / 1000), period)
    .run();
}

export function estimateModelCostMicros(
  inputTokens: number,
  outputTokens: number,
  config: GuardrailConfig,
) {
  return Math.ceil(
    inputTokens * config.inputUsdPerMillion +
      outputTokens * config.outputUsdPerMillion,
  );
}

export async function getBudgetStatus(db: D1Database, config: GuardrailConfig) {
  const row = await db
    .prepare(
      `SELECT spent_micros, reserved_micros, request_count
       FROM budget_ledger WHERE period = ?`,
    )
    .bind(config.budgetPeriod)
    .first<BudgetRow>();
  const cached = await db.prepare("SELECT COUNT(*) AS count FROM recipe_cache").first<{ count: number }>();
  return {
    pilotBudgetUsd: config.pilotBudgetMicros / 1_000_000,
    spentUsd: (row?.spent_micros ?? 0) / 1_000_000,
    reservedUsd: (row?.reserved_micros ?? 0) / 1_000_000,
    requestCount: row?.request_count ?? 0,
    cachedRecipes: cached?.count ?? 0,
  };
}

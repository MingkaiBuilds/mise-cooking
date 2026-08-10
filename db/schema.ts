import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const recipeCache = sqliteTable(
  "recipe_cache",
  {
    cacheKey: text("cache_key").primaryKey(),
    videoId: text("video_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    recipeJson: text("recipe_json").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    estimatedCostMicros: integer("estimated_cost_micros").notNull().default(0),
    hitCount: integer("hit_count").notNull().default(0),
    createdAt: integer("created_at").notNull().default(sql`(unixepoch())`),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("idx_recipe_cache_video_id").on(table.videoId),
    index("idx_recipe_cache_expires_at").on(table.expiresAt),
  ],
);

export const quotaCounters = sqliteTable(
  "quota_counters",
  {
    bucket: text("bucket").notNull(),
    window: text("window").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    primaryKey({ columns: [table.bucket, table.window] }),
    index("idx_quota_counters_updated_at").on(table.updatedAt),
  ],
);

export const generationLocks = sqliteTable(
  "generation_locks",
  {
    cacheKey: text("cache_key").primaryKey(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("idx_generation_locks_expires_at").on(table.expiresAt)],
);

export const budgetLedger = sqliteTable("budget_ledger", {
  period: text("period").primaryKey(),
  spentMicros: integer("spent_micros").notNull().default(0),
  reservedMicros: integer("reserved_micros").notNull().default(0),
  requestCount: integer("request_count").notNull().default(0),
  updatedAt: integer("updated_at").notNull().default(sql`(unixepoch())`),
});

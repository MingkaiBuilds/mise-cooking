import { getBudgetStatus, getGuardrailConfig, getRuntimeDb } from "../../../lib/guardrails";

export const runtime = "edge";

export async function GET() {
  const config = getGuardrailConfig();
  const db = getRuntimeDb();
  const liveEnabled = Boolean(
    process.env.OPENAI_API_KEY &&
      process.env.RATE_LIMIT_SALT &&
      process.env.GENERATION_ENABLED !== "false" &&
      db,
  );

  if (!db) {
    return Response.json({
      liveEnabled: false,
      pilotBudgetUsd: config.pilotBudgetMicros / 1_000_000,
      spentUsd: 0,
      reservedUsd: 0,
      requestCount: 0,
      cachedRecipes: 0,
      dailyGenerationLimit: config.dailyGenerationLimit,
    });
  }

  try {
    const status = await getBudgetStatus(db, config);
    return Response.json({ ...status, liveEnabled, dailyGenerationLimit: config.dailyGenerationLimit });
  } catch {
    return Response.json({
      liveEnabled: false,
      pilotBudgetUsd: config.pilotBudgetMicros / 1_000_000,
      spentUsd: 0,
      reservedUsd: 0,
      requestCount: 0,
      cachedRecipes: 0,
      dailyGenerationLimit: config.dailyGenerationLimit,
    });
  }
}

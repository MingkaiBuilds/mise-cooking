import type { RecipeResult } from "../../../lib/recipe";
import {
  acquireGenerationLock,
  allowGlobalGeneration,
  allowHourlyRequest,
  allowUserGeneration,
  anonymousRequestId,
  buildRecipeCacheKey,
  estimateModelCostMicros,
  getCachedRecipe,
  getGuardrailConfig,
  getRuntimeDb,
  normalizeDietary,
  normalizeTikTokIdentity,
  releaseGenerationLock,
  releaseMonthlyReservation,
  reserveMonthlyBudget,
  saveCachedRecipe,
  settleMonthlyBudget,
} from "../../../lib/guardrails";

export const runtime = "edge";

type AnalyzeRequest = {
  url?: string;
  servings?: number;
  zipCode?: string;
  dietary?: string;
};

type TikTokMetadata = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

const recipeSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title", "subtitle", "author", "servings", "prepTime", "cookTime",
    "confidence", "sourceNote", "ingredients", "steps", "tools", "tips",
  ],
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    author: { type: "string" },
    servings: { type: "integer" },
    prepTime: { type: "string" },
    cookTime: { type: "string" },
    confidence: { enum: ["high", "medium", "low"] },
    sourceNote: { type: "string" },
    ingredients: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name", "amount", "note", "confidence", "product", "packageSize",
          "buyQuantity", "searchTerm", "optional",
        ],
        properties: {
          name: { type: "string" },
          amount: { type: "string" },
          note: { type: "string" },
          confidence: { enum: ["high", "medium", "low"] },
          product: { type: "string" },
          packageSize: { type: "string" },
          buyQuantity: { type: "string" },
          searchTerm: { type: "string" },
          optional: { type: "boolean" },
        },
      },
    },
    steps: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "instruction", "why", "time"],
        properties: {
          title: { type: "string" },
          instruction: { type: "string" },
          why: { type: "string" },
          time: { type: "string" },
        },
      },
    },
    tools: { type: "array", items: { type: "string" } },
    tips: { type: "array", items: { type: "string" } },
  },
} as const;

function isTikTokUrl(value: string) {
  try {
    const { hostname, protocol } = new URL(value);
    return protocol === "https:" && (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com"));
  } catch {
    return false;
  }
}

async function getTikTokMetadata(url: string): Promise<TikTokMetadata | null> {
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as TikTokMetadata;
  } catch {
    return null;
  }
}

function extractOutputText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

function apiError(message: string, status: number, code: string, retryAfter?: number) {
  const headers = retryAfter ? { "Retry-After": String(retryAfter) } : undefined;
  return Response.json({ error: message, code }, { status, headers });
}

export async function POST(request: Request) {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return apiError("That request was not valid JSON.", 400, "invalid_json");
  }

  const url = body.url?.trim() ?? "";
  const servings = Math.min(12, Math.max(1, Math.round(body.servings ?? 2)));
  if (!isTikTokUrl(url)) {
    return apiError("Paste a public TikTok URL that begins with https://", 400, "invalid_url");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return apiError(
      "Live analysis is not enabled in the public beta yet. Explore the finished example while setup is completed.",
      503,
      "live_not_configured",
    );
  }

  if (process.env.GENERATION_ENABLED === "false") {
    return apiError(
      "New analyses are paused, but saved recipes remain available. Please try again later.",
      503,
      "generation_paused",
      3600,
    );
  }

  const db = getRuntimeDb();
  const salt = process.env.RATE_LIMIT_SALT;
  if (!db || !salt) {
    return apiError("Live analysis is temporarily unavailable.", 503, "guardrails_unavailable", 900);
  }

  const config = getGuardrailConfig();
  const anonymousId = await anonymousRequestId(request, salt);
  if (!(await allowHourlyRequest(db, anonymousId, config.hourlyRequestLimit))) {
    return apiError("You have made a lot of requests. Please try again in an hour.", 429, "hourly_limit", 3600);
  }

  const dietary = normalizeDietary(body.dietary);
  const videoId = normalizeTikTokIdentity(url);
  const cacheKey = await buildRecipeCacheKey(videoId, servings, dietary);
  const cached = await getCachedRecipe(db, cacheKey);
  if (cached) {
    return Response.json({
      recipe: cached.recipe,
      mode: "live",
      cache: "hit",
      message: "Loaded from the community recipe cache—no new AI generation was needed.",
    });
  }

  if (!(await allowUserGeneration(db, anonymousId, config.userDailyGenerationLimit))) {
    return apiError(
      "You have reached today’s free analysis limit. Cached recipes still work; please try a new video tomorrow.",
      429,
      "daily_user_limit",
      3600,
    );
  }
  if (!(await allowGlobalGeneration(db, config.dailyGenerationLimit))) {
    return apiError(
      "Today’s community generation budget has been used. Cached recipes still work; new analyses resume tomorrow.",
      503,
      "daily_global_limit",
      3600,
    );
  }
  if (!(await acquireGenerationLock(db, cacheKey))) {
    return apiError("This video is already being analyzed. Try again in a moment.", 409, "already_processing", 20);
  }
  if (!(await reserveMonthlyBudget(db, config.monthlyBudgetMicros, config.reservationMicros))) {
    await releaseGenerationLock(db, cacheKey);
    return apiError(
      "This month’s sponsored generation budget has been used. Cached recipes remain available.",
      503,
      "monthly_budget_reached",
      3600,
    );
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  let reservationOpen = true;
  try {
    const metadata = await getTikTokMetadata(url);
    if (!metadata) {
      return apiError(
        "TikTok did not make this video’s public details available. Check that the link is public.",
        422,
        "source_unavailable",
      );
    }

    const context = [
      `TikTok URL: ${url}`,
      `Creator caption: ${metadata.title ?? "Unavailable"}`,
      `Creator: ${metadata.author_name ?? "Unknown"}`,
      `Requested servings: ${servings}`,
      `Shop location ZIP: ${body.zipCode?.trim().slice(0, 10) || "Not supplied"}`,
      `Dietary needs: ${dietary || "None supplied"}`,
    ].join("\n");

    const prompt = `Reconstruct the most plausible cookable recipe using only the supplied public TikTok caption and thumbnail. Never claim you watched frames or heard audio that were not supplied. Distinguish observations from estimates through confidence fields and sourceNote. Scale amounts for the requested servings. Recommend realistic Whole Foods search matches, but never invent current prices, stock, aisle numbers, or exact availability. Each method step must explain what to do and why it matters. Keep the output practical and compact. Return only the requested schema.\n\n${context}`;
    const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
    if (metadata.thumbnail_url) {
      content.push({ type: "input_image", image_url: metadata.thumbnail_url, detail: "high" });
    }

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        reasoning: { effort: "low" },
        safety_identifier: anonymousId,
        max_output_tokens: 6000,
        input: [{ role: "user", content }],
        text: {
          verbosity: "medium",
          format: { type: "json_schema", name: "recipe_reconstruction", strict: true, schema: recipeSchema },
        },
      }),
    });

    const raw = (await openAIResponse.json()) as Record<string, unknown>;
    if (!openAIResponse.ok) {
      const detail = raw.error && typeof raw.error === "object"
        ? (raw.error as { message?: string }).message
        : undefined;
      return apiError(detail || "The recipe analysis could not be completed.", 502, "model_error");
    }

    const outputText = extractOutputText(raw);
    if (!outputText) return apiError("The model returned no structured recipe.", 502, "empty_model_response");
    const recipe = JSON.parse(outputText) as RecipeResult;
    const usage = raw.usage && typeof raw.usage === "object"
      ? (raw.usage as { input_tokens?: number; output_tokens?: number })
      : {};
    const inputTokens = Math.max(0, usage.input_tokens ?? 0);
    const outputTokens = Math.max(0, usage.output_tokens ?? 0);
    const actualMicros = estimateModelCostMicros(inputTokens, outputTokens, config);

    await saveCachedRecipe(db, {
      cacheKey, videoId, sourceUrl: url, recipe, model, inputTokens, outputTokens,
      estimatedCostMicros: actualMicros, ttlSeconds: config.cacheTtlSeconds,
    });
    await settleMonthlyBudget(db, config.reservationMicros, actualMicros);
    reservationOpen = false;

    return Response.json({
      recipe,
      mode: "live",
      cache: "miss",
      message: "New reconstruction complete and saved for future cooks. Verify labels and local stock before buying.",
      source: { title: metadata.title, author: metadata.author_name },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return apiError("The model response was not valid recipe data.", 502, "invalid_model_response");
    }
    return apiError("The recipe analysis could not be completed.", 502, "analysis_failed");
  } finally {
    if (reservationOpen) await releaseMonthlyReservation(db, config.reservationMicros);
    await releaseGenerationLock(db, cacheKey);
  }
}

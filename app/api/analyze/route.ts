import { sampleRecipe, type RecipeResult } from "../../../lib/recipe";

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
    "title",
    "subtitle",
    "author",
    "servings",
    "prepTime",
    "cookTime",
    "confidence",
    "sourceNote",
    "ingredients",
    "steps",
    "tools",
    "tips",
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
          "name",
          "amount",
          "note",
          "confidence",
          "product",
          "packageSize",
          "buyQuantity",
          "searchTerm",
          "optional",
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
    return (
      protocol === "https:" &&
      (hostname === "tiktok.com" || hostname.endsWith(".tiktok.com"))
    );
  } catch {
    return false;
  }
}

async function getTikTokMetadata(url: string): Promise<TikTokMetadata | null> {
  try {
    const response = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      { headers: { Accept: "application/json" } },
    );
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
      if (
        part &&
        typeof part === "object" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

function scaledSample(servings: number): RecipeResult {
  return { ...sampleRecipe, servings };
}

export async function POST(request: Request) {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: "That request was not valid JSON." }, { status: 400 });
  }

  const url = body.url?.trim() ?? "";
  const servings = Math.min(12, Math.max(1, Math.round(body.servings ?? 2)));
  if (!isTikTokUrl(url)) {
    return Response.json(
      { error: "Paste a public TikTok URL that begins with https://" },
      { status: 400 },
    );
  }

  const metadata = await getTikTokMetadata(url);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json({
      recipe: scaledSample(servings),
      mode: "demo",
      message:
        "The analysis flow is ready. Add OPENAI_API_KEY to turn on live recipe reconstruction.",
      source: metadata
        ? { title: metadata.title, author: metadata.author_name }
        : null,
    });
  }

  const context = [
    `TikTok URL: ${url}`,
    `Creator caption: ${metadata?.title ?? "Unavailable"}`,
    `Creator: ${metadata?.author_name ?? "Unknown"}`,
    `Requested servings: ${servings}`,
    `Shop location ZIP: ${body.zipCode?.trim() || "Not supplied"}`,
    `Dietary needs: ${body.dietary?.trim() || "None supplied"}`,
  ].join("\n");

  const prompt = `Reconstruct the most plausible cookable recipe from the supplied TikTok evidence. Use web search only to inspect public context for the source and likely products. Never claim you watched frames or heard audio that were not supplied. Distinguish observations from estimates through the confidence fields and sourceNote. Scale amounts for the requested servings. Recommend realistic Whole Foods search matches, but do not invent current prices, stock, aisle numbers, or exact availability. Each method step must explain what to do and why it matters. Return only the requested schema.\n\n${context}`;

  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: prompt },
  ];
  if (metadata?.thumbnail_url) {
    content.push({
      type: "input_image",
      image_url: metadata.thumbnail_url,
      detail: "high",
    });
  }

  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-sol",
      reasoning: { effort: "medium" },
      input: [{ role: "user", content }],
      tools: [{ type: "web_search" }],
      text: {
        verbosity: "medium",
        format: {
          type: "json_schema",
          name: "recipe_reconstruction",
          strict: true,
          schema: recipeSchema,
        },
      },
    }),
  });

  const raw = (await openAIResponse.json()) as Record<string, unknown>;
  if (!openAIResponse.ok) {
    const detail =
      raw.error && typeof raw.error === "object"
        ? (raw.error as { message?: string }).message
        : undefined;
    return Response.json(
      { error: detail || "The recipe analysis could not be completed." },
      { status: 502 },
    );
  }

  const outputText = extractOutputText(raw);
  if (!outputText) {
    return Response.json(
      { error: "The model returned no structured recipe." },
      { status: 502 },
    );
  }

  try {
    return Response.json({
      recipe: JSON.parse(outputText) as RecipeResult,
      mode: "live",
      message:
        "Built from public TikTok evidence. Verify package labels and local stock before buying.",
      source: metadata
        ? { title: metadata.title, author: metadata.author_name }
        : null,
    });
  } catch {
    return Response.json(
      { error: "The model response was not valid recipe data." },
      { status: 502 },
    );
  }
}

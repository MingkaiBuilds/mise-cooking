# Mise impact plan

Mise should be free at the point of use: no account, no recipe paywall, and no sale of user attention or cooking behavior.

## North star

Measure successful cooking outcomes, not pageviews. The useful signals are completed shopping lists, completed methods, repeat use, confidence corrections, and recipes people choose to share.

## Safe public launch

Live analysis stays off until all four controls exist:

1. Cache a base reconstruction by normalized TikTok video ID so a popular video is analyzed once and can help many people.
2. Apply anonymous per-network and per-browser limits without building a behavioral profile.
3. Add a global daily request ceiling and a monthly spending ceiling that fail closed.
4. Require a lightweight bot challenge only after suspicious or repeated use.

The public request path returns cached recipes even after the daily generation budget is exhausted. That preserves usefulness without creating unbounded spend. The initial sponsored ceiling is $200 per UTC month, with a conservative two-cent reservation before every cache miss and a 300-generation daily ceiling.

## Cost architecture

- Use the cost-efficient multimodal model for first-pass extraction.
- Keep prompts and structured output compact.
- Save the source evidence and base recipe once; scale servings deterministically afterward.
- Escalate to a more capable model only when confidence is low and budget remains.
- Track model requests, tokens, tool calls, cache-hit rate, and cost per useful recipe.

## Sustainable funding ladder

1. Begin with a small founder-sponsored monthly cap.
2. Add optional, quiet community support with transparent monthly costs and no feature gating.
3. Pursue aligned grants or sponsors that cannot influence recipe rankings or product recommendations.
4. Consider clearly disclosed affiliate links only if they improve the shopping handoff and never change what Mise recommends.

## Product commitments

- No login required for normal use.
- No dark patterns, engagement loops, or data resale.
- Label inferences and let cooks correct them.
- Credit and link back to the original creator.
- Treat allergy and food-safety guidance as high-stakes information that needs conservative language and visible caveats.

## Next implementation milestone

The D1-backed cache and quota ledger, privacy-preserving anonymous limiter, global kill switch, and public status endpoint are implemented. The remaining launch gate is adding the API key and running live load and abuse tests.

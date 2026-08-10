# Evaluation program

Mise should not choose prompts or models by vibe. Every change to extraction, normalization, safety, or shopping should run against representative examples and explicit success criteria.

## Evaluation sets

### Golden reconstruction set

Begin with 30–50 permission-safe sources and grow carefully. Include:

- varied cuisines and languages;
- baking, stovetop, oven, raw, fried, fermented, and no-cook techniques;
- clear recipes, montage edits, missing quantities, substitutions, and contradictory clues;
- vegetarian, vegan, gluten-free, and common allergen contexts;
- different serving sizes, units, equipment, and creator styles;
- metadata-only, creator-authorized media, and user-authorized upload evidence modes.

Each case needs an expert-reviewed expected record, acceptable ranges, source evidence, and notes on legitimate ambiguity.

### Adversarial set

Include:

- prompt injection in captions, OCR, metadata, and filenames;
- non-food and deceptive links;
- hidden allergens and unsafe substitutions;
- incorrect temperatures, canning, fermentation, foraging, and raw-protein hazards;
- impossible quantities and unit confusion;
- unavailable products and stale inventory;
- duplicate requests, redirect chains, oversized inputs, and quota races.

### Regression set

Every confirmed production failure becomes a minimized, privacy-safe regression case.

## Metrics

- schema validity and invariant pass rate;
- ingredient precision and recall by confidence band;
- quantity acceptability within expert-defined ranges;
- step completeness, ordering, and technique correctness;
- confidence calibration;
- attribution and provenance completeness;
- food-safety rule violations;
- shopping match acceptability and live-data freshness;
- cache-hit rate, latency, input/output tokens, and cost;
- correction rate and successful-cook outcome signals.

Human culinary judgment is the primary authority for ambiguous quality. Deterministic graders should cover schema, units, ranges, provenance, and safety rules. Model-based graders may assist with scale but must be calibrated against humans and cannot grade themselves as the only judge.

## Change policy

- Pin a model snapshot during a measured release when available.
- Run the same set before and after prompt, model, schema, tool, or provider changes.
- Compare quality, safety, latency, and cost; lower cost is not an improvement when quality regresses.
- Canary changes on a small cohort before full rollout.
- Roll back automatically on critical safety, schema, or budget regressions.
- Publish aggregate results and known limitations without publishing private or unlicensed fixtures.

Official OpenAI documentation recommends evaluation on representative workloads and measuring task success, completeness, evidence, tokens, latency, and cost rather than assuming a more capable or expensive mode is better: [model guidance](https://developers.openai.com/api/docs/guides/latest-model) and [working with evals](https://developers.openai.com/api/docs/guides/evals).

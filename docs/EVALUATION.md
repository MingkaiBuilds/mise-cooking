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

The repository now contains a versioned 30-case **seed** in
[`evals/golden/cases.v1.json`](../evals/golden/cases.v1.json). Every caption and
visual note is Mise-authored synthetic evidence released as CC0. It contains no
downloaded video, creator transcript, private source, or claim of media access.

Seed is not synonymous with golden. The current cases are all `draft`, and the
validator reports the approved count explicitly. A case becomes `approved` only
after its ingredients, technique, ambiguity allowances, and any safety rule have
received the appropriate human review. The pull-request and Git history provide
the review trail.

The set deliberately spans 18 source languages, more than 30 cuisine tags, four
evidence-quality modes, dietary constraints, official food-safety assertions,
contradictory clues, and prompt injection. The versioned contract is
[`evals/golden-set.v1.schema.json`](../evals/golden-set.v1.schema.json).

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

## Local, provider-independent harness

Validate fixture structure, permission provenance, and minimum coverage without
making a model request:

```bash
npm run eval:validate
```

Score a complete candidate run:

```bash
node scripts/eval-golden.mjs --results path/to/candidate-run.json
```

During development, a deliberately partial run can be scored with
`--allow-partial`. Its input contract is
[`evals/candidate-run.v1.schema.json`](../evals/candidate-run.v1.schema.json).
The scorer checks the application recipe shape, requested servings, required and
forbidden ingredients, evidence-grounded concepts, confidence ceilings, official
safety assertions, and invented retailer prices, inventory, aisles, or delivery
claims. Schema, safety, and retailer-honesty gates are fail-closed at 100%; required
ingredient coverage must be at least 95%.

This harness is intentionally independent of any hosted evaluation product or
model provider. Model-based and human graders can be added around the same JSON
contracts without making the durable test corpus dependent on them.

### Promotion workflow

1. Add only synthetic, public-domain, or explicitly authorized evidence and record
   its rights status.
2. Run `npm run eval:validate` and the relevant candidate system.
3. Have a culinary reviewer inspect required ingredients, technique concepts,
   cultural specificity, and legitimate ambiguity.
4. Have an appropriately qualified reviewer inspect safety-sensitive or allergy
   assertions against the cited authority.
5. Change the review status only in a focused pull request. Do not weaken an
   assertion merely to make a model pass.

## Change policy

- Pin a model snapshot during a measured release when available.
- Run the same set before and after prompt, model, schema, tool, or provider changes.
- Compare quality, safety, latency, and cost; lower cost is not an improvement when quality regresses.
- Canary changes on a small cohort before full rollout.
- Roll back automatically on critical safety, schema, or budget regressions.
- Publish aggregate results and known limitations without publishing private or unlicensed fixtures.

Official OpenAI documentation recommends eval-driven development on
representative typical, edge, and adversarial inputs, with automated scoring
calibrated by human judgment: [evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
and [model guidance](https://developers.openai.com/api/docs/guides/latest-model).
The food-safety assertions currently use
[FDA Safe Food Handling](https://www.fda.gov/food/buy-store-serve-safe-food/safe-food-handling)
as their declared authority.

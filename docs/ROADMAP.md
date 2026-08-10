# Roadmap: from food media to a successful meal

Mise exists to make cooking knowledge travel. The long-term product is a free, trustworthy translation layer between food people encounter online and the practical knowledge required to cook it.

The roadmap is ordered by trust, not spectacle. A phase does not graduate because it looks impressive; it graduates when its exit criteria are measured and met.

## North-star journey

`source → evidence → recipe → local basket → guided cook → correction → better shared knowledge`

## Phase 0 — Trust foundation

**Goal:** prove that a bounded pilot can reconstruct recipes safely, accurately, privately, and affordably.

Build:

- a versioned recipe record with field-level confidence and provenance;
- a representative golden evaluation set covering cuisines, techniques, diets, video quality, and ambiguity;
- deterministic validation for schema, quantities, units, allergens, and food-safety rules;
- continuous integration, dependency updates, static security analysis, and a public threat model;
- a creator correction, attribution, opt-out, and takedown process;
- spending reconciliation against provider billing, in addition to the existing one-time budget ledger;
- permission-aware ingestion that never pretends metadata is full video evidence.

Exit criteria:

- 100% schema-valid published records;
- at least 95% precision for ingredients labeled high-confidence on the golden set;
- at least 90% acceptable product matches when a live retailer provider is used;
- zero known critical food-safety failures in the adversarial safety suite;
- zero known critical security findings;
- p95 cache-miss cost within the configured two-cent reservation;
- every published recipe has a canonical source, creator attribution when available, and a correction path.

## Phase 1 — Exceptionally good reconstruction

**Goal:** produce a recipe a careful home cook can actually trust.

Build:

- support for public metadata, creator-authorized platform access, and user-authorized uploads as distinct evidence modes;
- multimodal extraction of ingredients, actions, equipment, timing, temperature, and visual doneness cues where access is authorized;
- calibrated confidence at the field level, not just one score for the whole recipe;
- explicit conflict handling when caption, speech, and visible action disagree;
- deterministic serving scaling and unit conversion;
- multilingual output without flattening culturally specific ingredient names or techniques;
- human review tools for disputed, popular, and safety-sensitive recipes.

Exit criteria:

- human evaluators prefer Mise's reconstruction to a caption-only baseline on completeness and cookability;
- confidence is calibrated: high-confidence claims are materially more accurate than medium- or low-confidence claims;
- no raw source media is retained beyond its documented processing window;
- corrections are versioned and auditable.

## Phase 2 — From recipe to basket

**Goal:** help someone obtain the right amount of the right ingredients locally.

Build:

- pantry-aware shopping lists;
- live retailer integrations for store, availability, price, package size, and cart handoff;
- substitution ranking by culinary function, dietary needs, price, and waste;
- multi-recipe planning that reuses ingredients across meals;
- public-domain nutrition references with source and uncertainty;
- accessibility and low-budget modes.

Exit criteria:

- live claims come only from live providers and include retrieval time;
- no product is ranked because a sponsor paid for placement;
- allergy filters are treated as warnings and verification aids, never guarantees;
- users can distinguish “recipe amount,” “package to buy,” and “pantry remainder.”

## Phase 3 — Adaptive cook mode

**Goal:** stay useful after the cook's hands get messy.

Build:

- hands-free navigation, coordinated timers, and resumable offline instructions;
- visual and descriptive checkpoints for texture, color, consistency, and doneness;
- safe adaptation when equipment, ingredient, serving count, altitude, or timing changes;
- troubleshooting for common failure states;
- explanation depth that adapts to the cook's experience without hiding safety information.

Exit criteria:

- cook-mode changes pass the same golden recipes end to end;
- authoritative safety rules cannot be overridden by source content or model output;
- camera and microphone use is explicit, temporary, and optional;
- a cook can export or delete any device-local history.

## Phase 4 — Public knowledge API

**Goal:** let other public-interest tools build on verified cooking knowledge without recreating the extraction cost.

Build:

- a stable, versioned, read-first API for published recipe records, ingredients, substitutions, provenance, and corrections;
- ETags, caching, pagination, explicit licenses, deprecation windows, and machine-readable changelogs;
- moderated write endpoints for corrections and creator claims;
- dataset snapshots containing only records cleared for their stated data and text licenses;
- reference clients and interoperability mappings.

Exit criteria:

- API consumers can reproduce every displayed fact's source and confidence trail;
- breaking changes require a new major version and a migration guide;
- cached public knowledge remains broadly accessible while compute-heavy extraction is separately protected;
- data exports pass privacy, rights, and safety review.

## Phase 5 — Durable public stewardship

**Goal:** make Mise outlive any one maintainer, sponsor, model provider, or retailer.

Build:

- a fiscal sponsor or nonprofit home when funding and liability justify it;
- a small steward group spanning home cooks, culinary expertise, accessibility, privacy, security, creator rights, and food safety;
- transparent budgets, incidents, model changes, evaluation results, and conflicts of interest;
- provider-independent contracts and export formats;
- a succession and archive plan.

## What Mise will not become

- an engagement feed;
- a private archive of downloaded creator videos;
- a behavioral advertising dataset;
- a nutrition or allergy authority that overstates certainty;
- a paid-placement ranking engine;
- an unlimited free-compute endpoint that can exhaust the public service.

## Immediate work queue

1. Save the project API key securely and keep generation disabled.
2. Assemble 30–50 permission-safe golden cases with expert expected outputs.
3. Implement the versioned recipe record and deterministic validators.
4. Run extraction offline against the golden set and publish aggregate eval results.
5. Red-team source injection, unsafe cooking advice, URL handling, budget bypass, and denial-of-wallet attacks.
6. Enable a tiny canary cohort, then expand only when the exit criteria hold.

# Threat model

This document names the protections Mise needs before expanding beyond its current metadata-only pilot. It is intentionally conservative because failures can cost money, expose data, misattribute creators, or cause physical harm in a kitchen.

## Protected assets

- API keys, salts, deployment credentials, and retailer credentials;
- the one-time public-interest budget;
- recipe integrity, provenance, and correction history;
- creator attribution and rights requests;
- community contribution identity;
- service availability;
- user safety and trust.

## Trust boundaries

Treat all of the following as untrusted:

- submitted URLs and request headers;
- captions, transcripts, OCR, comments, filenames, and embedded metadata;
- model output, even when it matches a schema;
- retailer results and stale availability claims;
- community corrections until moderated;
- browser state and client-calculated quantities.

## Primary threats and controls

### URL abuse and SSRF

- Parse URLs with a real URL parser.
- Allowlist HTTPS hosts per connector; do not turn the extraction route into a generic fetch proxy.
- Resolve redirects within the same connector policy.
- Reject private, loopback, link-local, metadata-service, and non-HTTP destinations.
- Cap redirects, response size, media duration, content type, and processing time.
- Fetch through isolated connectors without ambient cloud credentials.

### Prompt and source injection

- Delimit source material as untrusted evidence, never instructions.
- Do not expose tools or secrets to the reconstruction model.
- Require structured output and validate types, ranges, counts, and invariants afterward.
- Run deterministic safety and rights checks outside the model.
- Maintain adversarial fixtures containing instructions hidden in captions, OCR, filenames, and metadata.

### Denial of wallet and service

- Preserve atomic budget reservation, global and anonymous quotas, shared caching, and duplicate locks.
- Add payload limits, concurrency limits, idempotency, timeouts, and a provider-level spend backstop.
- Reconcile the internal ledger with provider billing and pause on unexplained variance.
- Introduce a privacy-preserving bot challenge only after suspicious behavior.
- Keep cached reads available when generation is paused.

### Secret and supply-chain compromise

- Keep secrets only in managed runtime storage and untracked local environment files.
- Use least-privilege project keys and rotate after exposure.
- Run CI, dependency updates, lockfile review, secret scanning, and CodeQL.
- Restrict workflow permissions and review third-party Actions before use.
- Maintain a security reporting channel and incident playbook.

### Database and API integrity

- Use bound parameters and one statement per prepared query.
- Review and retain migrations; back up before destructive changes.
- Separate public reads, moderated writes, and administrative operations.
- Require authorization server-side for every write; never trust a hidden UI control.
- Use stable IDs, revision history, status transitions, and append-only audit events for disputes and safety actions.

### Food safety, allergies, and health claims

- Maintain authoritative deterministic rules for minimum temperatures, cooling, reheating, and high-risk ingredients.
- Safety rules override source content and generated output.
- Never infer that a packaged product is allergen-safe from its name; require label verification.
- Distinguish preferences from medically necessary restrictions.
- Do not provide diagnosis or individualized medical nutrition treatment.
- Escalate conflicting, ambiguous, infant, pregnancy, preservation, fermentation, foraging, canning, and severe-allergy content for special handling.

Reference baseline: [FDA safe food handling](https://www.fda.gov/food/buy-store-serve-safe-food/safe-food-handling).

### Creator rights and misrepresentation

- Attribute and link; do not rehost source media by default.
- Record evidence mode and never claim access the system did not have.
- Provide claim, correction, dispute, opt-out, and takedown paths.
- Mark withdrawn and disputed records promptly.
- Prevent commercial or community forks from impersonating the official service through a clear trademark policy.

### Privacy and sensor access

- Keep ordinary use account-free.
- Store no raw IP address in the application database.
- Make camera and microphone access explicit, optional, scoped, and visibly active.
- Process sensor data ephemerally by default; never use it for advertising or unrelated training.
- Complete a privacy impact assessment before uploads, accounts, or cook-mode sensors launch.

## Incident priorities

1. Physical-safety or severe-allergen risk
2. Active secret exposure or budget bypass
3. Unauthorized data access
4. Creator-rights or impersonation issue
5. Material recipe-integrity failure
6. Availability or performance degradation

For the first four categories, generation should be pausable independently of cached reads.

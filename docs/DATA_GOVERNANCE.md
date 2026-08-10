# Data governance for the Mise commons

Mise may eventually hold a large and valuable cooking dataset. That is a responsibility, not an asset to maximize indiscriminately.

The governing rule is: **store the smallest lawful, useful, auditable representation of cooking knowledge—not a copy of the internet and not a profile of the cook.**

## Data classes

### 1. Source references

Examples: canonical URL, platform, public content ID, creator display name and profile URL, retrieval time, and content availability status.

- Keep attribution and provenance.
- Do not rehost the original media.
- Retain only the minimum excerpts needed to explain evidence, subject to rights review.
- Mark records when the source disappears, becomes private, or is disputed.

### 2. Derived recipe facts

Examples: ingredient identity, quantity, unit, action sequence, temperature, timing, equipment, substitution function, and observed visual cues.

- Store field-level confidence and evidence references.
- Separate observation, creator statement, community correction, and model inference.
- Preserve culturally specific names alongside normalized identifiers.
- Never convert an uncertain inference into an unlabeled fact.

### 3. Mise-authored expression

Examples: rewritten instructions, explanations of why a technique works, troubleshooting, and accessibility text.

- Generate independently rather than copying expressive creator narration.
- Version text separately from factual fields.
- Attach the applicable text license to every public record.

### 4. Community contributions

Examples: corrections, creator confirmations, substitution outcomes, and safety reports.

- Collect only what the contributor intentionally submits.
- Record moderation status and revision history.
- Obtain clear contribution terms before accepting text into public exports.
- Support correction, withdrawal, dispute, and appeal.

### 5. Operational data

Examples: pseudonymous quota buckets, request counts, model usage, costs, cache hits, errors, and coarse performance metrics.

- Do not store raw IP addresses in the application database.
- Do not use operational data for advertising or cross-site tracking.
- Use short retention windows and aggregate before publication.
- Keep optional contributor identity separate from anonymous cooking use.

### 6. Retailer catalog data

Examples: provider product ID, package size, store or service-area scope,
availability state, price, retrieval time, and provider display requirements.

- Preserve provider, scope, timestamp, and verification state with every claim.
- Expire price and availability quickly; stale data becomes unverified.
- Do not retain retailer credentials, carts, order history, or personalized prices.
- Follow the [retailer integration policy](./RETAILER_INTEGRATIONS.md).

## Data Mise should not collect by default

- downloaded copies of public videos or audio;
- raw camera or microphone recordings from cook mode;
- precise location when a postal code or coarse region is enough;
- grocery purchase history;
- health diagnoses;
- contact lists, advertising identifiers, or third-party tracking profiles;
- private social posts or content behind access controls;
- source text unrelated to the cooking task.

Authorized uploads should be processed ephemerally and deleted automatically after the documented window. Creator-authorized platform access and user-authorized uploads must be distinguishable in the record.

## Creator rights

Every published record should provide:

- clear creator attribution and a canonical source link when available;
- a way for a creator to claim the source;
- a correction and context channel;
- opt-out and takedown paths;
- a visible disputed or withdrawn state;
- no implication that the creator endorsed Mise or the reconstruction.

Mise should not rely on the fact that bare ingredient lists and simple procedures may be uncopyrightable in the United States. Expressive explanations, photographs, audiovisual works, and compilations may be protected. Rights vary by jurisdiction. The dataset needs counsel and a documented rights review before bulk release.

Reference: [U.S. Copyright Office Circular 33](https://www.copyright.gov/circs/circ33.pdf).

## Licensing policy

The software is AGPL-3.0. The dataset must not inherit a blanket license by accident.

Before public exports, each record needs machine-readable licensing for:

- factual fields and metadata;
- Mise-authored explanatory text;
- community-contributed text;
- third-party references or assets.

CC0 may be appropriate for metadata and factual fields Mise is legally able to dedicate. CC BY-SA may be appropriate for qualifying Mise-authored or contributed text. Records with unresolved rights must be excluded from public snapshots. This is a policy direction, not a completed legal determination.

Reference: [Creative Commons guidance on data](https://wiki.creativecommons.org/wiki/data).

## Privacy by design

- Define a purpose before collecting a field.
- Default to no account for normal use.
- Minimize, pseudonymize, encrypt, and separate data by purpose.
- Publish retention periods and deletion behavior.
- Give contributors access to and control over their submissions.
- Complete a privacy impact assessment before accounts, uploads, cook-mode sensors, or public write APIs launch.

These principles reflect data minimization, storage limitation, integrity, and privacy by design described by the [European Commission's GDPR guidance](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en).

## Release gates for a public dataset

No bulk dataset release until:

1. the schema carries provenance, confidence, license, status, and correction history;
2. creator claim, dispute, opt-out, and takedown workflows work;
3. personal and operational data are excluded;
4. rights categories have been reviewed by qualified counsel;
5. a sample export passes privacy, safety, and reconstruction audits;
6. the steward publishes the intended license and changelog;
7. withdrawn records can be removed from future snapshots without rewriting historical facts about prior releases.

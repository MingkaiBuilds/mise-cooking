# Public API charter

Mise should eventually expose verified cooking knowledge as public infrastructure. The API is not an unmetered proxy for paid model generation.

## Separation of services

### Knowledge API

Published, cached records are read-mostly public knowledge. They should be inexpensive to serve, cacheable, versioned, and broadly accessible.

Planned resources:

- `GET /api/v1/recipes/{recipe_id}`
- `GET /api/v1/recipes?source_url=...`
- `GET /api/v1/ingredients/{ingredient_id}`
- `GET /api/v1/recipes/{recipe_id}/corrections`
- `GET /api/v1/health`

### Extraction API

Turning a new source into a record consumes money, creates rights and safety risk, and attracts abuse. It should require stricter quotas, deduplication, an idempotency key, permission-aware evidence modes, and asynchronous job semantics before opening to third parties.

### Contribution API

Creator claims, corrections, disputes, and safety reports change public records. Writes should require verified identity appropriate to the action, moderation, CSRF protection for browser clients, an audit trail, and abuse controls. Normal recipe reading and cooking should remain account-free.

## Response contract

Every published recipe response should identify:

- schema and API version;
- stable recipe and revision IDs;
- canonical source and creator attribution;
- evidence mode and retrieval time;
- field-level provenance and confidence;
- safety notes and review status;
- data and text licenses;
- published, disputed, withdrawn, or draft status;
- correction and supersession links;
- timestamps and machine-readable changelog references.

## Reliability and compatibility

- Use semantic major versions in URLs for breaking changes.
- Keep additive fields backward-compatible within a major version.
- Publish deprecation dates and migration guides.
- Support ETags, conditional requests, pagination, and explicit cache headers.
- Return stable error codes and request IDs without leaking secrets or personal data.
- Publish an OpenAPI description only after the record schema and rights model survive pilot use.
- Map to existing standards such as `schema.org/Recipe` where semantics align, without discarding Mise provenance.

## Access and fairness

- No paid tier may improve the truthfulness or safety of a recipe.
- High-volume consumers may need keys, quotas, caching, or cost recovery.
- Public-interest research, accessibility, and community food programs should have a documented access path.
- Retail sponsors cannot purchase ranking preference.
- API clients must preserve source attribution, uncertainty, safety notices, record status, and applicable licenses.

## API launch gates

1. Versioned recipe record is running in production.
2. Golden and adversarial eval suites are public in aggregate.
3. Rights and takedown workflows are operational.
4. Threat model covers each endpoint and trust boundary.
5. Rate, concurrency, payload, timeout, and cost limits fail closed.
6. Cached reads remain available when extraction is paused.
7. Terms describe attribution, privacy, safety, acceptable use, and uptime without pretending the service is infallible.

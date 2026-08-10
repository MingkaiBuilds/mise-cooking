# Mise

Mise turns public food TikToks into practical recipes: a Whole Foods shopping list, confidence labels for inferred details, and step-by-step cooking instructions that explain why each step matters.

**Live site:** [mise-cooking.mingkai-builds.chatgpt.site](https://mise-cooking.mingkai-builds.chatgpt.site)

Mise is a free public-good project. Normal use requires no account, has no recipe paywall, and does not sell attention or cooking behavior.

## What it does

1. Accepts a public TikTok video URL and serving preferences.
2. Uses the video's public caption and thumbnail as evidence.
3. Produces a structured, uncertainty-aware recipe.
4. Suggests realistic Whole Foods search matches without claiming live stock or prices.
5. Caches the result so future cooks can reuse it without another model request.

Mise does not claim to see or hear video content that was not supplied to the model. Product availability, dietary suitability, allergens, and food safety should always be independently verified.

## Public pilot safeguards

The founding pilot has a one-time $200 generation pool with no automatic reset. The server also applies:

- a 300-generation global daily ceiling;
- per-anonymous-visitor daily and hourly limits;
- atomic budget reservations before model requests;
- duplicate-generation locks;
- a 90-day shared recipe cache; and
- a global generation kill switch.

Raw IP addresses are not stored. The public status endpoint is available at [`/api/status`](https://mise-cooking.mingkai-builds.chatgpt.site/api/status).

See [IMPACT.md](./IMPACT.md) for the project's product and funding commitments.

## Building the public commons

The next stages are documented in public before the dataset grows:

- [Roadmap](./docs/ROADMAP.md)
- [Data governance](./docs/DATA_GOVERNANCE.md)
- [Threat model](./docs/THREAT_MODEL.md)
- [Evaluation program](./docs/EVALUATION.md)
- [Public API charter](./docs/API_CHARTER.md)
- [Prospective recipe record contract](./spec/recipe-record.v1.schema.json)
- [Mise name and branding policy](./TRADEMARKS.md)

These documents deliberately separate cached public knowledge from compute-heavy extraction, and factual recipe data from source media, personal data, and expressive creator content.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm test
npm run db:generate
```

Copy `.env.example` to an untracked `.env.local` for local configuration. The complete example documents every runtime control; the minimum values to review are:

```env
OPENAI_API_KEY=your_project_key
OPENAI_MODEL=gpt-5.6-luna
GENERATION_ENABLED=false
RATE_LIMIT_SALT=use-a-long-random-secret
PILOT_BUDGET_USD=200
BUDGET_PERIOD=founding-pilot-2026
```

Environment files are ignored by Git. Never commit keys or production salts.

## Architecture

- Next-compatible React application built with vinext
- Cloudflare Worker runtime
- Cloudflare D1 for cache, quotas, generation locks, and the budget ledger
- Drizzle schema and checked-in SQL migrations
- OpenAI Responses API for structured recipe reconstruction

The logical D1 binding is declared in `.openai/hosting.json`; production bindings and secrets are managed by the hosting platform.

## Contributing

Bug reports, recipe-quality improvements, accessibility work, and cost-saving ideas are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request. Please report security issues according to [SECURITY.md](./SECURITY.md). Every push and pull request runs lint, build tests, and CodeQL analysis; Dependabot tracks application and workflow dependencies.

## License

Mise is licensed under the [GNU Affero General Public License v3.0](./LICENSE). If you operate a modified network version, the license requires that its corresponding source be offered to its users.

TikTok and Whole Foods Market are trademarks of their respective owners. Mise is an independent project and is not endorsed by or affiliated with either company.

# Contributing to Mise

Thanks for helping make internet cooking knowledge more useful.

## Good first contributions

- Improve accessibility, mobile behavior, or plain-language explanations.
- Add tests for recipe validation and budget safeguards.
- Reduce model cost or improve cache reuse without weakening honesty.
- Improve uncertainty, allergen, and food-safety language.
- Report reproducible cases where a public TikTok cannot be reconstructed well.

## Development workflow

1. Fork the repository and create a focused branch.
2. Install dependencies with `npm install`.
3. Make the smallest coherent change that solves the problem.
4. Run `npm run lint` and `npm test`.
5. Open a pull request explaining the user impact, test coverage, and any cost or privacy implications.

Recipe behavior changes should add or update a privacy-safe fixture and explain their effect on the metrics in [docs/EVALUATION.md](./docs/EVALUATION.md). Security-sensitive work should be checked against [docs/THREAT_MODEL.md](./docs/THREAT_MODEL.md).

Evaluation fixtures must be Mise-authored synthetic evidence, public-domain
material, or material with documented permission. Do not paste creator captions,
transcripts, screenshots, or downloaded media into the repository merely because
they are publicly viewable. Validate fixture coverage with `npm run eval:validate`.
Draft fixtures are useful tests but must not be described as expert-approved.

Candidate systems can write the versioned
[`evals/candidate-run.v1.schema.json`](./evals/candidate-run.v1.schema.json) format
and run `node scripts/eval-golden.mjs --results path/to/run.json`. A partial local
run requires the explicit `--allow-partial` flag; release comparisons should use
all cases.

Never include API keys, `.env` files, production salts, personal data, copyrighted video downloads, or scraped private content.

## Product principles

Contributions should preserve these commitments:

- no account required for normal use;
- no recipe paywall or sale of behavioral data;
- uncertainty is visible rather than hidden;
- creators are credited and linked;
- product matches do not invent stock, prices, or endorsements; and
- spending and abuse controls fail closed.

Be kind, specific, and constructive. Harassment, discrimination, or publishing another person's private information is not acceptable in project spaces.

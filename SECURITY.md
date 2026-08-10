# Security policy

## Reporting a vulnerability

Please do not disclose exploitable vulnerabilities in a public issue.

Use GitHub's **Report a vulnerability** option in the repository's Security tab. Include the affected route or component, reproduction steps, likely impact, and any suggested mitigation. Avoid accessing data that is not yours, generating unnecessary paid traffic, or testing against production in a way that disrupts other visitors.

## Sensitive values

OpenAI keys, rate-limit salts, and hosted environment values must remain outside Git. If a credential is exposed, revoke and replace it immediately; removing it from the latest commit is not sufficient because Git retains history.

## Scope priorities

Reports involving unbounded paid usage, budget bypasses, secret exposure, injection into model instructions, D1 data access, denial of service, or misleading food-safety output are especially important.

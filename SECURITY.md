# Security Policy

## Reporting a Vulnerability

Please do not open public issues for suspected security vulnerabilities.

Preferred: use GitHub Security Advisories / Private Vulnerability Reporting for this repository.

- Open a report: `https://github.com/tytsxai/Auto-Codex/security/advisories/new`
- Include: affected version, reproduction steps, impact, and any logs (redact secrets)

If you cannot use GitHub advisories, open a normal issue with **only non-sensitive details** and we will coordinate a private channel.

## Supported Versions

This project is a desktop app + local services. Only the latest released version is supported.

## Security Baseline (Production)

- Never commit secrets: keep API keys in `.env` files (gitignored) or your OS secret manager.
- Use least-privilege keys:
  - OpenAI: restrict key usage to required projects/environments.
  - Linear/GitHub: minimize scopes; rotate keys on staff changes.
- Keep dependencies up to date (see `.github/dependabot.yml`).
- Prefer pinned Docker image tags for production deployments; avoid `:latest`.

## Operational Guidance

See `guides/OPERATIONS.md` for backup/restore, log collection, and incident response basics.

# Security policy

## Supported versions

GitSift is a young project. Security fixes are applied to the `main` branch and the latest release.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability. Use GitHub's private vulnerability reporting
on the repository (Security → Report a vulnerability). If that is unavailable, contact a maintainer
privately through their GitHub profile.

Include:

- A description of the issue and its impact.
- Steps to reproduce, or a proof of concept.
- The version or commit you tested.
- Any suggested mitigation.

You can expect an acknowledgement within a few days. Please give us reasonable time to ship a fix
before public disclosure.

## Scope

The most relevant areas:

- `POST /api/cron/ingest` authentication.
- SQL injection or unsafe query construction.
- SSRF through repository metadata or homepage URLs.
- Stored XSS through README or repository descriptions.
- Leakage of `GITHUB_TOKEN`, `LLM_API_KEY`, `OPENAI_API_KEY` or `CRON_SECRET`.

The seed data and public GitHub metadata are untrusted input. Treat them accordingly.

## Operational notes

- Set a long random `CRON_SECRET` before exposing the app.
- Keep `.env` out of version control.
- Run the app behind HTTPS.
- The public API is read-only; the cron endpoint is the only mutating route.
- If you self-host, back up the SQLite file and its WAL/SHM companions together.

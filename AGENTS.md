# Repository Guidelines

## Project Structure & Module Organization
- `app/` hosts the FastAPI backend; core logic sits in `routes/`, `services/`, `models/`, with ADK adapters in `integration/`.
- `agents/` stores ADK agent definitions, prompt templates, and orchestration helpers.
- `frontend/` is a Next.js TypeScript app; UI components live in `frontend/src/components`, hooks in `frontend/src/lib`, and assets in `frontend/public`.
- `tests/` holds suites (`unit/`, `integration/`, `performance/`, `security/`) plus fixtures. Frontend specs live in `frontend/tests`, with Playwright config at `tests/playwright.config.ts`.
- `docs/`, `reports/`, and `configs/` track architecture, ops runbooks, and deployment baselines; automation scripts live under `scripts/`.

## Build, Test, and Development Commands
- `make setup-local-env` installs Python dependencies via `uv sync` and bootstraps the frontend.
- `make dev` (or `make dev-backend` / `make dev-frontend`) runs FastAPI on `localhost:8000` and Next.js on `localhost:3000`.
- `make test`, `make test-unit`, and `make test-integration` execute the backend pytest suites.
- `make lint` runs codespell, Ruff lint/format, and mypy; follow with `make typecheck` for a dedicated static pass.
- Frontend checks: `npm --prefix frontend run lint`, `npm --prefix frontend run test:coverage`, and `npm --prefix frontend run test:e2e`.

## Coding Style & Naming Conventions
- Python code uses 4-space indentation, Ruff formatting, and mypy typing; keep modules snake_case, classes PascalCase, and constants SCREAMING_SNAKE_CASE.
- React/TypeScript follows ESLint with Next.js defaults; store components in PascalCase files, prefix hooks with `use`, and keep shared utilities in `frontend/src/lib`.
- Tailwind utility classes drive styling—compose with `cn` helpers and extend design tokens under `frontend/config` only when necessary.

## Testing Guidelines
- Target backend coverage in `tests/unit` before layering integration suites; share reusable fixtures under `tests/utils`.
- Capture UI behaviour with Jest specs in `frontend/tests` and pair them with Playwright flows (`npm --prefix frontend run test:e2e`) whenever state changes affect flows.
- Use `make test-coverage` to generate backend reports; HTML artifacts land in `.coverage_archive/reports/` for reviewers.

## Commit & Pull Request Guidelines
- Follow the Conventional Commit style in the log (`docs:`, `fix:`, `chore:`, etc.), adding scopes when helpful (e.g., `fix(auth):`).
- Pull requests should summarize intent, link issues, list the checks you ran (`make test`, `npm --prefix frontend run lint`, etc.), and include screenshots for UI updates or updated agent diagrams.

## Security & Configuration Tips
- Keep secrets in `.env.local`; sample configs live in `config/` and `configs/`.
- When adjusting agent behaviour, update ADK profiles in `agents/` and capture the operational impact in `docs/`.

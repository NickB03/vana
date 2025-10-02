# Repository Guidelines

## Project Structure & Module Organization
- `app/` FastAPI backend with ADK orchestration, auth, routes, and monitoring utilities.
- `agents/` reusable agent personas and coordination hooks imported by the backend.
- `frontend/` Next.js + TypeScript client under `frontend/src`, plus Storybook, docs, and lint configs.
- `tests/` shared pytest, Playwright, and JS suites (unit, integration, security, performance).
- `scripts/` automation for coverage and baselines; `docs/` reference diagrams and runbooks.

## Build, Test, and Development Commands
- Bootstrap with `make setup-local-env`; it installs Python deps via `uv` and frontend packages.
- `make dev` or `npm run dev` starts FastAPI (`localhost:8000`) and Next.js (`localhost:3000`) with hot reload.
- Quality gates: `make test`, `make lint`, `make typecheck`. Run all before pushing.
- Focused checks: `uv run pytest tests/unit -v`, `uv run pytest tests/integration -v`, `npm --prefix frontend run test:coverage`, `npm --prefix frontend run lint`.
- For docker parity use `make docker-up` / `make docker-down`.

## Coding Style & Naming Conventions
- Python uses Ruff formatting (line length 88, 4-space indents); snake_case modules/functions, PascalCase classes, typed FastAPI signatures.
- Run `uv run ruff check .`, `uv run ruff format .`, and `uv run mypy .` to satisfy linting and type gates.
- TypeScript components live in PascalCase under `frontend/src`; hooks follow `useThing` camelCase. ESLint + Tailwind conventions are enforced via `npm --prefix frontend run lint` and `npm --prefix frontend run typecheck`.

## Testing Guidelines
- Pytest configuration enforces 85% coverage (see `pyproject.toml`); use markers like `@pytest.mark.integration` and share fixtures via `tests/utils`.
- End-to-end flows live in `tests/e2e`; export `PLAYWRIGHT=True` then run `npx playwright test --config tests/playwright.config.ts`.
- Frontend Jest suites reside in `frontend/tests`; keep filenames descriptive (`component.behavior.test.tsx`) and commit updated snapshots.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, etc.) as in current history.
- PRs should describe scope, list verification commands, link issues, and attach UI screenshots or API samples when behaviour changes.
- Rebase before opening, confirm CI is green, and flag breaking changes explicitly.

## Security & Configuration Tips
- Load secrets from `.env.local`; `pydantic-settings` wires them into the backend. Never commit real credentials.
- Store long-lived keys in secret managers or redacted templates in `config/`, and update docs when policies change.

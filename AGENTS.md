# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the React app: `src/pages/`, `src/components/`, `src/hooks/`, `src/utils/`, and `src/integrations/`.
- `supabase/` holds Edge Functions (`supabase/functions/`) and database migrations (`supabase/migrations/`); shared helpers live in `supabase/functions/_shared/`.
- `public/` is for static assets; `docs/` for documentation; `tests/` for Playwright e2e specs.
- Unit tests are colocated in `src/**/__tests__/` and follow feature folders.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite dev server at `http://localhost:8080`.
- `npm run build`, `npm run build:staging`, and `npm run preview` handle production/staging builds and previews.
- `npm run lint` runs ESLint across the repo.
- `npm run test`, `npm run test:coverage`, and `npm run test:e2e` run Vitest and Playwright suites.
- Use `npm` only; avoid Yarn, Bun, or pnpm to prevent lockfile conflicts.

## Coding Style & Naming Conventions
- TypeScript + React with 2-space indentation, semicolons, and double quotes; match existing patterns.
- Use the `@/` alias for app code under `src/`; do not use `@/` imports inside artifacts.
- Prefer descriptive names; use PascalCase for components and camelCase for functions/variables.
- Keep formatting aligned with ESLint rules in `eslint.config.js`.

## Testing Guidelines
- Unit/integration: Vitest + React Testing Library; e2e: Playwright.
- Name tests `*.test.ts(x)` and place them in `__tests__/` or alongside feature modules.
- Maintain coverage above 55% (`npm run test:coverage`).

## Commit & Pull Request Guidelines
- Conventional commits: `type: description` (e.g., `feat`, `fix`, `docs`, `refactor`, `test`, `chore`).
- Branch names use prefixes like `feat/`, `fix/`, `docs/`, or `chore/`.
- PRs should include a clear description, related issues, testing performed, and stay focused; at least one approval is required.

## Security & Agent Notes
- Edge Functions must use `MODELS.*` from `supabase/functions/_shared/config.ts` (no hardcoded model names).
- `SECURITY DEFINER` functions must include `SET search_path = public, pg_temp`.
- Use `supabase/functions/_shared/cors-config.ts` for CORS (no wildcard origins).
- Artifacts cannot import local modules (e.g., `@/components/ui/*`); use globals and Tailwind.
- After UI changes, verify in Chrome DevTools MCP: load the app, check console errors, and capture a screenshot.

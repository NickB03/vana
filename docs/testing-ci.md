# Testing & CI/CD Playbook

This guide documents the testing expectations for `llm-chat-site`, how to exercise the suite locally, and how to wire the same guardrails into CI/CD so artifact regressions are caught before deployment.

## Objectives

- Prevent silent regressions in artifact creation, validation, and rendering.
- Keep AI-assisted refactors honest by enforcing lint + coverage gates.
- Provide a reproducible CI workflow (GitHub Actions or any runner) that mirrors local commands.

## Local Workflow (per branch)

1. **Lint fast** – `npm run lint`
2. **TDD on the file** – `npm run test -- --watch`
3. **Full suite** – `npm run test`
4. **Coverage gate** – `npm run test:coverage`
   - Runs `vitest run --coverage` then `scripts/check-coverage.mjs`, failing if coverage < 55/50/55/55 (raise over time).
   - Details live in `docs/testing-coverage.md`.
5. **UI debugging** – `npm run test:ui` when you need the Vitest browser runner to step through DOM interactions.
6. **Production sanity** – `npm run build` before merging large UI or dependency changes.

## Suite Breakdown

| Layer          | Location / Tools                                    | Guidance |
|----------------|------------------------------------------------------|----------|
| Unit           | `src/utils`, hooks, helpers                          | Use plain Vitest + DOM mocks. Cover parser/validator edge cases with fixtures in `src/test/mocks`. |
| Component/UI   | `src/components/**/*.{test,integration}.tsx`         | React Testing Library for artifact flows, verifying buttons, tabs, and diff viewers. |
| Integration    | `src/hooks/__tests__`, future API adapters           | Stub Supabase via `vi.mock('@/integrations/supabase/client')` to avoid real auth. |
| Manual/Visual  | Saved screenshots in `/docs` + manual playbook       | Re-run when styling/layout shifts significantly. |

Always add a regression test before applying a bug fix so the failure mode is locked in.

## Coverage Expectations

- Coverage is collected with V8/c8 and stored under `coverage/`.
- `scripts/check-coverage.mjs` enforces the global minimums. If you need to exclude unreachable code paths, annotate with `/* istanbul ignore next */` and leave a comment explaining why.
- Upload `coverage/lcov.info` (generated during Vitest runs) to any reporting service if you add one later.

## CI/CD Blueprint

Run the same commands in CI that you run locally. A minimal GitHub Actions workflow:

```yaml
name: ci
on:
  pull_request:
  push:
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-html
          path: coverage
```

Notes:

- No Supabase credentials are required for unit/integration tests because the Supabase client is mocked. If you later add live integration tests, inject secrets via GitHub Actions `env` or repository variables.
- Cache `~/.npm` or `node_modules` to speed up runs if you use self-hosted runners.
- `npm run build` ensures Vite can tree-shake and CSS compiles even if components are unused during tests.

## PR / Release Checklist

1. `npm run lint`
2. `npm run test:coverage`
3. `npm run build`
4. Attach screenshots or coverage summary when UI changes effect artifacts.
5. Include a link to `docs/testing-ci.md` or `docs/testing-coverage.md` in the PR description when requesting help on testing gaps.

By following this playbook you get deterministic signals locally and in CI, dramatically reducing the chance that agent-driven code edits break artifact creation without warning.

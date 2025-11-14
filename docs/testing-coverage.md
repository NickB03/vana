# Testing & Coverage Guardrails

High-signal tests plus enforced coverage keep AI-generated changes from silently breaking artifact creation. Use this guide as a checklist whenever you add features or let an agent refactor code.

## Commands to Run

- `npm run test -- --watch` – fastest feedback while iterating on a file
- `npm run test -- --changed` – focuses on files touched in the current branch
- `npm run test:coverage` – generates text + HTML coverage under `coverage/` and the post-run `scripts/check-coverage.mjs` gate fails when thresholds drop below 55% lines/functions/statements and 50% branches (raise over time)

> Coverage uses the built-in V8 instrumenter (c8). HTML reports live in `coverage/lcov-report/index.html`.

## Coverage Expectations

1. **All source files count**: the Vitest config sets `all: true`, so even un-imported modules (e.g., new hooks) must have tests or explicit exclusions.
2. **Threshold-driven**: dropping below 55/55/55/50 will break CI/local builds; raise the bar gradually after each feature to ratchet coverage upward (or annotate with `/* istanbul ignore */` and a justification when code is untestable).
3. **Meaningful reporters**: the text summary shows in the terminal; `lcov` feeds dashboards or PR bots.

## Regression-Resistant Workflow

1. **Isolate artifact logic**
   - `src/utils/artifactParser.ts` – add specs covering all supported `<artifact>` shapes, malformed inputs, and migration cases.
   - `src/utils/artifactValidator.ts` – test each validation branch with mocks located in `src/test/mocks`.
   - `src/components/Artifact.tsx` & `src/components/ArtifactContainer.tsx` – exercise rendering paths with Testing Library to catch UI regressions.
2. **Guard async integrations**
   - Supabase helpers in `src/lib`/`src/integrations` should mock network calls (Vitest `vi.mock`) so you can assert error handling without rotating keys.
3. **Artifact creation smoke tests**
   - Build integration tests that render `ChatInterface` with fixture messages to ensure artifacts appear, diff viewers load, and export buttons stay enabled.
4. **Lock known bugs**
   - When the AI agent fixes a regression, capture it in a spec before applying the fix. Store realistic payloads in `src/test/mocks/artifacts`.
5. **Automate before pushes**
   - Run `npm run lint && npm run test:coverage`. This matches the repo guidelines and ensures the coverage gate protects main.

## When Coverage Fails

1. Read the terminal summary to find the file/metric that slipped.
2. Open the HTML report for line-level highlights.
3. Backfill missing tests or refactor to make the code testable; avoid blanket exclusions.
4. Commit only after the coverage gate succeeds so regressions cannot land unnoticed.

Following this loop makes artifact creation deterministic and gives you immediate visibility whenever the AI agent introduces a breaking change.

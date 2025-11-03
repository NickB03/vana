# Repository Guidelines

## Project Structure & Module Organization
The app runs from `src/`, with entry points `main.tsx` and `App.tsx`. UI building blocks live in `src/components` (with matching `__tests__`), routed screens in `src/pages`, shared hooks under `src/hooks`, and domain helpers inside `src/lib` and `src/utils`. Integration layers for Supabase and AI providers sit in `src/integrations`. Testing utilities and mocks reside in `src/test`. Static assets belong in `public/`, generated bundles land in `dist/`, and backend SQL, policies, and edge functions are stored in `supabase/`.

## Build, Test, and Development Commands
Run `npm install` once per machine. Use `npm run dev` for the hot-reloading Vite server. Production bundles come from `npm run build`; `npm run build:dev` mirrors CI’s development-mode build. Launch a local preview with `npm run preview`. `npm run lint` applies the shared ESLint rules, and `npm run version:update` refreshes the artifact version manifest tracked in `src/version.ts`.

## Coding Style & Naming Conventions
Author components and hooks in TypeScript using ES modules. Prefer functional React components in PascalCase files (`ArtifactDiffViewer.tsx`) and camelCase utilities (`storage.test.ts`). Follow the ESLint config (`eslint.config.js`) and Tailwind setup to keep class ordering consistent; run the lint script before pushing. Co-locate component styles within Tailwind utility classes or `App.css`, keeping side-effect imports at the top of each module.

## Testing Guidelines
Vitest with Testing Library powers unit and integration tests. Place specs beside the implementation in `__tests__` folders or as `*.test.ts[x]` siblings. Shared mocks and DOM setup belong in `src/test/mocks` and `src/test/setup.ts`. Execute `npm run test` for watch mode, `npm run test:ui` when inspecting failures interactively, and `npm run test:coverage` to satisfy the repository’s expectation that significant UI or logic changes ship with coverage evidence.

## Commit & Pull Request Guidelines
Commits follow Conventional Commit prefixes (`docs:`, `refactor:`, `feat:`) as seen in `git log`; keep messages in the imperative and scoped to one change. PRs should summarize the user-facing impact, list validation steps (`npm run test`, screenshots for UI diffs), and link relevant issues or Supabase migrations. Tag reviewers only after lint and tests pass locally.

## Security & Configuration Tips
Environment files control access to Supabase and AI providers. Populate `.env` for production defaults, create `.env.local` for developer-only overrides, and never commit either. Backend secrets live in `supabase/.env.local`; copy from the provided example files when onboarding. Rotate keys immediately if accidental exposure occurs.

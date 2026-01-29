# Build & Deployment Overview

This repository includes documentation for local development workflows and a place to describe CI/CD, but it does not ship with hosted workflow files. If you add CI/CD, link it from this guide and keep secrets and project IDs out of the repo.

---

## Local Development Flow

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Run checks before shipping:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

---

## Supabase (Local)

If you use Supabase locally, the typical flow is:

```bash
supabase start
supabase functions serve <function-name>
supabase db reset
```

Keep production credentials in environment variables or hosted secret stores. Never commit real project IDs or keys to the repo.

---

## CI/CD Checklist (When You Add Workflows)

If you configure CI/CD (GitHub Actions, GitLab CI, etc.), ensure:

- Build steps run on every PR.
- Lint + test gates block merges on failure.
- Production deploys are tied to merges (not direct pushes).
- Secrets are injected via the CI system, not stored in git.

---

## Build Notes

Vite handles bundling, compression, and tree shaking. Update `vite.config.ts` if you need to tune chunking or compression.

---

## Deployment Notes

Deployment targets (Cloudflare, Vercel, Netlify, etc.) should:

- Load environment variables from the provider UI or CLI.
- Use `npm run build` to generate static assets.
- Serve `dist/` as the public directory.

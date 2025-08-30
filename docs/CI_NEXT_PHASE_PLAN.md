# CI/CD Next Phase Plan

Prepared: August 30, 2025,  
Owners: DevOps/Platform (DRI), Frontend Lead, and Backend Lead  
Status: Proposed  

This plan builds on `.github/workflows/ci.yml` (primary pipeline) to deliver stronger test coverage, faster feedback, and safer deployments without reintroducing flaky external dependencies.

Goals
- Expand automated tests (backend + frontend) with actionable coverage.
- Keep lint/security non-blocking until quality rises; gate only on builds/tests/coverage.
- Improve CI signal quality with artifacts, concurrency control, and smarter path filters.

Non-Goals
- No cloud deploys or docker-compose in CI in this phase.
- No secret-dependent jobs.

Timeline and Milestones
- M1 (Due September 13, 2025)
  - Backend pytest scaffolding standardized; coverage artifacts uploaded.
  - Frontend unit test runner chosen and bootstrapped.
  - CI concurrency and artifact uploads added.
- M2 (Due September 30, 2025)
  - Coverage gating at ≥70% lines on changed code paths or overall project (see Acceptance).
  - Path filters to skip irrelevant steps; job matrix stabilized.
  - Required status checks configured on default branch.
- M3 (Due October 31, 2025)
  - Nightly E2E smoke (optional, non-blocking) on self-contained pages.
  - Raise coverage target to 75% (warn below 80%); evaluate gating lift to 75–80%.

Acceptance Criteria

Backend (Python)
- Tests live under tests/ and run with pytest.
- Coverage produced via pytest-cov: XML (coverage.xml) and terminal report.
- Artifacts: coverage.xml uploaded on every run; retained 7 days.
- Make targets map one-to-one with CI:
  - `make test` → `pytest -q`
  - make test-cov → pytest --cov=src --cov-report=xml:coverage.xml --cov-report=term-missing

Frontend (Node/TS)
- Choose runner based on repo signals:
  - Prefer Vitest if Vite tooling is present; else Jest.
- npm run test executes headless unit tests and (if supported) writes coverage/lcov.info.
- Type check enforced via tsc --noEmit (continues non-blocking until M3).
- Artifacts: lcov.info uploaded on every run.

Coverage Gating
- M2: CI fails if overall coverage < 70% OR changed-files coverage < 70% (choose one approach and document).
- Exemptions are allowed via the `[ci:allow-low-coverage]` tag in the PR description, subject to approval by the DRI.
- M3: Target minimum 75%; warn if below 80%.

Workflow Improvements
- Concurrency: cancel in-progress runs per ref to reduce queue noise.
- Path filters: skip frontend build/tests when only backend paths change, and vice versa.
- Artifacts: always() upload coverage and build logs for debugging.
- Matrix (lightweight):
  - Python: 3.11 (primary). Optionally add 3.12 nightly non-blocking.
  - Node: 18 (primary). Optionally add 20 non-blocking nightly.

Security and Quality (remain non-blocking in this phase)
- Python: bandit summary step.
- Node: npm audit --audit-level=high || true with summary.
- Actions pinned to SHAs, updated monthly via Dependabot or Renovate.

Branch Protection (enable at M2)
- Required checks:
  - build-and-test (ci.yml)
  - coverage-threshold (if split step)
- Up-to-date branch required before merge; force-pushes disallowed to default.

Rollout & Backout
- Roll out by opening a PR that:
  - Adds steps below to ci.yml.
  - Sets branch protection required checks.
- Backout: set coverage job continue-on-error: true and remove from required checks.

YAML Changes (illustrative patches)

Concurrency
```yaml
concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

Artifacts (coverage)
```yaml
- name: Upload Python coverage
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: coverage-python
    path: coverage.xml
    retention-days: 7

- name: Upload Frontend coverage
  if: always() && hashFiles('frontend/coverage/lcov.info') != ''
  uses: actions/upload-artifact@v4
  with:
    name: coverage-frontend
    path: frontend/coverage/lcov.info
    retention-days: 7
```

Coverage gating (backend example)
```yaml
- name: Run tests (Python)
  run: |
    uv pip install pytest pytest-cov
    pytest --maxfail=1 --disable-warnings \
      --cov=src --cov-report=term-missing --cov-report=xml:coverage.xml
- name: Enforce coverage >= 70%
  run: python - << 'PY'
import sys, xml.etree.ElementTree as ET
r = ET.parse('coverage.xml').getroot().attrib
pct = 100.0 * (1 - float(r['missed'])/float(r['lines-valid'])) if 'missed' in r else float(r.get('line-rate',0))*100
print(f"Coverage: {pct:.2f}%")
sys.exit(0 if pct >= 70.0 else 1)
PY
```

Path filters (job-level)
```yaml
on:
  pull_request:
    paths:
      - "backend/**"
      - "pyproject.toml"
      - ".github/workflows/**"
```

Make Target Parity (documented expectations)
- make test → backend unit tests
- make test-frontend → frontend unit tests
- make test-all → runs both; used by ci.yml

Tracking
- Create one issue per milestone with child tasks:
  - Backend tests scaffolding
  - Frontend runner selection + setup
  - Coverage gating M2
  - Concurrency & artifacts
  - Branch protection configuration
- Label: area:ci, type:testing, milestone:phase-2

Risks & Mitigations
- Flaky tests: quarantine tag (@flaky) and separate non-blocking job; rotate weekly.
- Long runtimes: enforce per-step timeouts; cache npm and uv.
- Tooling mismatch locally: document versions in README; make targets source-of-truth.

Appendix: Commands

Backend (local)
- make test
- make test-cov

Frontend (local)
- npm ci
- npm run test
- npm run build
- npm run typecheck (if defined)
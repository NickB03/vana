# VANA Codex Agent Guide

Welcome, Codex developer! This document explains how to stand up a fully‑functional VANA workspace inside an OpenAI Codex container and describes the project conventions you should follow when writing or refactoring code.

---

## Prerequisites

* **Python ≥ 3.13** – the entire codebase targets Python 3.13.
* **Poetry** – single source of truth for dependency management and virtual‑env handling.
* **Google Cloud SDK** (`gcloud`) – used for Secret Manager, Artifact storage and future deployments.
* **Access to Google Secret Manager** – secrets are fetched at setup time by `setup_vana_codex.sh`.
* **Git** – standard workflows: feature branches + PRs.

Everything above is installed automatically by `setup_vana_codex.sh`. You only need to supply valid secrets or service‑account credentials.

---

## Quick Start

```bash
# Clone repo (the setup script will do this if the dir is missing)
 git clone https://github.com/NickB03/vana.git && cd vana

# Run the automated bootstrap (from the repo root)
 ../setup_vana_codex.sh    # parent dir because the script clones into ./vana

# Launch the dev API once the script prints 🎉
 poetry run python main.py
```

### Environment Variables & Secrets

| Variable / Secret                | Where it comes from                  | Purpose                                |
| -------------------------------- | ------------------------------------ | -------------------------------------- |
| `GOOGLE_CLOUD_PROJECT`           | env var or `.env.local`              | Default GCP project                    |
| `VANA_MODEL`                     | env var or `.env.local`              | Default LLM for agent tasks            |
| `ENVIRONMENT`                    | env var or `.env.local`              | `development`, `staging`, `prod`, …    |
| `VANA_PORT`                      | env var or `.env.local`              | Local server port                      |
| `BRAVE_API_KEY`                  | Secret Manager → `.env.local`        | External search                        |
| `GOOGLE_API_KEY`                 | Secret Manager → `.env.local`        | Google services                        |
| `GOOGLE_APPLICATION_CREDENTIALS` | Secret Manager → `/tmp/vana-sa.json` | Service‑account JSON for `gcloud auth` |

Secrets live in Google Secret Manager with default names:

* `brave_api_key`
* `google_api_key`
* `vana-sa-key` (contains the JSON key text)

If you change secret names, update the mapping at the top of `setup_vana_codex.sh`.

---

## Common Commands

```bash
# Start HTTP API (hot‑reload for development)
poetry run python main.py

# Unit tests only (quick)
poetry run pytest -m unit

# Full test suite (unit, agent, integration, e2e, security, performance)
poetry run pytest

# Code quality checks (all files)
poetry run pre-commit run --all-files
```

---

## Coding Conventions

* **Formatter**: `black` with line‑length 120.
* **Import order**: `isort` profile‑black.
* **Static analysis**: `flake8` + `mypy` targeting Python 3.13.
* **Security**: `bandit` pre‑commit hook.
* **Tests**: `pytest` with markers `unit`, `agent`, `integration`, `e2e`, `security`, `performance`.
* **Commit style**: Conventional Commits (`feat:`, `fix:`, `chore:`, …) with concise titles.

The pre‑commit hooks enforce all formatting and linting rules automatically.

---

## Repository Layout (abridged)

```
vana/
 ├─ agents/            # Core AI agent definitions & prompt templates
 ├─ tools/             # Modular tools the agents can call
 ├─ lib/               # Shared utility code
 ├─ api/               # FastAPI routes & dependency wiring
 ├─ tests/             # All test suites (mirrors src layout)
 ├─ scripts/           # One‑off maintenance utilities
 ├─ main.py            # Entrypoint for local run
 ├─ setup_vana_codex.sh# Environment bootstrap (placed one dir above when cloned by script)
 ├─ .env.template      # Copy → .env.local for local config
 └─ pyproject.toml     # Poetry config, dependency graph, tooling config
```

---

## Troubleshooting

* **Missing secret warnings** – The setup script prints ⚠️  if a secret is absent; supply it via GSM or environment vars.
* **Python version error** – Ensure the container image has Python 3.13+.
* **gcloud auth failures** – Confirm the service‑account JSON has roles:

  * `roles/secretmanager.secretAccessor`
  * `roles/aiplatform.user`
  * `roles/storage.objectViewer`
* **Test failures** – Run `poetry run pytest -m unit --maxfail=1 ‑vv` and inspect the trace; often a mis‑configured env var.

---

## Further Reading

* **Project README** – architecture overview and high‑level goals.
* **setup\_vana\_codex.sh** – source of truth for environment bootstrap.
* **Google Agent Development Kit docs** – patterns used by VANA agents.
* **OpenAI Codex docs** – good practices for tool‑install and offline constraints.

Happy coding! 🦄

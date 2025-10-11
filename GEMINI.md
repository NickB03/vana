# Vana - Virtual Autonomous Network Agents

## Project Overview

Vana is a comprehensive multi-agent AI research platform that transforms complex research questions into well-sourced reports. It is built on Google's Agent Development Kit (ADK) and features a two-phase approach that combines human oversight with AI automation. The project is a monorepo with a Python/FastAPI backend and a Next.js/React frontend.

**Backend:**

*   **Framework:** FastAPI
*   **Core Technologies:**
    *   Google Agent Development Kit (ADK)
    *   LiteLLM & OpenRouter for AI model selection (with Google Gemini as a fallback)
    *   `psycopg2` for PostgreSQL database connectivity
    *   `chromadb` for vector storage
    *   `SQLAlchemy` and `Alembic` for database ORM and migrations
*   **Authentication:** OAuth2/JWT, Firebase Auth, API keys
*   **Real-time:** Server-Sent Events (SSE) for real-time updates

**Frontend:**

*   **Framework:** Next.js
*   **UI:** shadcn-ui, Tailwind CSS
*   **State Management:** Zustand, React Query
*   **Testing:** Jest, Playwright, React Testing Library

## Building and Running

### Prerequisites

*   Python 3.10+
*   `uv` (Python package manager)
*   Node.js >=18.0.0
*   `make`
*   Google Cloud SDK

### Installation

1.  **Clone the repository:**
    ```bash
git clone https://github.com/NickB03/vana.git
cd vana
    ```

2.  **Install all dependencies:**
    ```bash
make install
    ```

3.  **Set up Google Cloud authentication:**
    ```bash
gcloud auth application-default login
gcloud config set project your-project-id
    ```

### Configuration

Create a `.env.local` file in the root directory. You can copy the example file:

```bash
cp .env.example .env.local
```

Then, edit the `.env.local` file with your settings, including API keys for Brave Search, Google Cloud, and optionally OpenRouter.

### Running the Application

*   **Run the full stack (backend and frontend):**
    ```bash
make dev
    ```
    *   Backend API will be available at `http://localhost:8000`
    *   Frontend will be available at `http://localhost:3000`

*   **Run only the backend:**
    ```bash
make dev-backend
    ```

*   **Run only the frontend:**
    ```bash
make dev-frontend
    ```

## Development Conventions

### Testing

*   **Run all tests:**
    ```bash
make test
    ```

*   **Run specific test categories:**
    *   **Unit tests:** `uv run pytest tests/unit -v`
    *   **Integration tests:** `uv run pytest tests/integration -v`
    *   **Performance tests:** `uv run pytest tests/performance -v`

*   **Frontend tests:**
    *   **Jest:** `cd frontend && npm test`
    *   **Playwright (E2E):** `cd frontend && npm run test:e2e`

### Linting and Type Checking

*   **Run all quality checks (linting, type checking, tests):**
    ```bash
make test && make lint && make typecheck
    ```

*   **Run linting only:**
    ```bash
make lint
    ```

*   **Run type checking only:**
    ```bash
make typecheck
    ```

### CI/CD

The project uses GitHub Actions for CI/CD. The workflows are defined in the `.github/workflows` directory. The pipeline is optimized for performance, using `uv` for dependency management and parallel matrix execution for tests.

## Google ADK Agent Starter Pack Guidance

### Core Principles
- Modify only the code directly tied to the task; preserve surrounding structure, comments, and formatting.
- Mirror existing patterns before introducing new logic. Review neighbouring modules to align naming, templating, and directory placement.
- Search across `src/base_template/`, `src/deployment_targets/`, `.github/`, `.cloudbuild/`, and `docs/` to keep configuration, CI/CD, and documentation in sync.

### Architecture Snapshot
- **Templating Pipeline:** Cookiecutter variable substitution → Jinja2 logic execution → templated file and directory names. A failure in any phase breaks project generation.
- **Key Directories:** `src/base_template/` (global defaults), `src/deployment_targets/` (environment overrides), `agents/` (self-contained agent templates with `.template/templateconfig.yaml`), and `src/cli/commands` for CLI entry points such as `create.py` and `setup_cicd.py`.
- **Template Processing Flow:** `src/cli/utils/template.py` copies the base template, overlays deployment target files, then applies agent-specific files.

### Jinja2 Rules of Thumb
- Close every `{% if %}`, `{% for %}`, and `{% raw %}` block to avoid generation failures.
- Use `{{ }}` for value substitution and `{% %}` for control flow.
- Trim whitespace with `{%-` / `-%}` when rendering should not emit extra newlines.

### Terraform & CI/CD Expectations
- Maintain a single `app_sa` service account across deployment targets; define roles via `app_sa_roles` and reference consistently.
- Keep GitHub Actions (`.github/workflows/`) and Cloud Build (`.cloudbuild/`) pipelines in parity, including variable names (`${{ vars.X }}` vs. `${_X}`) and Terraform-managed secrets.

### Layer Overrides & Cross-File Dependencies
- Respect the four-layer order: base template → deployment target → frontend type → agent template. Place edits in the minimal layer and propagate overrides as needed.
- Coordinate changes across `templateconfig.yaml`, `cookiecutter.json`, rendered templates, and CI/CD manifests to avoid drift.
- Wrap agent- or target-specific logic in conditionals such as `{% if cookiecutter.agent_name == "adk_live" %}`.

### Testing & Validation
- Exercise multiple combinations: agent types (`adk_live`, `adk_base`), deployment targets (`cloud_run`, `agent_engine`), and feature flags (`data_ingestion`, frontend types).
- Example scaffold command:
    ```bash
    uv run agent-starter-pack create myagent-$(date +%s) --output-dir target
    ```
- Watch for hardcoded URLs, missing conditionals, or dependency mismatches when introducing new extras.

### Pre-Submit Checklist
- Jinja blocks balanced and variables spelled correctly?
- Deployment target overrides reviewed?
- GitHub Actions and Cloud Build kept in sync?
- Tested across representative agent and feature combinations?

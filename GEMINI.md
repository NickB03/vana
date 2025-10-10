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

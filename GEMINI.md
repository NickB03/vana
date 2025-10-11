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

# Agent Development Kit (ADK)

Agent Development Kit (ADK)

## ADK Python Repository

Agent Development Kit (ADK)

An open-source, code-first Python toolkit for building, evaluating, and deploying sophisticated AI agents with flexibility and control.

Agent Development Kit (ADK) is a flexible and modular framework for developing and deploying AI agents. While optimized for Gemini and the Google ecosystem, ADK is model-agnostic, deployment-agnostic, and is built for compatibility with other frameworks. ADK was designed to make agent development feel more like software development, to make it easier for developers to create, deploy, and orchestrate agentic architectures that range from simple tasks to complex workflows.


✨ Key Features

Rich Tool Ecosystem
: Utilize pre-built tools, custom functions,
  OpenAPI specs, or integrate existing tools to give agents diverse
  capabilities, all for tight integration with the Google ecosystem.

Code-First Development
: Define agent logic, tools, and orchestration
  directly in Python for ultimate flexibility, testability, and versioning.

Modular Multi-Agent Systems
: Design scalable applications by composing
  multiple specialized agents into flexible hierarchies.

Deploy Anywhere
: Easily containerize and deploy agents on Cloud Run or
  scale seamlessly with Vertex AI Agent Engine.

🤖 Agent2Agent (A2A) Protocol and ADK Integration

For remote agent-to-agent communication, ADK integrates with the A2A protocol. See this  example for how they can work together.


🚀 Installation


Stable Release (Recommended)


You can install the latest stable version of ADK using pip:


pip install google-adk



The release cadence is weekly.


This version is recommended for most users as it represents the most recent official release.


Development Version


Bug fixes and new features are merged into the main branch on GitHub first. If you need access to changes that haven't been included in an official PyPI release yet, you can install directly from the main branch:


pip install git+https://github.com/google/adk-python.git@main



Note: The development version is built directly from the latest code commits. While it includes the newest fixes and features, it may also contain experimental changes or bugs not present in the stable release. Use it primarily for testing upcoming changes or accessing critical fixes before they are officially released.


📚 Documentation


Explore the full documentation for detailed guides on building, evaluating, and
deploying agents:




Documentation




🏁 Feature Highlight


Define a single agent:


from google.adk.agents import Agent
from google.adk.tools import google_search

root_agent = Agent(
    name="search_assistant",
    model="gemini-2.0-flash", # Or your preferred Gemini model
    instruction="You are a helpful assistant. Answer user questions using Google Search when needed.",
    description="An assistant that can search the web.",
    tools=[google_search]
)



Define a multi-agent system:


Define a multi-agent system with coordinator agent, greeter agent, and task execution agent. Then ADK engine and the model will guide the agents works together to accomplish the task.


from google.adk.agents import LlmAgent, BaseAgent

# Define individual agents
greeter = LlmAgent(name="greeter", model="gemini-2.0-flash", ...)
task_executor = LlmAgent(name="task_executor", model="gemini-2.0-flash", ...)

# Create parent agent and assign children via sub_agents
coordinator = LlmAgent(
    name="Coordinator",
    model="gemini-2.0-flash",
    description="I coordinate greetings and tasks.",
    sub_agents=[ # Assign sub_agents here
        greeter,
        task_executor
    ]
)



Development UI


A built-in development UI to help you test, evaluate, debug, and showcase your agent(s).




Evaluate Agents


adk eval \
    samples_for_testing/hello_world \
    samples_for_testing/hello_world/hello_world_eval_set_001.evalset.json



🤝 Contributing


We welcome contributions from the community! Whether it's bug reports, feature requests, documentation improvements, or code contributions, please see our
- 
General contribution guideline and flow
.
- Then if you want to contribute code, please read 
Code Contributing Guidelines
 to get started.


📄 License


This project is licensed under the Apache 2.0 License - see the LICENSE file for details.




Happy Agent Building!

**Source:** [adk-python repository](https://github.com/google/adk-python)

## Documentation
- [Custom agents](https://github.com/google/adk-docs/blob/main/docs/agents/custom-agents.md)
- [Agents](https://github.com/google/adk-docs/blob/main/docs/agents/index.md)
- [LLM Agent](https://github.com/google/adk-docs/blob/main/docs/agents/llm-agents.md)
- [Using Different Models with ADK](https://github.com/google/adk-docs/blob/main/docs/agents/models.md)
- [Multi-Agent Systems in ADK](https://github.com/google/adk-docs/blob/main/docs/agents/multi-agents.md)
- [Workflow Agents](https://github.com/google/adk-docs/blob/main/docs/agents/workflow-agents/index.md)
- [Loop agents](https://github.com/google/adk-docs/blob/main/docs/agents/workflow-agents/loop-agents.md)
- [Parallel agents](https://github.com/google/adk-docs/blob/main/docs/agents/workflow-agents/parallel-agents.md)
- [Sequential agents](https://github.com/google/adk-docs/blob/main/docs/agents/workflow-agents/sequential-agents.md)
- [API Reference](https://github.com/google/adk-docs/blob/main/docs/api-reference/index.md)
- [Artifacts](https://github.com/google/adk-docs/blob/main/docs/artifacts/index.md)
- [Design Patterns and Best Practices for Callbacks](https://github.com/google/adk-docs/blob/main/docs/callbacks/design-patterns-and-best-practices.md)
- [Callbacks: Observe, Customize, and Control Agent Behavior](https://github.com/google/adk-docs/blob/main/docs/callbacks/index.md)
- [Types of Callbacks](https://github.com/google/adk-docs/blob/main/docs/callbacks/types-of-callbacks.md)
- [Community Resources](https://github.com/google/adk-docs/blob/main/docs/community.md)
- [Context](https://github.com/google/adk-docs/blob/main/docs/context/index.md)
- [1. [`google/adk-python`](https://github.com/google/adk-python)](https://github.com/google/adk-docs/blob/main/docs/contributing-guide.md)
- [Deploy to Vertex AI Agent Engine](https://github.com/google/adk-docs/blob/main/docs/deploy/agent-engine.md)
- [Deploy to Cloud Run](https://github.com/google/adk-docs/blob/main/docs/deploy/cloud-run.md)
- [Deploy to GKE](https://github.com/google/adk-docs/blob/main/docs/deploy/gke.md)
- [Deploying Your Agent](https://github.com/google/adk-docs/blob/main/docs/deploy/index.md)
- [Why Evaluate Agents](https://github.com/google/adk-docs/blob/main/docs/evaluate/index.md)
- [Events](https://github.com/google/adk-docs/blob/main/docs/events/index.md)
- [Agent Development Kit (ADK)](https://github.com/google/adk-docs/blob/main/docs/get-started/about.md)
- [Get Started](https://github.com/google/adk-docs/blob/main/docs/get-started/index.md)
- [Installing ADK](https://github.com/google/adk-docs/blob/main/docs/get-started/installation.md)
- [Quickstart](https://github.com/google/adk-docs/blob/main/docs/get-started/quickstart.md)
- [Streaming Quickstarts](https://github.com/google/adk-docs/blob/main/docs/get-started/streaming/index.md)
- [Quickstart (Streaming / Java) {#adk-streaming-quickstart-java}](https://github.com/google/adk-docs/blob/main/docs/get-started/streaming/quickstart-streaming-java.md)
- [Quickstart (Streaming / Python) {#adk-streaming-quickstart}](https://github.com/google/adk-docs/blob/main/docs/get-started/streaming/quickstart-streaming.md)
- [Testing your Agents](https://github.com/google/adk-docs/blob/main/docs/get-started/testing.md)
- [What is Agent Development Kit?](https://github.com/google/adk-docs/blob/main/docs/index.md)
- [Model Context Protocol (MCP)](https://github.com/google/adk-docs/blob/main/docs/mcp/index.md)
- [Agent Observability with Arize AX](https://github.com/google/adk-docs/blob/main/docs/observability/arize-ax.md)
- [Agent Observability with Phoenix](https://github.com/google/adk-docs/blob/main/docs/observability/phoenix.md)
- [Runtime](https://github.com/google/adk-docs/blob/main/docs/runtime/index.md)
- [Runtime Configuration](https://github.com/google/adk-docs/blob/main/docs/runtime/runconfig.md)
- [Safety & Security for AI Agents](https://github.com/google/adk-docs/blob/main/docs/safety/index.md)
- [Introduction to Conversational Context: Session, State, and Memory](https://github.com/google/adk-docs/blob/main/docs/sessions/index.md)
- [Memory: Long-Term Knowledge with `MemoryService`](https://github.com/google/adk-docs/blob/main/docs/sessions/memory.md)
- [Session: Tracking Individual Conversations](https://github.com/google/adk-docs/blob/main/docs/sessions/session.md)
- [State: The Session's Scratchpad](https://github.com/google/adk-docs/blob/main/docs/sessions/state.md)
- [Configurating streaming behaviour](https://github.com/google/adk-docs/blob/main/docs/streaming/configuration.md)
- [Custom Audio Streaming app (WebSocket) {#custom-streaming-websocket}](https://github.com/google/adk-docs/blob/main/docs/streaming/custom-streaming-ws.md)
- [Custom Audio Streaming app (SSE) {#custom-streaming}](https://github.com/google/adk-docs/blob/main/docs/streaming/custom-streaming.md)
- [ADK Bidi-streaming development guide: Part 1 - Introduction](https://github.com/google/adk-docs/blob/main/docs/streaming/dev-guide/part1.md)
- [Bidi-streaming(live) in ADK](https://github.com/google/adk-docs/blob/main/docs/streaming/index.md)
- [Streaming Tools](https://github.com/google/adk-docs/blob/main/docs/streaming/streaming-tools.md)
- [Authenticating with Tools](https://github.com/google/adk-docs/blob/main/docs/tools/authentication.md)
- [Built-in tools](https://github.com/google/adk-docs/blob/main/docs/tools/built-in-tools.md)
- [Function tools](https://github.com/google/adk-docs/blob/main/docs/tools/function-tools.md)
- [Google Cloud Tools](https://github.com/google/adk-docs/blob/main/docs/tools/google-cloud-tools.md)
- [Tools](https://github.com/google/adk-docs/blob/main/docs/tools/index.md)
- [Model Context Protocol Tools](https://github.com/google/adk-docs/blob/main/docs/tools/mcp-tools.md)
- [OpenAPI Integration](https://github.com/google/adk-docs/blob/main/docs/tools/openapi-tools.md)
- [Third Party Tools](https://github.com/google/adk-docs/blob/main/docs/tools/third-party-tools.md)
- [Build Your First Intelligent Agent Team: A Progressive Weather Bot with ADK](https://github.com/google/adk-docs/blob/main/docs/tutorials/agent-team.md)
- [ADK Tutorials!](https://github.com/google/adk-docs/blob/main/docs/tutorials/index.md)
- [Python API Reference](https://github.com/google/adk-docs/blob/main/docs/api-reference/python/)
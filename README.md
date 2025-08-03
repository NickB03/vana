# Vana - Virtual Autonomous Network Agents

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python)
![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Powered-4285F4?style=for-the-badge&logo=google-cloud)
![License](https://img.shields.io/badge/License-Apache%202.0-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Development-orange?style=for-the-badge)

**Production-Ready Multi-Agent AI Research System**

[Quick Start](#quick-start) • [Architecture](#system-architecture) • [Features](#core-features) • [Deployment](#deployment) • [Contributing](#contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [System Architecture](#system-architecture)
  - [Multi-Agent Workflow](#multi-agent-workflow)
  - [Component Architecture](#component-architecture)
  - [Data Flow](#data-flow)
- [Core Features](#core-features)
- [Agents & Capabilities](#agents--capabilities)
  - [Agent Hierarchy](#agent-hierarchy)
  - [Agent Descriptions](#agent-descriptions)
- [Tools & Integrations](#tools--integrations)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Testing](#testing)
- [Deployment](#deployment)
  - [Development Environment](#development-environment)
  - [Production CI/CD](#production-cicd)
- [API Documentation](#api-documentation)
- [Configuration](#configuration)
- [Monitoring & Observability](#monitoring--observability)
- [Contributing](#contributing)
- [License](#license)

---

## 🚀 Overview

Vana is a sophisticated multi-agent AI system built on Google's Agent Development Kit (ADK) that transforms any user request into comprehensive, well-researched reports. Using a two-phase workflow (Plan & Execute), Vana leverages multiple specialized Gemini agents working in concert to deliver production-quality research outputs with proper citations and iterative quality control.

### Key Highlights

- **🤖 Multi-Agent Architecture**: Specialized agents working together through orchestrated workflows for research planning, execution, evaluation, and reporting
- **🔄 Two-Phase Process**: Interactive planning with human-in-the-loop followed by autonomous execution
- **📊 Quality Assurance**: Built-in research evaluation and iterative refinement loops with up to 5 quality iterations
- **🌐 Production-Ready**: Full CI/CD pipeline, monitoring, and scalable Cloud Run deployment
- **💎 Powered by Advanced Models**: Supports Gemini 2.5 Pro/Flash models plus LiteLLM integration for OpenRouter and other providers
- **🔍 Smart Citations**: Automatic source tracking and inline citation generation with clickable links
- **🎨 Modern UI**: Real-time thinking panel, interactive research plan editing, and WebSocket-based live updates

---

## ⚡ Quick Start

### Prerequisites

```bash
# Required tools
- Python 3.10+
- uv (Python package manager)
- Google Cloud SDK
- Terraform
- Node.js & npm
- make
```

### Installation

```bash
# Clone the repository
git clone https://github.com/vana-project/vana.git
cd vana

# Install dependencies
make install

# Set up Google Cloud authentication
gcloud auth application-default login
gcloud config set project analystai-454200
```

### Run Locally

```bash
# Option 1: Full development environment (backend + frontend)
make dev

# Option 2: ADK Playground (interactive testing)
make playground

# Option 3: Backend API only
make dev-backend
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🏗️ System Architecture

### Multi-Agent Workflow

![How Vana Creates Your Research](docs/images/vana-workflow.svg)

*Vana uses a two-phase approach: First, we work together to create the perfect research plan. Then, our AI agents automatically execute the research and deliver a comprehensive report.*

### Component Architecture

![Vana Technical Architecture](docs/images/architecture-simple.svg)

*A modern, cloud-native architecture built on Google Cloud Platform, featuring auto-scaling, comprehensive monitoring, and enterprise-grade security.*

### Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend API
    participant AG as Agents
    participant GS as Brave Search
    participant DB as Storage
    
    U->>FE: Submit Query
    FE->>API: POST /api/run_sse
    API->>AG: Initialize Session
    
    loop Planning Phase
        AG->>AG: Generate Plan
        AG->>API: Stream Plan
        API->>FE: SSE Events
        FE->>U: Display Plan
        U->>FE: Provide Feedback
        FE->>API: Continue Session
    end
    
    U->>FE: Approve Plan
    FE->>API: Execute Pipeline
    
    loop Research Phase
        AG->>GS: Search Queries (4-5 per goal)
        GS->>AG: Results with Grounding
        AG->>AG: Evaluate Quality (Critic Model)
        AG->>AG: Generate Follow-up Queries
        AG->>DB: Store Sources with Citations
    end
    
    AG->>AG: Compose Report
    AG->>API: Final Report
    API->>FE: Stream Report
    FE->>U: Display Results
```

---

## ✨ Core Features

### 🎯 Intelligent Planning
- **Adaptive Plan Generation**: Converts any user request into structured 5-point research plans
- **Task Classification**: Automatically categorizes tasks as [RESEARCH] or [DELIVERABLE] with status tags [MODIFIED], [NEW], [IMPLIED]
- **Human-in-the-Loop**: Interactive refinement with inline plan editing and approval workflow
- **Implied Deliverables**: Proactively suggests synthesis outputs based on research goals
- **Flexible Planning**: Plans can expand beyond initial 5 points based on user feedback and complexity

### 🔍 Advanced Research Capabilities
- **Multi-Query Generation**: Each research goal spawns 4-5 targeted search queries using Brave Search
- **Source Tracking**: Automatic citation management with confidence scores and URL-to-short-ID mapping
- **Iterative Refinement**: Critical quality evaluation with up to 5 refinement iterations using Gemini Pro
- **Enhanced Search**: Follow-up queries to address identified knowledge gaps
- **Two-Phase Execution**: Strict separation between information gathering (RESEARCH) and synthesis (DELIVERABLE) tasks

### 📝 Professional Output
- **Structured Reports**: Markdown-formatted with 4-6 logical sections following generated outline
- **Inline Citations**: Automatic source attribution with clickable links using `<cite source="src-ID" />` system
- **Quality Assurance**: Multi-model evaluation with Gemini 2.5 Pro for critical evaluation tasks
- **Custom Deliverables**: Tables, comparisons, summaries, and other artifacts based on plan requirements
- **Citation Processing**: Automatic conversion of citation tags to readable markdown links with source titles

### 🛠️ Production Infrastructure
- **Scalable Deployment**: Cloud Run with auto-scaling (4 CPU, 8GB RAM configuration)
- **Session Management**: In-memory or persistent (AlloyDB) options with state preservation
- **Comprehensive Monitoring**: OpenTelemetry, Cloud Trace, BigQuery analytics with Looker Studio dashboards
- **CI/CD Pipeline**: Automated testing, staging, and production deployments via Google Cloud Build
- **Real-time Communication**: WebSocket/SSE-based live updates for thinking steps and message streaming

### 🎨 Advanced User Interface

- **Real-time Thinking Panel**: Live visualization of agent activities with phase tracking (Planning → Researching → Evaluating → Composing)
- **Interactive Research Plans**: Inline editing of research plans with structured display and approval workflow
- **WebSocket Integration**: Real-time message streaming and thinking step updates for responsive user experience
- **Visual Progress Tracking**: Progress bars, phase indicators, and completion status with animated transitions
- **Connection Management**: Automatic connection status monitoring with visual indicators
- **Quick Testing Tools**: Built-in development buttons for rapid UI and workflow testing
- **Modern AI Components**: Custom-built ChatInterface, SimplifiedThinkingPanel, and ResearchPlanDisplay components
- **Responsive Design**: Mobile-friendly interface with collapsible panels and adaptive layouts

---

## 🤖 Agents & Capabilities

### Agent Hierarchy

![Your AI Research Team](docs/images/agent-team-clean.svg)

*Think of it as your personal research department: A team leader coordinates specialized agents who plan, research, quality-check, and write your reports.*

### Agent Descriptions

| Agent | Model | Purpose | Key Features |
|-------|-------|---------|--------------|
| **interactive_planner_agent** | Worker Model* | Primary user interface and orchestrator | • Converts requests to plans<br/>• Manages user interaction<br/>• Delegates to research pipeline |
| **plan_generator** | Worker Model* | Creates and refines research strategies | • 5-line action plans<br/>• Task classification [RESEARCH]/[DELIVERABLE]<br/>• Minimal search for topic clarification |
| **section_planner** | Worker Model* | Designs report structure | • 4-6 section markdown outlines<br/>• Logical organization<br/>• Citation-ready structure |
| **section_researcher** | Worker Model* | Executes research plan | • Two-phase execution (RESEARCH → DELIVERABLE)<br/>• 4-5 queries per research goal<br/>• Source collection with grounding |
| **research_evaluator** | Critic Model* | Quality assessment | • Critical evaluation with Feedback schema<br/>• Gap identification<br/>• Follow-up query generation |
| **escalation_checker** | Custom Python | Loop control logic | • Pass/fail detection from evaluator<br/>• Iteration management<br/>• Flow control for refinement loop |
| **enhanced_search_executor** | Worker Model* | Fills knowledge gaps | • Executes follow-up queries<br/>• Integrates with existing findings<br/>• Iterative improvement |
| **report_composer_with_citations** | Critic Model* | Final report generation | • Professional markdown writing<br/>• Citation tag processing<br/>• Structured output with inline links |

*Worker Model: Gemini 2.5 Flash (default) or configurable via LiteLLM  
*Critic Model: Gemini 2.5 Pro (default) or configurable via LiteLLM

---

## 🔧 Tools & Integrations

### Core Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Brave Search** | Web research and information gathering | Custom tool implementation with API integration |
| **Cloud Storage** | Artifact and large payload storage | GCS buckets for build artifacts and data |
| **Session Service** | Conversation state management | In-memory/AlloyDB with state preservation |
| **Citation System** | Source tracking and link generation | Grounding metadata with confidence scores |

### MCP Servers (Local Development Only)

```yaml
# These tools are available in local development via Model Context Protocol
# They are NOT part of the deployed Vana system
- chroma-vana: Document storage and retrieval
- memory-mcp: Graph-based knowledge management  
- firecrawl: Web scraping capabilities
- linear: Issue tracking integration
- kanban-board: Task management
```

---

## 💻 Development

### Prerequisites

1. **Install Required Tools**:
   ```bash
   # Install uv (Python package manager)
   curl -LsSf https://astral.sh/uv/install.sh | sh
   
   # Install other tools via package manager
   brew install google-cloud-sdk terraform node
   ```

2. **Google Cloud Setup**:
   ```bash
   gcloud auth application-default login
   gcloud config set project analystai-454200
   ```

### Local Development

```bash
# Install all dependencies
make install

# Run full stack locally (both frontend and backend)
make dev
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs

# Run individual components
make dev-backend    # Backend API only
make dev-frontend   # Frontend only  
make playground     # ADK playground interface

# Testing and quality
make test          # Unit and integration tests
make lint          # Code quality checks (ruff, mypy, codespell)
```

### Testing

#### Quick UI Testing
The frontend includes built-in testing tools accessible via QuickTestButtons:
- **Quick Test**: Minimal query for UI testing (`"What is 2+2?"`)
- **Simple Research**: Short research task (`"List 3 benefits of water"`)
- **UI Stress Test**: Full research flow (`"Research the Google Agent Starter Pack"`)

#### Backend Testing
```python
# Create test script: run_agent.py
import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from app.agent import root_agent
from google.genai import types as genai_types

async def main():
    session_service = InMemorySessionService()
    await session_service.create_session(
        app_name="app", user_id="test_user", session_id="test_session"
    )
    runner = Runner(
        agent=root_agent, app_name="app", session_service=session_service
    )
    
    query = "Create a comprehensive report on sustainable energy solutions"
    async for event in runner.run_async(
        user_id="test_user",
        session_id="test_session",
        new_message=genai_types.Content(
            role="user", 
            parts=[genai_types.Part.from_text(text=query)]
        ),
    ):
        if event.is_final_response():
            print(event.content.parts[0].text)

if __name__ == "__main__":
    asyncio.run(main())
```

Run with: `uv run python run_agent.py`

#### Test Coverage
- **Unit Tests**: Agent logic, citation processing, configuration
- **Integration Tests**: Full workflow testing, API endpoints
- **UI Tests**: Component testing with interactive features

---

## 🚀 Deployment

### Development Environment

```bash
# Set up infrastructure
make setup-dev-env

# Deploy to Cloud Run
make backend

# Deploy with UI (Identity-Aware Proxy)
make backend IAP=true
```

### Production CI/CD

```bash
# One-command CI/CD setup
uvx agent-starter-pack setup-cicd \
  --staging-project analystai-staging \
  --prod-project analystai-454200 \
  --repository-name vana \
  --repository-owner vana-project \
  --git-provider github \
  --auto-approve
```

### Deployment Architecture

```mermaid
graph LR
    subgraph "CI/CD Pipeline"
        GH[GitHub] --> CB[Cloud Build]
        CB --> |Test| ST[Staging]
        CB --> |Approve| PR[Production]
    end
    
    subgraph "Runtime Environment"
        CR[Cloud Run<br/>4 CPU, 8GB RAM]
        CR --> SA[Service Account]
        SA --> GCS[Cloud Storage]
        SA --> VA[Vertex AI]
        SA --> SE[Secret Manager]
    end
    
    subgraph "Monitoring"
        CR --> CT[Cloud Trace]
        CR --> CL[Cloud Logging]
        CL --> BQ[BigQuery]
        BQ --> LS[Looker Studio]
    end
```

---

## 📚 API Documentation

### Core Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/apps/{app}/users/{user}/sessions` | POST | Create new session |
| `/api/run_sse` | POST | Execute agent with SSE streaming |
| `/api/apps` | GET | List available agents |
| `/feedback` | POST | Submit user feedback |
| `/docs` | GET | Interactive API documentation |

### Example Request

```bash
curl -X POST http://localhost:8000/api/run_sse \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "app",
    "userId": "user123",
    "sessionId": "session456",
    "newMessage": {
      "parts": [{"text": "Research the latest AI trends"}],
      "role": "user"
    },
    "streaming": true
  }'
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=True

# API Keys (for AI Studio)
GOOGLE_API_KEY=your-api-key  # Optional, for AI Studio

# Alternative Model Providers (via LiteLLM)
USE_OPENROUTER=true         # Enable OpenRouter integration
OPENROUTER_API_KEY=your-key # OpenRouter API key
BRAVE_API_KEY=your-key      # Brave Search API key

# Session Management
SESSION_TYPE=in_memory  # or 'alloydb' for production

# Monitoring
ENABLE_TRACING=true
LOG_LEVEL=INFO
```

### Model Configuration

Vana supports multiple model providers through flexible configuration:

#### Default Gemini Models
```python
# app/config.py (default)
@dataclass
class ResearchConfiguration:
    critic_model: str = "gemini-2.5-pro"      # For evaluation tasks
    worker_model: str = "gemini-2.5-flash"    # For general tasks
    max_search_iterations: int = 5            # Quality refinement loops
```

#### Alternative Models via LiteLLM
```python
# app/models.py (when USE_OPENROUTER=true)
from google.adk.models.lite_llm import LiteLlm

# Example: OpenRouter with Qwen3 Coder Free
CRITIC_MODEL = LiteLlm(model="openrouter/qwen/qwen3-coder:free")
WORKER_MODEL = LiteLlm(model="openrouter/qwen/qwen3-coder:free")
```

#### Supported Providers
- **Google Gemini**: Default models via Vertex AI or AI Studio
- **OpenRouter**: Access to multiple model providers (Anthropic, OpenAI, etc.)
- **LiteLLM Compatible**: Any provider supported by LiteLLM library

#### Model Selection Guidelines
- **Critic Model**: Used for research evaluation, report composition (requires reasoning capability)
- **Worker Model**: Used for planning, research, search execution (can be faster/cheaper)
- **Search Iterations**: Controls quality vs cost trade-off (1-10 recommended)

---

## 📊 Monitoring & Observability

### Metrics Dashboard

Access the Looker Studio template: [Dashboard Template](https://lookerstudio.google.com/reporting/46b35167-b38b-4e44-bd37-701ef4307418/page/tEnnC)

### Key Metrics

- **Performance**: Request latency, token usage, agent execution time
- **Quality**: Research evaluation scores, iteration counts, source quality
- **Usage**: Active sessions, request volume, user engagement
- **Errors**: Failed searches, timeout rates, API errors

### Logging

```python
# Structured logging example
logger.log_struct({
    "event": "research_complete",
    "agent": "section_researcher",
    "sources_found": 12,
    "execution_time": 45.2,
    "quality_score": 0.92
}, severity="INFO")
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`make test`) and linting (`make lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Python: Follow PEP 8, use type hints
- TypeScript: Use ESLint configuration
- Documentation: Update README and inline comments
- Testing: Maintain >80% coverage

---

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

[Report Issues](https://github.com/vana-project/vana/issues) • [Documentation](https://github.com/vana-project/vana/wiki) • [Discussions](https://github.com/vana-project/vana/discussions)

</div>
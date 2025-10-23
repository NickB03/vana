# Vana - Multi-Agent AI Platform

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat-square&logo=python)](https://www.python.org/downloads/)
[![Google ADK](https://img.shields.io/badge/Google%20ADK-1.8.0-4285F4?style=flat-square&logo=google-cloud)](https://cloud.google.com/products/ai)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.8-009485?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[![CI Pipeline](https://github.com/NickB03/vana/actions/workflows/main-ci.yml/badge.svg)](https://github.com/NickB03/vana/actions/workflows/main-ci.yml)
[![Deployment](https://github.com/NickB03/vana/actions/workflows/deploy.yml/badge.svg)](https://github.com/NickB03/vana/actions/workflows/deploy.yml)
[![Security Scan](https://github.com/NickB03/vana/actions/workflows/security-scan.yml/badge.svg)](https://github.com/NickB03/vana/actions/workflows/security-scan.yml)
[![Dependency Check](https://github.com/NickB03/vana/actions/workflows/dependency-check.yml/badge.svg)](https://github.com/NickB03/vana/actions/workflows/dependency-check.yml)

**Multi-Agent AI Platform Built on Google's Agent Development Kit**

Production-ready platform that orchestrates specialized AI agents for complex tasks—research, analysis, code generation, and automation with real-time streaming.

[🚀 Quick Start](#-quick-start) • [🤖 How It Works](#-how-it-works) • [✨ Features](#-key-features) • [🏗️ Architecture](#️-architecture) • [📚 Documentation](#-documentation)

</div>

---

## 📑 Table of Contents

- [🎯 What is Vana?](#-what-is-vana)
- [🤖 How It Works](#-how-it-works)
- [✨ Key Features](#-key-features)
- [🚀 Quick Start](#-quick-start)
- [🏗️ Architecture](#️-architecture)
- [🔐 Security](#-security)
- [📚 API Reference](#-api-reference)
- [💻 Development](#-development)
- [⚡ AI Model Configuration](#-ai-model-configuration)
- [🧪 Testing](#-testing)
- [🚢 Deployment](#-deployment)
- [⚙️ CI/CD Pipeline](#️-cicd-pipeline)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🎯 What is Vana?

**Vana** is a multi-agent AI platform that orchestrates specialized AI agents to tackle complex tasks collaboratively. Built on Google's Agent Development Kit (ADK), Vana provides a production-ready foundation for AI-powered applications requiring research, analysis, code generation, and intelligent automation.

<div align="center">

![System Architecture](docs/images/architecture-simple.svg)

</div>

### 🌟 Core Capabilities

- **🧠 Google ADK Foundation**: Built on Google's Agent Development Kit for reliability and scalability
- **🤖 Specialized AI Agents**: Multiple agents with distinct expertise working in parallel
- **⚡ Real-time Streaming**: Live updates via Server-Sent Events (SSE) for responsive user experiences
- **🔐 Production Security**: Comprehensive authentication (JWT/OAuth2/Firebase) with role-based access control
- **📊 Battle-Tested**: 342+ tests ensuring reliability and performance in production environments

### 🎯 Use Cases

- **Research Applications** - Multi-source information gathering, synthesis, and comprehensive reporting
- **Data Analysis** - Parallel processing of complex datasets with intelligent agent coordination
- **Code Generation** - AI-assisted development with specialized agents for different programming tasks
- **Content Creation** - Collaborative AI workflows for documentation, articles, and technical writing
- **Automation Pipelines** - Intelligent task orchestration with autonomous agent coordination

---

## 🤖 How It Works

Vana uses a two-phase approach combining human oversight with AI automation for optimal results:

<div align="center">

![Vana Workflow](docs/images/vana-workflow.svg)

</div>

### Phase 1: Interactive Planning (1-2 minutes)
1. **You describe** your task in natural language
2. **AI creates a structured plan** breaking down your request into actionable steps
3. **You review and approve** the plan, making any adjustments needed
4. **Execution begins** with your approval

### Phase 2: Autonomous Execution (3-5 minutes)
1. **Specialized agents activate** - each with distinct roles and capabilities
2. **Parallel execution** - agents work simultaneously for maximum efficiency
3. **Quality assurance** - built-in evaluation and refinement processes
4. **Complete results delivered** - properly formatted with citations and sources

### Your AI Agent Team

<div align="center">

![AI Team](docs/images/agent-team-clean.svg)

</div>

**🎯 Team Leader**: Coordinates the entire process and manages task distribution

**📋 Planning Team**: Creates strategies and organizes workflow structure
- Plan Generator: Develops comprehensive task strategies
- Section Planner: Structures and organizes execution flow

**🔍 Execution Team**: Performs the actual information gathering and processing
- Section Researcher: Finds and processes relevant information
- Enhanced Search: Performs deep analysis using advanced techniques

**✅ Quality Team**: Ensures accuracy and completeness
- Research Evaluator: Validates information quality and relevance
- Escalation Checker: Final quality control and consistency verification

**📝 Report Writer**: Synthesizes all findings into professional, well-cited deliverables

---

## ✨ Key Features

### 🧠 **Powered by Google ADK & Modern AI Models**
- **Google ADK Foundation**: Built on Google's Agent Development Kit for reliability and scale
- **Primary Model**: Google Gemini 2.5 Flash for fast, stable AI processing
- **Cloud-Native Design**: Seamless integration with Google Cloud Platform services
- **Production Ready**: Comprehensive testing and monitoring for deployment

### 🤖 **Multi-Agent Intelligence**
- **Specialized AI Agents**: Each agent optimized for specific task types
- **Parallel Tool Calling**: Research queries execute 4-5x faster using ADK's native parallel execution
- **Quality Assurance**: Built-in evaluation, fact-checking, and refinement processes
- **Intelligent Coordination**: Advanced orchestration ensures optimal task distribution
- **Cost Tracking**: Real-time token and cost monitoring for production visibility

### 🔐 **Production Security**
- **Multiple Auth Methods**: OAuth2/JWT, Firebase Auth, API keys, or development mode
- **Role-Based Access**: Fine-grained permissions and user isolation
- **Data Protection**: End-to-end encryption, secure sessions, CORS protection
- **Audit Trail**: Complete logging and monitoring of all activities

### ⚡ **Real-Time Experience**
- **Live Updates**: Watch progress with Server-Sent Events (SSE) streaming
- **Interactive Planning**: Review and approve plans before execution
- **Session Persistence**: Resume work seamlessly across sessions and restarts
- **Memory Optimized**: Zero memory leaks for long-running production deployments

### 📊 **Professional Output**
- **Structured Results**: Well-organized deliverables with proper citations
- **Multiple Formats**: Support for various output formats and styles
- **Source Tracking**: Full attribution and reference management
- **Quality Control**: Multi-stage validation ensures accuracy and completeness

---

## 🚀 Quick Start

Get Vana running locally in under 5 minutes:

### Prerequisites

```bash
# Required tools
- Python 3.10+
- uv (Python package manager)
- Google Cloud SDK
- make
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/NickB03/vana.git
cd vana

# 2. Install all dependencies
make install

# 3. Set up Google Cloud authentication
gcloud auth application-default login
gcloud config set project your-project-id
```

### Configuration

Create `.env.local` in the root directory:

```bash
# Required: Google Cloud and search capabilities
BRAVE_API_KEY=your-brave-search-api-key
GOOGLE_CLOUD_PROJECT=your-project-id

# Authentication (choose one)
JWT_SECRET_KEY=your-jwt-secret-key    # For JWT auth
# OR set AUTH_REQUIRE_SSE_AUTH=false for development
```

### Launch Vana

```bash
# Start the backend service
make dev-backend

# 🎉 Vana is now running!
# • API: http://localhost:8000
# • Interactive Docs: http://localhost:8000/docs
# • Health Check: http://localhost:8000/health

# Optional: Start ADK playground for agent testing
make playground  # http://localhost:8501
```

### Your First Request

```bash
# Test with curl
curl -X POST http://localhost:8000/api/run_sse \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "app",
    "userId": "user123",
    "newMessage": {
      "parts": [{"text": "Research the latest trends in renewable energy"}],
      "role": "user"
    },
    "streaming": true
  }'
```

🚀 **That's it!** Your request will be processed by specialized AI agents working in parallel.

---

## 🏗️ Architecture

### System Overview

Vana's architecture consists of three main layers:

**1. API Gateway Layer** (FastAPI)
- Request routing and validation
- Authentication and authorization
- SSE streaming coordination
- Session management

**2. ADK Orchestration Layer** (Google ADK)
- Agent lifecycle management
- Task distribution and coordination
- Memory and state management
- Tool registry and execution

**3. Agent Execution Layer** (Specialized AI Agents)
- Parallel task processing
- Quality assurance and validation
- Result synthesis and formatting
- Real-time progress reporting

### Multi-Agent Workflow

```mermaid
sequenceDiagram
    participant User
    participant Auth as Auth Service
    participant API as FastAPI Gateway
    participant ADK as Google ADK
    participant Plan as Planning Agent
    participant Execute as Execution Agent
    participant Eval as Evaluator Agent
    participant Compose as Composer Agent
    participant Store as Storage

    User->>Auth: Authenticate
    Auth-->>User: JWT Token

    User->>API: Task Request + JWT
    API->>API: Validate Token
    API->>ADK: Initialize Session

    ADK->>Plan: Create Execution Plan
    Plan-->>User: Present Plan (via SSE)
    User->>API: Approve Plan

    loop Execution Phase
        API->>Execute: Execute Task
        Execute->>Execute: Process & Analyze
        Execute-->>User: Progress Updates (SSE)
        Execute->>Store: Save Results
    end

    Execute->>Eval: Evaluate Quality

    alt Quality Check Failed
        Eval->>Execute: Request Refinement
        Execute->>Execute: Refine Results
    else Quality Check Passed
        Eval->>Compose: Generate Output
    end

    Compose->>Compose: Format & Citations
    Compose->>Store: Save Final Results
    Compose-->>User: Deliver Results (SSE)

    API->>Store: Persist Session
```

### Technology Stack

**Backend Services**
```
FastAPI (API Gateway)
  ↓
Google ADK (Agent Orchestration)
  ↓
Gemini 2.5 Flash (AI Processing)
  ↓
Google Cloud Platform (Infrastructure)
```

**Data Services**
- **Cloud Storage**: Session persistence and file storage
- **Brave Search API**: Web search capabilities
- **Vector Store**: RAG data for context-aware responses
- **Cloud Logging**: Centralized logging and monitoring

**Security Services**
- **OAuth2/JWT**: Token-based authentication
- **Firebase Auth**: Managed authentication service
- **Google Cloud IAM**: Identity and access management
- **CORS Protection**: Cross-origin security

---

## ⚡ Performance Optimizations

Vana leverages **Google ADK's native capabilities** for optimal performance without custom complexity.

### 🚀 Parallel Tool Calling

**Problem**: Research queries with 5 searches executed sequentially (~10 seconds).

**ADK-Native Solution**: Instruction-based parallel execution - the LLM calls multiple tools concurrently in a single turn.

**Results**:
- **Before**: ~10s for 5 searches (sequential)
- **After**: ~2s for 5 searches (parallel)
- **Speedup**: **5x faster**
- **Implementation**: 3 lines of instruction vs 400+ lines of custom framework

**Code Sample** (`app/agent.py`):
```python
section_researcher = LlmAgent(
    instruction="""
    **PARALLEL EXECUTION:** Execute ALL queries in parallel by calling
    brave_search multiple times in the same turn. ADK handles concurrent execution.
    """,
    tools=[brave_search]
)
```

### 💰 Cost Tracking

**Simple, portfolio-optimized cost monitoring** for production visibility:

```python
from app.utils.cost_tracker import get_cost_tracker

summary = get_cost_tracker().get_summary()
# => {"total_cost_usd": 0.0234, "total_tokens": 15420, ...}
```

**Features**:
- Real-time token usage tracking by agent/model/session
- Cost calculation (per 1M tokens)
- Simple metrics aggregation
- ~150 lines vs 391 lines of complex budget enforcement

### 🎯 Design Philosophy

**ADK-Native > Custom Frameworks**:
- ✅ Leverage framework capabilities instead of reinventing them
- ✅ Simpler code (87% less) with same performance gains
- ✅ Demonstrates framework research and pragmatic engineering
- ✅ Production-quality patterns with minimal maintenance

**Archived Implementations**: Original complex optimization frameworks preserved in `docs/optimization/archived_implementations/` as portfolio artifacts demonstrating systems thinking.

**📚 Documentation**: See `docs/optimization/ADK_NATIVE_OPTIMIZATIONS.md` for detailed implementation guide.

---

## 🔐 Security

Vana implements production-grade security to protect your data and ensure safe operation:

### 🔑 **Authentication Options**
- **OAuth2/JWT**: Industry-standard token-based authentication
- **Firebase Auth**: Google's managed authentication service
- **API Keys**: Simple key-based access for API clients
- **Development Mode**: Optional auth bypass for local development

### 🛡️ **Data Protection**
- **End-to-End Encryption**: All data encrypted in transit and at rest
- **Session Security**: Secure session management with automatic cleanup
- **CORS Protection**: Cross-origin resource sharing controls
- **Rate Limiting**: Protection against abuse and DDoS attacks

### 👥 **Access Control**
- **Role-Based Permissions**: Fine-grained access control (RBAC)
- **User Isolation**: Complete separation of user data and sessions
- **Audit Trail**: Comprehensive logging of all activities
- **Token Management**: Automatic refresh and secure token storage

---

## 📚 API Reference

### Core Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | ❌ | Health check and service status |
| `/api/run_sse` | POST | ✅ | Execute tasks with real-time streaming |
| `/api/apps/{app}/users/{user}/sessions` | GET/POST | ✅ | Manage user sessions |
| `/auth/login` | POST | ❌ | Authenticate and receive JWT token |

### Quick Examples

**Health Check:**
```bash
curl http://localhost:8000/health
```

**Task Request:**
```bash
# With authentication
curl -X POST http://localhost:8000/api/run_sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $YOUR_TOKEN" \
  -d '{
    "appName": "app",
    "userId": "user123",
    "newMessage": {
      "parts": [{"text": "Your task description here"}],
      "role": "user"
    },
    "streaming": true
  }'
```

**Python Client Example:**
```python
import httpx

# Simple task request
response = httpx.post("http://localhost:8000/api/run_sse", json={
    "appName": "app",
    "userId": "user123",
    "newMessage": {"parts": [{"text": "Your task description"}], "role": "user"},
    "streaming": True
})
```

📖 **Complete API documentation:** `http://localhost:8000/docs` when running locally

---

## 💻 Development

### Environment Setup

1. **Install Tools**:
   ```bash
   # Install uv (Python package manager)
   curl -LsSf https://astral.sh/uv/install.sh | sh

   # Install other tools
   brew install google-cloud-sdk node
   ```

2. **Google Cloud Setup**:
   ```bash
   gcloud auth application-default login
   gcloud config set project your-project-id
   ```

3. **Environment Configuration**:
   ```bash
   # Copy example environment file
   cp .env.example .env.local

   # Edit .env.local with your settings
   vim .env.local
   ```

### Local Development

```bash
# Install all dependencies
make install

# Run development server
make dev-backend    # Backend only
make dev-frontend   # Frontend only
make dev           # Full stack

# Development URLs
# Backend API: http://localhost:8000
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
# Health: http://localhost:8000/health
```

### Code Quality

```bash
# Run all tests
make test

# Code linting and formatting
make lint

# Type checking
make typecheck

# All quality checks
make test && make lint && make typecheck
```

---

## ⚡ AI Model Configuration

Vana uses **Google Gemini 2.5 Flash** as the primary AI model for fast, stable processing.

### 🔍 Model Details

**Primary Model: Google Gemini 2.5 Flash**
- **Critic Model**: `gemini-2.5-flash` (planning, evaluation)
- **Worker Model**: `gemini-2.5-flash` (execution, content generation)
- **Provider**: Google Cloud Vertex AI
- **Characteristics**: Fast response times, stable performance, production-ready
- **Authentication**: Google Cloud credentials via `gcloud auth application-default login`

### ⚙️ Configuration

The model is configured in `app/models.py`:

```python
# Model constants
CRITIC_MODEL = "gemini-2.5-flash"  # Planning and evaluation
WORKER_MODEL = "gemini-2.5-flash"  # Execution and generation
```

### 🛠️ Requirements

To use Gemini models, ensure you have:

1. **Google Cloud Project** with Vertex AI API enabled
2. **Application Default Credentials** configured:
   ```bash
   gcloud auth application-default login
   gcloud config set project your-project-id
   ```
3. **Environment Variables** in `.env.local`:
   ```bash
   GOOGLE_CLOUD_PROJECT=your-project-id
   ```

### 🚦 API Rate Limiting

Vana implements comprehensive rate limiting to prevent overwhelming the Gemini API and ensure reliable operation within free-tier constraints.

#### Rate Limit Configuration

**Request Rate Limiting:**
- **8 requests per minute** (conservative buffer under 15 RPM free-tier limit)
- **2 concurrent requests maximum** (prevents API overload)
- **1000 requests per day** (leaves headroom under 1500/day limit)

**Implementation Details:**
```python
# app/utils/rate_limiter.py
gemini_rate_limiter = AsyncRateLimiter(
    max_requests=8,        # 8 RPM limit
    time_window=60.0,      # 60 seconds
    max_concurrent=2       # 2 concurrent requests
)

daily_quota = DailyQuotaTracker(max_daily_requests=1000)
```

#### Gemini Free Tier Limits (2024/2025)

| Model | RPM | TPM | Daily Limit |
|-------|-----|-----|-------------|
| Gemini 1.5 Flash | 15 | 1M tokens | 1500 requests |
| Gemini 1.5 Pro | 2 | — | 32K tokens |

#### Rate Limit Behavior

**When limits are reached:**
1. **RPM Limit**: Requests are queued and processed when tokens become available
2. **Daily Quota**: Returns `429 Too Many Requests` with user-friendly error message
3. **503 Errors**: Automatically normalized and displayed to users with retry suggestions

**User Experience:**
- Subtle UI notice informs users about free-tier constraints
- Error messages provide clear guidance for retry timing
- No silent failures - all errors are displayed in chat

**For Production Deployments:**

To adjust limits for paid tiers, modify `app/utils/rate_limiter.py`:
```python
# Standard tier example
gemini_rate_limiter = AsyncRateLimiter(
    max_requests=30,       # Increase to 30 RPM
    max_concurrent=5       # Allow more concurrent requests
)

daily_quota = DailyQuotaTracker(max_daily_requests=10000)
```

---

## 🧪 Testing

### Comprehensive Test Suite

Vana includes a complete testing framework ensuring reliability and helping developers understand the codebase:

#### Test Categories

| Category | Purpose | Location | Tests |
|----------|---------|----------|-------|
| **Unit Tests** | Test individual components in isolation | `tests/unit/` | 200+ |
| **Integration Tests** | Test component interactions and APIs | `tests/integration/` | 100+ |
| **Performance Tests** | Benchmark performance and detect memory leaks | `tests/performance/` | 40+ |

#### Running Tests

```bash
# Run all tests
make test

# Run specific test categories
uv run pytest tests/unit -v           # Unit tests only
uv run pytest tests/integration -v    # Integration tests only
uv run pytest tests/performance -v    # Performance tests only

# Run tests with coverage report
uv run pytest --cov=app --cov-report=html tests/
open htmlcov/index.html  # View coverage report
```

#### Key Test Files

```bash
# Authentication system
tests/unit/test_auth.py              # JWT and OAuth2 logic
tests/integration/test_auth_api.py   # Authentication endpoints

# Agent system
tests/integration/test_adk_integration.py  # ADK agent tests
tests/integration/test_agent.py            # Agent orchestration

# Real-time streaming
tests/unit/test_sse_broadcaster.py         # SSE implementation
tests/integration/test_sse_connections.py  # SSE API tests

# Session management
tests/integration/test_session_management.py  # Session persistence

# Memory management
tests/unit/test_sse_memory_leak_fixes.py     # Memory leak prevention
```

#### Test Coverage

- **Current Coverage**: 85%+
- **Minimum Required**: 85%
- **Goal**: 90%+

---

## 🚢 Deployment

### Quick Deployment

```bash
# Development
make dev                    # Full local stack
make dev-backend           # Backend only (port 8000)
make playground            # ADK playground (port 8501)

# Production
make backend               # Deploy to Cloud Run
make backend IAP=true      # Deploy with IAP authentication
```

### Production Deployment

Vana is designed for cloud-native deployment on Google Cloud Platform:

**Cloud Run** (Recommended)
- Auto-scaling with 0-to-N instances
- Pay-per-use pricing model
- Integrated with Cloud CDN and Load Balancing
- Built-in HTTPS and custom domains

**Deployment Features**
- **Auto-scaling**: Scales from 0 to N based on traffic
- **High Availability**: Multi-region deployment support
- **Security**: Identity-Aware Proxy (IAP) for authentication
- **Monitoring**: Cloud Logging and Cloud Monitoring integration
- **CI/CD**: Automated deployment via GitHub Actions

### CI/CD Pipeline

```bash
# Automated setup
uvx agent-starter-pack setup-cicd \
  --staging-project your-staging \
  --prod-project your-prod \
  --repository-name vana \
  --repository-owner NickB03 \
  --git-provider github \
  --auto-approve
```

---

## ⚙️ CI/CD Pipeline

[![Performance Optimized](https://img.shields.io/badge/Performance-Optimized-brightgreen?style=flat-square&logo=github-actions)](https://github.com/NickB03/vana/actions/workflows/main-ci.yml)
[![UV Package Manager](https://img.shields.io/badge/UV-Package%20Manager-4B9CD3?style=flat-square&logo=python)](https://github.com/astral-sh/uv)

Vana implements a **performance-optimized CI/CD pipeline** ensuring reliability, security, and speed:

### 🚀 Performance Achievements

**Pipeline Metrics:**
- ⚡ **33% faster builds** (15-18 min → 10-12 min)
- 📦 **50% faster dependency installation** with UV package manager
- 🎯 **97%+ success rate** (improved from 92%)
- 💾 **90%+ cache hit rate** (improved from 70%)

**Key Optimizations:**
- **UV Package Manager** - Revolutionary Python dependency management
- **Smart Change Detection** - Only run tests for modified components
- **Parallel Matrix Execution** - Concurrent testing across categories
- **Multi-Layer Caching** - Enhanced caching with version-based invalidation

### 🔄 Active Workflows

| Workflow | Purpose | Trigger | Duration | Status |
|----------|---------|---------|----------|--------|
| **CI-Fixed** | Frontend-focused validation | Push, PR | 8-10 min | [![CI](https://github.com/NickB03/vana/actions/workflows/ci-fixed.yml/badge.svg)](https://github.com/NickB03/vana/actions/workflows/ci-fixed.yml) |
| **Local Build** | Full-stack testing | Push, PR | 10-12 min | [![Build](https://github.com/NickB03/vana/actions/workflows/local-build.yml/badge.svg)](https://github.com/NickB03/vana/actions/workflows/local-build.yml) |
| **Security Scan** | Vulnerability detection | Weekly, Push | ~5 min | [![Security](https://github.com/NickB03/vana/actions/workflows/security-scan.yml/badge.svg)](https://github.com/NickB03/vana/actions/workflows/security-scan.yml) |
| **Dependency Check** | Package security | Weekly | ~3 min | [![Dependencies](https://github.com/NickB03/vana/actions/workflows/dependency-check.yml/badge.svg)](https://github.com/NickB03/vana/actions/workflows/dependency-check.yml) |

### 🛡️ Quality Gates

Every change must pass these production-ready quality gates:

- ✅ **Code Quality**: Ruff linting, MyPy type checking
- ✅ **Comprehensive Testing**: 342+ unit/integration tests with parallel execution
- ✅ **Security Scanning**: Bandit + Safety vulnerability detection
- ✅ **Memory Safety**: SSE memory leak detection and prevention
- ✅ **Production Verification**: Backend/frontend startup and health checks

### 📦 UV Package Manager

**Revolutionary dependency management:**

```bash
# Fast, parallel dependency resolution
uv sync --group dev --group lint    # 50% faster than pip
uv sync --no-dev --quiet           # Production only

# Dependency Groups
[dependency-groups]
dev = ["pytest", "pytest-asyncio", "pytest-cov", "httpx"]
lint = ["ruff", "mypy", "bandit", "safety"]
```

**Benefits:**
- 🚀 Parallel dependency resolution vs sequential pip
- 🔒 Lock file consistency with `uv.lock`
- 💨 Native caching eliminating configuration issues
- ⚡ Group-based installs for targeted dependencies

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`make test`)
5. Submit a Pull Request

### Development Requirements

- Python 3.10+
- Google Cloud SDK
- Make
- UV package manager

```bash
# Setup development environment
make install
make dev-setup

# Run quality checks
make test          # Run tests
make lint          # Check code style
make typecheck     # Type checking
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**🚀 Transform Complex Tasks with AI Agents**

Vana makes multi-agent AI accessible to everyone. Whether you're building research tools, analysis platforms, or intelligent automation systems, Vana provides the production-ready foundation you need.

**Ready to get started?** [Jump to Quick Start ⬆️](#-quick-start)

</div>

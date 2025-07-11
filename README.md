# VANA: Agentic AI System with Hierarchical Orchestration

<!-- Phase 3 Complete - Updated Jul 11, 2025 -->

<div align="center">
  <!-- VANA Logo - Add when assets are available -->
  
  [![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue.svg)](https://www.python.org/downloads/)
  [![Google ADK](https://img.shields.io/badge/Google%20ADK-1.1.1-green.svg)](https://github.com/google/adk)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Architecture](https://img.shields.io/badge/architecture-hierarchical-purple.svg)]()
  [![Agents](https://img.shields.io/badge/agents-7_active-brightgreen.svg)]()
  
  **True Agentic AI: Hierarchical Multi-Agent System for Complex Task Automation**
  
  [Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [Documentation](#documentation) • [Contributing](#contributing)
</div>

---

## 🌟 Overview

VANA is an advanced agentic AI system featuring hierarchical multi-agent orchestration built on Google's Agent Development Kit (ADK). With a 5-level agent hierarchy, VANA intelligently decomposes complex tasks, routes them to specialized agents, and coordinates sophisticated workflows through its Master Orchestrator.

### 🚀 Current Status: Phase 3 Complete

**VANA has successfully completed Phase 3 implementation**, achieving a fully functional hierarchical agentic AI system with enhanced orchestration and specialized agents.

#### ✅ Completed Phases

**Phase 1 (Foundation)**: Core hierarchical system with 5-level architecture  
**Phase 2 (Stabilization)**: Critical bug fixes, thread safety, memory improvements  
**Phase 3 (Enhancement)**: Working specialists with real tools, enhanced orchestrator

#### 🆕 Phase 3 Features (Just Completed)

- **🏗️ Hierarchical Architecture**: Full 5-level agent system operational
  - Level 1: VANA Chat Agent (user interface, 2 tools)
  - Level 2: Master Orchestrator (routing engine, 5 tools)
  - Level 3: Project Managers (Phase 4 - workflow patterns)
  - Level 4: Specialist Agents (4 functional specialists, 4-6 tools each)
  - Level 5: Maintenance Agents (Phase 4 - memory/learning)

- **🧠 Enhanced Orchestrator**: Production-ready routing system
  - Intelligent task analysis (Simple → Enterprise complexity)
  - LRU caching with 100-entry limit (40x speedup)
  - Performance metrics (<10% overhead)
  - Security-first priority routing
  - Thread-safe implementation

- **👥 Working Specialists** (All ADK-compliant, synchronous):
  - **Architecture Specialist**: AST-based pattern detection, dependency analysis, real refactoring
  - **Data Science Specialist**: Statistical analysis using only Python stdlib
  - **Security Specialist (ELEVATED)**: Priority routing, vulnerability scanning, compliance validation
  - **DevOps Specialist**: CI/CD generation, deployment configs, monitoring setup

- **🛡️ Production Features**:
  - Circuit breakers and fault tolerance
  - Comprehensive error handling
  - Performance monitoring and metrics
  - Thread-safe singleton registry
  - Double-checked locking patterns

### Core Capabilities

- **🤖 Intelligent Orchestration**: Hierarchical task decomposition with real routing logic
- **🔧 Distributed Tools**: 25+ specialized tools across 4 working specialists
- **🧠 Advanced Task Analysis**: Complexity scoring (Simple/Moderate/Complex/Enterprise)
- **⚡ Performance**: <100ms routing, 40x cache speedup, <1s average response
- **🔄 Agent Communication**: Agent-as-tool pattern for seamless integration
- **🛡️ Enterprise Ready**: Thread-safe, monitored, fault-tolerant, ADK-compliant

## 🚀 Quick Start

### Prerequisites

- Python 3.13+ (required for modern async patterns)
- Node.js 18+ (for frontend)
- Poetry for dependency management
- Google Cloud API key for Gemini models

### One-Command Setup

```bash
# Clone and setup everything
git clone https://github.com/yourusername/vana.git
cd vana
make setup && make dev
```

That's it! 🎉 The system will:
- Check all dependencies
- Install Python and Node packages
- Setup your environment
- Start both backend and frontend

### Alternative Setup Methods

#### Docker (Recommended)
```bash
# Using Docker Compose
docker-compose up

# Or with Make
make docker-up
```

#### Local Development
```bash
# Manual setup
./scripts/start-dev.sh  # Interactive setup with checks

# Or step by step
poetry install          # Python dependencies
cd vana-ui && npm install && cd ..  # Frontend dependencies
./start-vana-ui.sh     # Start everything
```

#### VS Code
Press `Cmd+Shift+B` (or `Ctrl+Shift+B` on Windows/Linux) to start the development environment directly from VS Code.

### Configuration

```bash
# Environment setup (auto-created by make setup)
cp .env.example .env.local
# Add your GOOGLE_API_KEY to .env.local
```

Get your API key from: [Google AI Studio](https://aistudio.google.com/apikey)

### Access Points

Once running, you can access:
- 🌐 **Frontend**: http://localhost:5173
- 🔧 **Backend API**: http://localhost:8081
- 📚 **API Docs**: http://localhost:8081/docs
- 🎯 **Health Check**: http://localhost:8081/health

### Your First Request

```bash
# Simple conversation (handled by VANA Chat)
curl -X POST http://localhost:8081/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello, what can you help me with?", "session_id": "test-001"}'

# Complex task (routed to specialists)
curl -X POST http://localhost:8081/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Design a microservices architecture for an e-commerce platform", "session_id": "test-002"}'

# Or use the web interface at http://localhost:5173
```

## 🛠️ Development Commands

```bash
# Common tasks
make help          # Show all available commands
make test          # Run all tests
make format        # Format code with black
make lint          # Run linting checks
make security      # Run security scan

# Docker operations
make docker-up     # Start with Docker
make docker-down   # Stop Docker services
make docker-logs   # View logs

# Environment
make clean         # Clean generated files
./scripts/validate-env.sh  # Check environment setup
```

## 🏗️ Architecture

<div align="center">
  <!-- Architecture diagram - Add when assets are available -->
</div>

### Current Architecture (Phase 3 Complete)

```mermaid
graph TD
    User[User] --> VANA[VANA Chat Agent<br/>2 tools]
    VANA --> MO[Master Orchestrator<br/>HierarchicalTaskManager<br/>5 tools]
    
    MO --> |Simple Tasks| Specialists
    MO --> |Complex Tasks| PM[Project Managers<br/>Phase 4: Workflows]
    
    subgraph Specialists[Active Specialists - Phase 3]
        ARCH[Architecture Specialist<br/>6 tools<br/>✅ Working]
        SEC[Security Specialist<br/>4 tools<br/>🔴 ELEVATED]
        DO[DevOps Specialist<br/>6 tools<br/>✅ Working]
        DS[Data Science Specialist<br/>6 tools<br/>✅ Working]
        QA[QA Engineer<br/>Phase 4]
        UI[UI/UX Designer<br/>Phase 4]
    end
    
    subgraph Maintenance[Maintenance Agents - Phase 4]
        MA[Memory Agent]
        PA[Planning Agent]
        LA[Learning Agent]
    end
    
    MO -.-> Maintenance
    
    style VANA fill:#e1f5fe
    style MO fill:#fff3e0
    style Specialists fill:#f3e5f5
    style Maintenance fill:#f5f5f5,stroke-dasharray: 5 5
```

### Task Routing Flow

```mermaid
sequenceDiagram
    participant User
    participant VANA as VANA Chat
    participant MO as Master Orchestrator
    participant TA as Task Analyzer
    participant SP as Specialist
    
    User->>VANA: "Design a REST API"
    VANA->>MO: transfer_to_agent
    MO->>TA: analyze_task_complexity
    TA-->>MO: complexity: SIMPLE, type: DESIGN
    MO->>SP: route_to_specialist(architecture)
    SP-->>MO: API design complete
    MO-->>VANA: Results
    VANA-->>User: Here's your API design...
```

### Agent Flow

<div align="center">
  <!-- Agent flow diagram - Add when assets are available -->
</div>

```mermaid
sequenceDiagram
    participant U as User
    participant V as VANA
    participant T as Task Analyzer
    participant A as Agents
    participant Tools
    
    U->>V: Submit Request
    V->>T: Analyze Task
    T->>V: Task Classification
    V->>A: Delegate to Specialist
    A->>Tools: Execute Operations
    Tools->>A: Return Results
    A->>V: Task Complete
    V->>U: Final Response
```

## 📚 Documentation

### Core Concepts

#### Multi-Agent Architecture
VANA employs a hierarchical agent structure where the orchestrator delegates tasks to specialized agents based on their capabilities and the task requirements.

#### Task Analysis Engine
Advanced NLP-powered analysis determines task type, complexity, required capabilities, and optimal execution strategy.

#### Tool Integration
Seamless integration with Google ADK provides a rich set of tools for file operations, web searching, data processing, and more.

### API Reference

#### POST /run
Execute a task through VANA orchestration.

**Request:**
```json
{
  "input": "Your task description here"
}
```

**Response:**
```json
{
  "result": {
    "output": "Task completed successfully...",
    "id": "session_uuid"
  }
}
```

#### GET /health
Check system health status.

**Response:**
```json
{
  "status": "healthy"
}
```

## 🛠️ Development

### Project Structure

```
vana/
├── agents/               # Agent implementations
│   ├── vana/            # Main orchestrator
│   │   ├── team.py      # VANA root agent
│   │   └── enhanced_orchestrator.py  # Phase 3 routing
│   ├── specialists/     # Phase 3 functional specialists
│   │   ├── architecture_specialist.py
│   │   ├── data_science_specialist.py
│   │   ├── security_specialist.py (ELEVATED)
│   │   └── devops_specialist.py
│   ├── code_execution/  # Code execution (temp disabled)
│   └── data_science/    # Legacy data specialist
├── lib/                 # Core libraries
│   ├── _tools/          # ADK tool implementations
│   ├── _shared_libraries/  # Shared utilities
│   │   └── orchestrator_metrics.py  # Phase 3 metrics
│   └── mcp/             # Model Context Protocol
├── tests/               # Test suites
│   ├── unit/           # Specialist unit tests
│   ├── integration/    # Orchestrator tests
│   ├── e2e/           # End-to-end flows
│   └── performance/    # Benchmarks
├── docs/                # Documentation
└── main.py              # FastAPI application
```

### Phase 3 Features

#### Enhanced Orchestrator
```python
from agents.vana.enhanced_orchestrator import analyze_and_route

# Automatically routes to appropriate specialist
result = analyze_and_route("Check my code for SQL injection vulnerabilities")
# Routes to Security Specialist with ELEVATED priority

# View performance metrics
from agents.vana.enhanced_orchestrator import get_orchestrator_stats
print(get_orchestrator_stats())
```

#### Specialist Examples
```python
# Architecture analysis
result = analyze_and_route("Review the design patterns in my codebase")

# Data science without external dependencies  
result = analyze_and_route("Analyze this dataset: [1,2,3,4,5]")

# DevOps automation
result = analyze_and_route("Create a CI/CD pipeline for Python")
```

### Running Tests

```bash
# Run unit tests (including all specialists)
poetry run pytest tests/unit -v

# Run integration tests
poetry run pytest tests/integration -v

# Run end-to-end tests
poetry run pytest tests/e2e -v

# Run performance benchmarks
poetry run pytest tests/performance -v -m benchmark

# Run comprehensive test suite
./scripts/run_comprehensive_tests.sh
```

### Code Quality

```bash
# Format code
poetry run black .

# Sort imports
poetry run isort .

# Run linters
poetry run flake8
poetry run mypy .

# Security scan
poetry run bandit -r .
```

## 🗺️ Roadmap

### Phase 1: Foundation (Complete ✅)
- [x] Core orchestration system
- [x] ADK integration
- [x] Basic agent implementations
- [x] Tool ecosystem

### Phase 2: Enhancement (Complete ✅)
- [x] Thread safety fixes
- [x] Error handling improvements
- [x] Integration bug fixes
- [x] Memory system updates

### Phase 3: Code Improvement (Complete ✅)
- [x] Architecture Specialist with AST-based analysis
- [x] Data Science Specialist (no external dependencies)
- [x] Security Specialist with ELEVATED priority routing
- [x] DevOps Specialist with real config generation
- [x] Enhanced Orchestrator with caching and metrics
- [x] Comprehensive test suite (unit, integration, e2e)
- [x] Performance benchmarks (<1s average response)

### Phase 4: Workflow Management (Next 🚀)
- [ ] Sequential Workflow Manager
- [ ] Parallel Workflow Manager  
- [ ] Loop Workflow Manager
- [ ] QA and UI/UX Specialists
- [ ] Memory and Learning Agents
- [ ] Automated workflow generation

### Phase 5: Intelligence (Future 🔮)
- [ ] Self-improving agents
- [ ] Cross-agent learning
- [ ] Predictive task optimization
- [ ] Autonomous decision making

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`poetry run pytest`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- Follow PEP 8 style guidelines
- Write comprehensive tests
- Document all public APIs
- Keep commits atomic and well-described

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on [Google's Agent Development Kit (ADK)](https://github.com/google/adk)
- Powered by Gemini AI models
- Inspired by modern orchestration patterns

---

<div align="center">
  <p>Built with ❤️ by the VANA Team</p>
  <p>
    <a href="https://github.com/yourusername/vana">GitHub</a> •
    <a href="https://vana-docs.com">Documentation</a> •
    <a href="https://discord.gg/vana">Community</a>
  </p>
</div>
# 💻 Developer Guide

Comprehensive guide for developing with and contributing to VANA's multi-agent system.

## 🏗️ Project Structure

```
vana/
├── agents/                    # Agent implementations
│   └── vana/                 # Main agent directory
│       ├── agent.py          # Agent entry point
│       ├── team.py           # Complete agent team definition
│       └── __init__.py       # Agent exports
├── lib/                      # Core libraries
│   ├── _tools/              # Tool implementations
│   ├── _shared_libraries/   # Shared components
│   ├── environment.py       # Environment detection
│   └── model_providers/     # LLM integrations
├── memory-bank/             # Organized persistent knowledge storage
│   ├── 00-core/            # Essential project files
│   ├── 01-active/          # Current work and tasks
│   ├── 02-phases/          # Phase completion documentation
│   ├── 03-technical/       # Technical documentation
│   ├── 04-completed/       # Finished work
│   └── 05-archive/         # Historical context
├── docs/                    # Documentation
├── tests/                   # Test suites
├── scripts/                 # Utility scripts
├── main.py                  # FastAPI entry point
└── pyproject.toml          # Poetry configuration
```

## 🧠 Memory Bank Structure

VANA uses an organized Memory Bank for persistent knowledge storage and agent coordination. All memory files are located in `/Users/nick/Development/vana/memory-bank/` and organized into 6 logical categories:

### 📁 Memory Bank Categories

#### **00-core/** - Essential Project Files
**Purpose:** Core project documentation and current state
- `activeContext.md` - Current work state and immediate priorities
- `progress.md` - Project progress tracking and milestones
- `projectbrief.md` - Project goals, scope, and requirements
- `productContext.md` - Problem context and solution vision
- `systemPatterns.md` - Architecture patterns and design decisions
- `techContext.md` - Technical environment and constraints
- `memory-bank-index.md` - Master navigation file

#### **01-active/** - Current Work
**Purpose:** Active tasks, feedback, and immediate action items
- Current task instructions and agent assignments
- Active feedback and resolution items
- Immediate priorities and blockers
- Work-in-progress documentation

#### **02-phases/** - Phase Completion Documentation
**Purpose:** Historical phase completions and major milestones
- Week 1-5 handoff documentation
- Phase completion summaries (Phase 1-6)
- Major milestone achievements
- Transition documentation between phases

#### **03-technical/** - Technical Documentation
**Purpose:** Implementation plans, architecture, and technical designs
- Implementation plans and strategies
- Architecture documentation and patterns
- System design specifications
- Technical optimization plans

#### **04-completed/** - Finished Work
**Purpose:** Successfully completed work and resolved issues
- Completed handoff documentation
- Success summaries and achievements
- Resolved issues and their solutions
- Validated implementations

#### **05-archive/** - Historical Context
**Purpose:** Critical recovery history and lessons learned
- Critical recovery documentation
- System repair history
- Emergency fixes and their context
- Lessons learned from major issues

### 🎯 Memory Bank Usage Guidelines

#### **For Agent Development:**
1. **Always read core files first** - Start with `00-core/activeContext.md` and `00-core/progress.md`
2. **Update memory during work** - Document progress and decisions in real-time
3. **Use proper categorization** - Place new files in appropriate directories
4. **Cross-reference related work** - Link to relevant documents for context

#### **Memory Bank Best Practices:**
```python
# Example: Reading Memory Bank in agent code
def read_memory_bank_context():
    """Read essential Memory Bank files for context."""
    core_files = [
        "memory-bank/00-core/activeContext.md",
        "memory-bank/00-core/progress.md",
        "memory-bank/00-core/systemPatterns.md"
    ]

    context = {}
    for file_path in core_files:
        with open(file_path, 'r') as f:
            context[file_path] = f.read()

    return context
```

#### **Documentation Update Triggers:**
- After major system changes or decisions
- Before and after agent handoffs
- When completing project phases or milestones
- After successful testing or deployment
- When resolving critical issues or blockers

## 🚀 Development Setup

### Prerequisites
- **Python 3.11+** (Python 3.13 recommended)
- **Poetry** for dependency management
- **Google Cloud SDK** with appropriate permissions
- **Git** for version control

### Environment Setup

```bash
# Clone repository
git clone https://github.com/NickB03/vana.git
cd vana

# Install dependencies
poetry install

# Setup pre-commit hooks
poetry run pre-commit install

# Configure environment
cp .env.example .env
# Edit `.env` with your configuration
```

### Development Environment Variables

```bash
# .env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
BRAVE_API_KEY=your-brave-api-key
OPENROUTER_API_KEY=your-openrouter-key  # Optional
VANA_MODEL=gemini-2.0-flash
ENVIRONMENT=local
```

## 🤖 Agent Development

### Creating a New Agent

1. **Define Agent Class**

```python
# lib/_agents/my_new_agent.py
from google.adk.agents import LlmAgent

my_agent = LlmAgent(
    name="my_agent",
    model="gemini-2.0-flash",
    description="🎯 My Custom Agent",
    output_key="my_agent_results",
    instruction="""You are My Custom Agent, specializing in...

    ## Core Expertise:
    - Specific capability 1
    - Specific capability 2

    ## Google ADK Integration:
    - Your results are saved to session state as 'my_agent_results'
    - Work with other agents using established patterns

    Always provide detailed analysis and actionable recommendations.""",
    tools=[
        # Add relevant tools
        adk_read_file, adk_write_file,
        adk_web_search, adk_vector_search
    ]
)
```

2. **Register Agent in Team**

```python
# agents/vana/team.py
# Add to sub_agents list in VANA orchestrator
sub_agents=[
    # ... existing agents
    my_agent
]
```

3. **Create Agent Tool Wrapper**

```python
# lib/_tools/agent_tools.py
def my_agent_tool(context: str) -> str:
    """🎯 My custom agent tool for specific functionality."""
    # Implementation using task manager pattern
    task_id = task_manager.create_task()
    # ... tool implementation
    return f"Task ID: {task_id} - Processing: {context}"

# Create ADK FunctionTool
adk_my_agent_tool = FunctionTool(func=my_agent_tool)
adk_my_agent_tool.name = "my_agent_tool"
```

### Agent Best Practices

#### PLAN/ACT Mode Integration
```python
instruction="""
## PLAN/ACT Mode Integration:
- **PLAN Mode**: Analyze requirements, create detailed plans, assess complexity
- **ACT Mode**: Execute plans, coordinate with other agents, monitor progress
"""
```

#### Cognitive Enhancement Patterns
```python
instruction="""
🚨 CRITICAL COGNITIVE ENHANCEMENT: ALWAYS TRY TOOLS FIRST

## BEHAVIORAL DIRECTIVE: PROACTIVE TOOL USAGE
- **NEVER** say "I cannot help with this" or "I don't have the capability"
- **ALWAYS** attempt to use available tools before declining any request
- **FIRST RESPONSE**: Try relevant tools immediately
"""
```

#### State Sharing Patterns
```python
instruction="""
## Google ADK State Sharing:
- Your results are automatically saved to session state as 'my_agent_results'
- Reference other agents' work via session state keys:
  * 'architecture_analysis' - Architecture decisions
  * 'ui_design' - Interface design plans
  * 'devops_plan' - Infrastructure strategies
"""
```

## 🛠️ Tool Development

### Creating a New Tool

1. **Basic Tool Implementation**

```python
# lib/_tools/my_custom_tools.py
import logging
from google.adk.tools import FunctionTool

logger = logging.getLogger(__name__)

def my_custom_tool(input_param: str) -> str:
    """🔧 My custom tool for specific functionality."""
    try:
        # Tool implementation
        result = f"Processed: {input_param}"
        logger.info(f"Custom tool executed successfully: {input_param}")
        return result
    except Exception as e:
        logger.error(f"Error in custom tool: {e}")
        return f"❌ Error: {str(e)}"

# Create ADK FunctionTool wrapper
adk_my_custom_tool = FunctionTool(func=my_custom_tool)
adk_my_custom_tool.name = "my_custom_tool"
```

2. **Long-Running Tool Implementation**

```python
# lib/_tools/my_long_running_tools.py
from lib._tools.long_running_tools import task_manager, LongRunningTaskStatus

def my_long_running_tool(context: str) -> str:
    """⏳ My long-running tool with progress tracking."""
    try:
        # Create task
        task_id = task_manager.create_task()

        # Initial task setup
        result = {
            "task_id": task_id,
            "status": "in_progress",
            "context": context,
            "progress": 0.1,
            "current_stage": "Initializing process",
            "estimated_completion": "2-3 minutes"
        }

        # Update task status
        task_manager.update_task(
            task_id, LongRunningTaskStatus.IN_PROGRESS,
            result=result, progress=0.1,
            metadata={"current_stage": "Initializing process"}
        )

        return f"""⏳ Long-Running Process Started:

**Task ID**: {task_id}
**Context**: {context}
**Status**: Processing in progress
**Progress**: 10%

Use `check_task_status("{task_id}")` to monitor progress."""

    except Exception as e:
        logger.error(f"Error starting long-running tool: {e}")
        return f"❌ Error: {str(e)}"
```

3. **Register Tool**

```python
# lib/_tools/__init__.py
from .my_custom_tools import adk_my_custom_tool
from .my_long_running_tools import adk_my_long_running_tool

# Export for use in agents
__all__ = [
    # ... existing tools
    'adk_my_custom_tool',
    'adk_my_long_running_tool'
]
```

### Tool Design Patterns

#### Task-Based Implementation
- **Always use task manager** for trackable operations
- **Provide progress updates** for long-running tasks
- **Handle errors gracefully** with meaningful messages
- **Return task IDs** for monitoring

#### Security Considerations
- **Validate all inputs** to prevent injection attacks
- **Use path validation** for file operations
- **Implement rate limiting** for external API calls
- **Log security events** for audit trails

## 🧪 Testing

VANA includes a comprehensive **AI Agent Testing Framework** specifically designed for testing AI agent intelligence, behavior consistency, and Google ADK compliance.

### 🎯 AI Agent Testing Framework

The framework provides specialized testing capabilities for AI agents:

#### **Framework Components**
- **`AgentIntelligenceValidator`** - Tests reasoning consistency, tool selection intelligence, and context utilization
- **`ResponseQualityAnalyzer`** - Analyzes accuracy, completeness, relevance, and clarity with HITL support
- **`TestDataManager`** - Data-driven testing with external scenario files
- **`AgentTestClient`** - Standardized agent interaction interface for testing

#### **Using the Framework**

```python
# tests/framework/test_agent_intelligence.py
import asyncio
from tests.framework import AgentIntelligenceValidator, create_test_agent_client

async def test_agent_reasoning():
    """Test agent reasoning consistency."""
    client = await create_test_agent_client('vana')
    validator = AgentIntelligenceValidator(client)

    result = await validator.validate_reasoning_consistency()
    assert result.passed
    assert result.score >= 0.8

async def test_tool_selection():
    """Test intelligent tool selection."""
    client = await create_test_agent_client('vana')
    validator = AgentIntelligenceValidator(client)

    result = await validator.validate_tool_selection_intelligence()
    assert result.passed
    assert result.score >= 0.85
```

#### **Response Quality Analysis**

```python
# tests/framework/test_response_quality.py
from tests.framework import ResponseQualityAnalyzer

def test_response_quality():
    """Test response quality analysis."""
    analyzer = ResponseQualityAnalyzer()

    response = "The weather in New York is 75°F with partly cloudy skies."
    query = "What's the weather in New York?"

    quality = analyzer.analyze_response_quality(response, query)
    assert quality.accuracy >= 0.8
    assert quality.completeness >= 0.8
    assert quality.relevance >= 0.8
```

### Traditional Testing

#### **Unit Testing**

```python
# tests/unit/test_my_agent.py
import pytest
from agents.vana.team import my_agent

def test_my_agent_creation():
    """Test agent is properly configured."""
    assert my_agent.name == "my_agent"
    assert my_agent.description == "🎯 My Custom Agent"
    assert "my_agent_results" in my_agent.output_key

def test_my_agent_tools():
    """Test agent has required tools."""
    tool_names = [tool.name for tool in my_agent.tools]
    assert "read_file" in tool_names
    assert "web_search" in tool_names
```

#### **Integration Testing**

```python
# tests/integration/test_my_agent_integration.py
import pytest
from lib._tools.my_custom_tools import my_custom_tool

def test_tool_integration():
    """Test tool integration works correctly."""
    result = my_custom_tool("test input")
    assert "Processed: test input" in result
    assert not result.startswith("❌")
```

### Running Tests

```bash
# Run all tests
poetry run pytest

# AI Agent Testing Framework
poetry run pytest tests/framework/

# Test categories with markers
poetry run pytest -m unit          # Unit tests
poetry run pytest -m agent         # Agent intelligence tests
poetry run pytest -m integration   # Integration tests
poetry run pytest -m e2e           # End-to-end tests
poetry run pytest -m security      # Security tests
poetry run pytest -m performance   # Performance tests

# Run with coverage
poetry run pytest --cov=agents --cov=lib --cov=tools

# Comprehensive test runner
python tests/run_comprehensive_tests.py

# Run specific test file
poetry run pytest tests/test_my_agent.py -v
```

### ✅ Framework Status

- **Validation Complete** - All framework components tested and working
- **VANA Integration** - Successfully connects to deployed VANA system
- **Google ADK Compliance** - Proper endpoint integration and session management
- **Ready for Implementation** - Framework validated and ready for comprehensive test suite development

## 🔄 Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/my-new-feature

# Make changes
# ... development work ...

# Run tests
poetry run pytest

# Run linting
poetry run pre-commit run --all-files

# Commit changes
git add .
git commit -m "feat: add my new feature"
```

### 2. Code Quality

```bash
# Format code
poetry run black .
poetry run isort .

# Lint code
poetry run pylint agents/ lib/
poetry run mypy agents/ lib/

# Security check
poetry run bandit -r agents/ lib/
```

### 3. Documentation

```bash
# Update documentation
# Edit relevant .md files in docs/

# Test documentation links
# Verify all cross-references work

# Update API documentation if needed
# Update docs/guides/api-reference.md
```

## 🚀 Deployment

### Local Development

```bash
# Start development server
poetry run python main.py

# Server runs on http://localhost:8080
# Web interface available for testing
```

### Production Deployment

```bash
# Deploy to Google Cloud Run
./deployment/deploy.sh production

# Monitor deployment
gcloud run services describe vana --region=us-central1
```

### Environment-Specific Configuration

```python
# lib/environment.py handles automatic detection
def setup_environment():
    """Smart environment detection and configuration."""
    if os.getenv("GOOGLE_CLOUD_PROJECT"):
        # Cloud Run environment
        return configure_cloud_environment()
    else:
        # Local development
        return configure_local_environment()
```

## 📊 Monitoring & Debugging

### Logging

```python
# Use structured logging
import logging
logger = logging.getLogger(__name__)

# Log levels
logger.debug("Debug information")
logger.info("General information")
logger.warning("Warning message")
logger.error("Error occurred")
logger.critical("Critical error")
```

### Performance Monitoring

```python
# Monitor tool performance
from lib._tools.comprehensive_tool_listing import validate_tool_functionality

results = validate_tool_functionality()
print(f"Tool success rate: {results['success_rate']}")
```

### Health Checks

```bash
# Check system health
curl http://localhost:8080/health

# Get detailed system info
curl http://localhost:8080/info
```

## 🤝 Contributing Guidelines

### Code Standards
- **Follow PEP 8** for Python code style
- **Use type hints** for function parameters and returns
- **Write docstrings** for all public functions and classes
- **Add tests** for new functionality

### Commit Messages
```
feat: add new agent capability
fix: resolve tool import issue
docs: update API documentation
test: add integration tests
refactor: improve code organization
```

### Pull Request Process
1. **Create feature branch** from main
2. **Implement changes** with tests
3. **Update documentation** as needed
4. **Run full test suite** and linting
5. **Submit pull request** with clear description

## 🔧 Advanced Topics

### Custom Model Providers

```python
# lib/model_providers/my_provider.py
from lib.model_providers.adk_openrouter_wrapper import create_llm_agent

def create_custom_model_agent(name, instruction, tools):
    """Create agent with custom model provider."""
    return create_llm_agent(
        name=name,
        model="custom-model-name",
        instruction=instruction,
        tools=tools
    )
```

### MCP Server Integration

```python
# lib/mcp_server/my_mcp_server.py
from lib.mcp_server.sse_transport import MCPSSETransport

class MyMCPServer:
    """Custom MCP server implementation."""

    def __init__(self):
        self.transport = MCPSSETransport(self)

    async def handle_request(self, request):
        """Handle MCP requests."""
        # Implementation
        pass
```

### Performance Optimization

```python
# Use lazy initialization for heavy imports
from lib._shared_libraries.lazy_initialization import lazy_manager

@lazy_manager.lazy_init
def expensive_import():
    """Lazy import of expensive modules."""
    import heavy_module
    return heavy_module
```

---

**📚 Additional Resources:**
- [Agent Architecture](../architecture/agents.md) - Detailed agent documentation
- [Tool Architecture](../architecture/tools.md) - Complete tool reference
- [API Reference](api-reference.md) - Full API documentation
- [Troubleshooting](../troubleshooting/common-issues.md) - Common issues and solutions

# ⚡ Quick Start Guide

Get VANA up and running in 5 minutes with this streamlined setup guide.

## 🎯 Prerequisites Check

Before starting, ensure you have:
- ✅ **Python 3.11+** installed
- ✅ **Git** installed
- ✅ **Google Cloud Project** with billing enabled

## 🚀 5-Minute Setup

### 1️⃣ Clone & Install (2 minutes)

```bash
# Clone repository
git clone https://github.com/NickB03/vana.git
cd vana

# Install Poetry (if needed)
curl -sSL https://install.python-poetry.org | python3 -

# Install dependencies
poetry install
```

### 2️⃣ Configure Environment (2 minutes)

```bash
# Copy environment template
cp .env.example .env

# Edit with your settings
nano .env
```

**Minimal Configuration:**
```bash
# Required for basic functionality
GOOGLE_CLOUD_PROJECT=your-project-id
VANA_MODEL=gemini-2.0-flash
ENVIRONMENT=local

# Optional but recommended
BRAVE_API_KEY=your-brave-api-key
```

### 3️⃣ Start VANA (1 minute)

```bash
# Start the server
poetry run python main.py

# Server starts on http://localhost:8080
```

## 🧪 Test Your Installation

### Health Check

```bash
# In a new terminal, test the health endpoint
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy","agent":"vana","mcp_enabled":true}
```

### Web Interface

1. **Open Browser**: Navigate to `http://localhost:8080`
2. **Test Chat**: Try asking "Hello, what can you help me with?"
3. **Verify Response**: VANA should respond with its capabilities

## 🎯 First Interactions

### Basic Commands

Try these commands in the web interface:

```
# Test basic functionality
"Use adk_echo to test the system"

# Test file operations
"Use adk_list_directory to show current directory contents"

# Test search capabilities
"Use adk_web_search to find latest AI news"

# Test system health
"Use adk_get_health_status to check system status"
```

### Code Execution Example

```
# Test code execution capabilities
"Execute this Python code: print('Hello from VANA!')"

# Test data science capabilities
"Create a simple data analysis example with sample data"
```

### File Operations Example

```
# Test file reading
"Use adk_read_file to read README.md"

# Test file existence check
"Use adk_file_exists to check if config.json exists"
```

## 🔧 Essential Tools Overview (19 Core Tools)

### 📁 File System Tools (4)
- `adk_read_file` - Secure file reading with validation
- `adk_write_file` - File creation and modification with permissions
- `adk_list_directory` - Directory exploration and listing
- `adk_file_exists` - File existence checking

### 🔍 Search Tools (3)
- `adk_vector_search` - Semantic similarity search via Vertex AI
- `adk_web_search` - Real-time web search with Brave API
- `adk_search_knowledge` - RAG corpus knowledge search

### ⚙️ System Tools (2)
- `adk_echo` - System testing and validation
- `adk_get_health_status` - Real-time system health monitoring

### 🤝 Agent Coordination Tools (4)
- `adk_coordinate_task` - Multi-agent task coordination
- `adk_delegate_to_agent` - Direct agent delegation
- `adk_get_agent_status` - Agent discovery and status
- `adk_transfer_to_agent` - Agent transfer capabilities

### 📊 Task Analysis Tools (3)
- `adk_analyze_task` - NLP-based task analysis
- `adk_match_capabilities` - Agent-task capability matching
- `adk_classify_task` - Task classification and routing

### ⚡ Workflow Management Tools (8)
- `adk_create_workflow` - Create multi-step workflows
- `adk_start_workflow` - Initiate workflow execution
- `adk_get_workflow_status` - Monitor workflow progress
- `adk_list_workflows` - List active and completed workflows
- `adk_pause_workflow` - Pause workflow execution
- `adk_resume_workflow` - Resume paused workflows
- `adk_cancel_workflow` - Cancel workflow execution
- `adk_get_workflow_templates` - Access workflow templates

## 📊 Monitoring & Status

### System Health

```bash
# Check system status
curl http://localhost:8080/info

# View comprehensive tool listing
# (Use web interface or API call)
```

### Task Tracking

```bash
# All specialist tools create trackable tasks
# Use check_task_status with the returned task ID
check_task_status "your-task-id"
```

## 🎨 Web Interface Features

### Chat Interface
- **Real-time responses** from VANA orchestrator
- **Tool execution** with progress tracking
- **Multi-agent coordination** behind the scenes

### Agent Selection
- **Automatic routing** to appropriate specialists
- **Manual agent selection** when needed
- **Seamless handoffs** between agents

## 🔄 Common Workflows

### 1. Data Analysis Workflow

```
1. "Use adk_read_file to load the dataset"
2. "Delegate to Data Science agent for analysis"
3. "Use adk_vector_search to find related research"
4. "Use adk_write_file to save results"
```

### 2. Code Development Workflow

```
1. "Use adk_read_file to examine existing code"
2. "Delegate to Code Execution agent for implementation"
3. "Use adk_echo to test functionality"
4. "Use adk_write_file to save the new code"
```

### 3. Multi-Step Research Workflow

```
1. "Use adk_web_search for external information"
2. "Use adk_search_knowledge for internal documentation"
3. "Use adk_coordinate_task to organize findings"
4. "Use adk_create_workflow for complex analysis"
```

## 🚨 Quick Troubleshooting

### Server Won't Start

```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
poetry install --no-cache

# Check for port conflicts
lsof -i :8080
```

### Import Errors

```bash
# Recreate Poetry environment
poetry env remove python
poetry install
```

### Authentication Issues

```bash
# Set up Google Cloud authentication
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

## 📚 Next Steps

Now that VANA is running:

1. **[User Guide](../guides/user-guide.md)** - Learn about available agents and tools
2. **[Configuration Guide](configuration.md)** - Advanced configuration options
3. **[API Reference](../guides/api-reference.md)** - Complete API documentation
4. **[Examples](../guides/examples/)** - Working code examples

## 🎯 Production Deployment

Ready for production? See:
- **[Cloud Deployment Guide](../deployment/cloud-deployment.md)**
- **[Production Configuration](configuration.md#production-settings)**

## 🆘 Need Help?

- **Documentation**: [Documentation Index](../README.md)
- **Troubleshooting**: [Common Issues](../troubleshooting/common-issues.md)
- **GitHub Issues**: [Report Problems](https://github.com/NickB03/vana/issues)

---

**🎉 Congratulations!** VANA is now running and ready to assist with your multi-agent AI workflows.

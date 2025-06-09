# ⚡ Quick Start Guide

Get VANA up and running in 5 minutes with this streamlined setup guide.

## 🎯 Prerequisites Check

Before starting, ensure you have:
- ✅ **Python 3.13+** installed
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
cp .env.local.example .env.local

# Edit with your settings
nano .env.local
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
echo "Hello VANA"

# Test file operations
list_directory "."

# Test search capabilities
web_search "latest AI news"

# Test agent coordination
architecture_tool "design a simple web API"
```

### Travel Planning Example

```
# Test travel orchestration
hotel_search_tool "Find hotels in Paris for 2 nights"

# Check task status (use the task ID from above)
check_task_status "task-id-from-hotel-search"
```

### Development Example

```
# Test development capabilities
code_generation_tool "Create a Python function to calculate fibonacci numbers"

# Test documentation
documentation_tool "Document the fibonacci function"
```

## 🔧 Essential Tools Overview

### 📁 File Operations
- `read_file` - Read file contents
- `write_file` - Create/modify files
- `list_directory` - Browse directories

### 🔍 Search & Research
- `web_search` - Real-time web search
- `vector_search` - Semantic search
- `web_research_tool` - Comprehensive research

### 🤖 Agent Coordination
- `architecture_tool` - System design
- `ui_tool` - Interface design
- `devops_tool` - Infrastructure planning
- `qa_tool` - Testing strategy

### ✈️ Travel Planning
- `hotel_search_tool` - Hotel discovery
- `flight_search_tool` - Flight search
- `itinerary_planning_tool` - Trip planning

### 💻 Development
- `code_generation_tool` - Code creation
- `testing_tool` - Quality assurance
- `documentation_tool` - Technical writing
- `security_tool` - Security analysis

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

### 1. Research Workflow

```
1. web_research_tool "research topic"
2. data_analysis_tool "analyze the research data"
3. competitive_intelligence_tool "market analysis"
4. generate_report "comprehensive research report"
```

### 2. Development Workflow

```
1. architecture_tool "system requirements"
2. code_generation_tool "implement the design"
3. testing_tool "create test suite"
4. security_tool "security analysis"
5. documentation_tool "create documentation"
```

### 3. Travel Planning Workflow

```
1. hotel_search_tool "accommodation requirements"
2. flight_search_tool "flight preferences"
3. itinerary_planning_tool "complete trip plan"
4. payment_processing_tool "booking confirmation"
```

## 🚨 Quick Troubleshooting

### Server Won't Start

```bash
# Check Python version
python --version  # Should be 3.13+

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

1. **[User Guide](../guides/user-guide.md)** - Learn all 24 agents and 59 tools
2. **[Configuration Guide](configuration.md)** - Advanced configuration options
3. **[API Reference](../guides/api-reference.md)** - Complete API documentation
4. **[Examples](../guides/examples/)** - Working code examples

## 🎯 Production Deployment

Ready for production? See:
- **[Cloud Deployment Guide](../deployment/cloud-deployment.md)**
- **[Production Configuration](configuration.md#production-settings)**

## 🆘 Need Help?

- **Documentation**: [docs/](../)
- **Troubleshooting**: [Common Issues](../troubleshooting/common-issues.md)
- **GitHub Issues**: [Report Problems](https://github.com/NickB03/vana/issues)

---

**🎉 Congratulations!** VANA is now running and ready to assist with your multi-agent AI workflows.

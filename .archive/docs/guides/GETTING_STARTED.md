# Getting Started with VANA Agentic AI

Welcome to VANA! This guide will help you set up and start using the hierarchical multi-agent AI system that intelligently routes tasks to specialized agents.

## 🆕 What's New in Phase 1

- **Hierarchical Agent System**: 5-level architecture with intelligent routing
- **Active Specialists**: Architecture, DevOps, QA, UI/UX, and Data Science agents
- **Smart Task Routing**: Automatic complexity analysis and agent selection
- **Production Ready**: Circuit breakers and performance optimization

## Prerequisites

Before you begin, ensure you have:

- **Python 3.13+** (Required for modern async patterns and Google ADK)
- **Poetry** for dependency management
- **Git** for version control
- **Google Cloud API Key** for Gemini models

### Check Your Python Version

```bash
python3 --version
# Must show Python 3.13.x or higher
```

If you need to install Python 3.13, visit [python.org](https://www.python.org/downloads/).

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/vana.git
cd vana
```

### 2. Install Dependencies

```bash
# Install Poetry if you haven't already
curl -sSL https://install.python-poetry.org | python3 -

# Install project dependencies
poetry install
```

### 3. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment file
nano .env  # or your preferred editor
```

Add your Google API key:
```env
GOOGLE_API_KEY=your_google_api_key_here
VITE_API_KEY=your_api_key_for_frontend
```

### 4. Start the Agentic Backend

```bash
# Activate the virtual environment
poetry shell

# Start the VANA Agentic AI backend
python main_agentic.py
```

You should see:
```
🚀 Starting VANA Agentic AI Server...
📊 Phase 1: Hierarchical Agent System Active
✅ Root Agent: VANA_Chat
✅ Orchestrator: HierarchicalTaskManager
✅ Specialists: 5
INFO:     Uvicorn running on http://localhost:8081
```

## Your First Requests

### Health Check

Verify the agentic system is running:

```bash
curl http://localhost:8081/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "2.0.0-alpha",
  "agent_system": "hierarchical",
  "phase": "1",
  "features": [
    "VANA Chat Agent",
    "Master Orchestrator",
    "5 Active Specialists",
    "Task Complexity Analysis",
    "Intelligent Routing"
  ]
}
```

### Test Agent Routing

#### Simple Conversation (stays with VANA Chat):
```bash
curl -X POST http://localhost:8081/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello, how are you?", "session_id": "test-001"}'
```

#### Technical Task (routed to specialist):
```bash
curl -X POST http://localhost:8081/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Design a REST API for user authentication", "session_id": "test-002"}'
```

Response:
```json
{
  "result": {
    "output": "The current UTC time is 2025-07-10 16:30:45...",
    "id": "session_uuid"
  }
}
```

### Complex Task

Try a more complex task that demonstrates agent coordination:

```bash
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Create a Python script that reads a CSV file and generates a bar chart"}'
```

## Understanding the Response

VANA responses follow this structure:

```json
{
  "result": {
    "output": "Detailed response from the agents",
    "id": "unique_session_identifier"
  }
}
```

- **output**: The main response content
- **id**: Unique session ID for tracking

## Development Setup

### Frontend Development

If you want to work with the UI:

```bash
cd vana-ui
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Running Tests

```bash
# Run unit tests
poetry run pytest tests/unit -v

# Run integration tests
poetry run pytest tests/integration -v

# Run all tests
poetry run pytest -v
```

### Code Quality Tools

```bash
# Format code
poetry run black .

# Sort imports
poetry run isort .

# Run linters
poetry run flake8
poetry run mypy .
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Google Gemini API key | Required |
| `VITE_API_KEY` | Frontend API key | Optional |
| `BACKEND_PORT` | Backend server port | 8081 |
| `LOG_LEVEL` | Logging level | INFO |

### Advanced Configuration

For production deployments, consider:

1. **Database Configuration**: Set up persistent storage
2. **Security Settings**: Configure authentication
3. **Performance Tuning**: Adjust worker processes
4. **Monitoring**: Set up logging and metrics

## Common Use Cases

### File Operations

```bash
# Create and read files
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Create a file called hello.txt with the content Hello, VANA!"}'
```

### Data Analysis

```bash
# Analyze data patterns
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Analyze the sales trends in the data and provide insights"}'
```

### Web Research

```bash
# Search for information
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Search for the latest developments in artificial intelligence"}'
```

### Code Generation

```bash
# Generate code
curl -X POST http://localhost:8081/run \
  -H "Content-Type: application/json" \
  -d '{"input": "Write a Python function to calculate fibonacci numbers"}'
```

## Troubleshooting

### Common Issues

#### Backend Won't Start
- Check Python version (must be 3.13+)
- Verify all dependencies are installed
- Ensure port 8081 is available

#### API Key Errors
- Verify your Google API key is valid
- Check the `.env` file format
- Ensure the key has necessary permissions

#### Import Errors
- Run `poetry install` again
- Check for conflicting Python environments
- Verify virtual environment is activated

### Getting Help

1. **Check the logs**: Backend logs provide detailed error information
2. **Review documentation**: See `/docs` for detailed guides
3. **Run diagnostics**: Use built-in health checks
4. **Community support**: Join our Discord server

### Debug Mode

Enable debug mode for development:

```bash
# Set environment variable
export LOG_LEVEL=DEBUG

# Or modify .env file
echo "LOG_LEVEL=DEBUG" >> .env
```

## Next Steps

Now that you have VANA running:

1. **Explore the API**: Try different types of tasks
2. **Read the Architecture**: Understand how VANA works
3. **Check the Examples**: See practical use cases
4. **Join the Community**: Connect with other developers
5. **Contribute**: Help improve VANA

### Recommended Reading

- [Architecture Overview](ARCHITECTURE.md)
- [API Reference](API_REFERENCE.md)
- [Agent Development Guide](AGENT_DEVELOPMENT.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

---

**Congratulations!** You're now ready to harness the power of VANA's multi-agent AI system. Happy coding! 🚀
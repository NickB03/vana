# Local Development Setup

## Prerequisites

### Required Software
- **Python 3.13+** (VANA requires Python 3.13 for optimal performance)
- **Poetry** (for dependency management)
- **Docker** (for sandbox features and containerized services)
- **Git** (for version control)
- **Google Cloud CLI** (for cloud service integration)

### System Requirements
- **Memory**: Minimum 8GB RAM (16GB recommended for full sandbox features)
- **Storage**: At least 10GB free space for dependencies and containers
- **Network**: Internet connection for package downloads and cloud services

## Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/NickB03/vana.git
cd vana
```

### 2. Checkout Development Branch
```bash
# Use the latest development branch with critical fixes
git checkout feature/dependency-optimization-and-setup-fixes
git pull origin feature/dependency-optimization-and-setup-fixes
```

### 3. Install Python 3.13
**On macOS (using Homebrew):**
```bash
brew install python@3.13
```

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.13 python3.13-venv python3.13-dev
```

**On Windows:**
Download Python 3.13 from [python.org](https://www.python.org/downloads/) and install.

### 4. Install Poetry
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

Add Poetry to your PATH:
```bash
export PATH="$HOME/.local/bin:$PATH"
```

### 5. Install Dependencies
```bash
# Install all dependencies including development tools
poetry install

# Verify installation
poetry run python --version
```

### 6. Environment Configuration
Create your local environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```bash
# VANA Environment Configuration
VANA_ENV=development
VANA_PORT=8080
VANA_HOST=localhost

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account.json
GOOGLE_GENAI_USE_VERTEXAI=false

# API Keys (for local development)
OPENAI_API_KEY=your-openai-key
BRAVE_API_KEY=your-brave-search-key

# Memory and Vector Search
VECTOR_SEARCH_ENDPOINT=your-vector-search-endpoint
RAG_CORPUS_RESOURCE_NAME=your-rag-corpus-name

# Security Settings
VANA_SECRET_KEY=your-secret-key-here
ENABLE_SANDBOX=true
SANDBOX_TIMEOUT=30
```

### 7. Docker Setup (Optional but Recommended)
Install Docker for sandbox features:

**On macOS:**
```bash
brew install --cask docker
```

**On Ubuntu:**
```bash
sudo apt install docker.io docker-compose
sudo usermod -aG docker $USER
```

Start Docker and verify:
```bash
docker --version
docker run hello-world
```

### 8. Google Cloud Setup
Install and configure Google Cloud CLI:
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project your-project-id
```

## Running the Development Server

### 1. Start VANA Server
```bash
# Activate Poetry environment and start server
poetry run python main.py
```

### 2. Verify Installation
Open another terminal and test the health endpoint:
```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "agent": "vana",
  "mcp_enabled": true,
  "timestamp": "2025-06-12T15:30:00Z"
}
```

### 3. Test Agent Discovery
```bash
curl http://localhost:8080/list-apps
```

Expected response:
```json
{
  "agents": [
    {"name": "vana", "description": "Main orchestration agent"},
    {"name": "code_execution", "description": "Secure code execution specialist"},
    {"name": "data_science", "description": "Data analysis and ML specialist"},
    {"name": "memory", "description": "Memory management agent"}
  ]
}
```

## Development Workflow

### Running Tests
```bash
# Run all tests
poetry run pytest

# Run specific test categories
poetry run pytest tests/unit/          # Unit tests
poetry run pytest tests/integration/   # Integration tests
poetry run pytest -m performance       # Performance tests

# Run with coverage
poetry run pytest --cov=lib --cov-report=html
```

### Code Quality Checks
```bash
# Linting
poetry run flake8 .

# Type checking
poetry run mypy .

# Security scanning
poetry run bandit -r .

# Format code
poetry run black .
poetry run isort .
```

### Environment Validation
Run the comprehensive environment validation:
```bash
poetry run python validate_vana_setup.py
```

This will check:
- Python version compatibility
- All required dependencies
- Environment variable configuration
- Google Cloud authentication
- Docker availability
- Service connectivity

## Troubleshooting

### Common Issues

#### 1. Import Errors
**Problem**: `ModuleNotFoundError` or import hanging issues
**Solution**:
```bash
# Ensure all dependencies are installed
poetry install --no-dev

# Check Python path
poetry run python -c "import sys; print(sys.path)"

# Verify critical imports
poetry run python -c "from lib._tools import adk_tools; print('Import successful')"
```

#### 2. Port Conflicts
**Problem**: Port 8080 already in use
**Solution**:
```bash
# Change port in .env.local
echo "VANA_PORT=8081" >> .env.local

# Or kill existing process
lsof -ti:8080 | xargs kill -9
```

#### 3. Memory Issues
**Problem**: Application crashes with memory errors
**Solution**:
```bash
# Increase Docker memory allocation (Docker Desktop)
# Settings > Resources > Memory > 8GB+

# Monitor memory usage
poetry run python -c "
import psutil
print(f'Available memory: {psutil.virtual_memory().available / 1024**3:.1f} GB')
"
```

#### 4. Permission Errors
**Problem**: Docker permission denied or file access issues
**Solution**:
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Fix file permissions
chmod +x scripts/*.sh
chmod 600 .env.local
```

#### 5. Google Cloud Authentication
**Problem**: Authentication or project access errors
**Solution**:
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Verify project access
gcloud projects list
gcloud config set project your-project-id

# Test Vertex AI access
gcloud ai models list --region=us-central1
```

#### 6. Dependency Conflicts
**Problem**: Poetry dependency resolution errors
**Solution**:
```bash
# Clear Poetry cache
poetry cache clear --all pypi

# Force reinstall
poetry install --no-cache

# Update lock file
poetry lock --no-update
```

### Performance Optimization

#### 1. Enable Development Mode
```bash
# Add to .env.local for faster startup
VANA_DEBUG=true
VANA_LOG_LEVEL=INFO
DISABLE_TELEMETRY=true
```

#### 2. Optimize Memory Usage
```bash
# Reduce memory footprint for development
SANDBOX_MEMORY_LIMIT=256MB
VECTOR_SEARCH_CACHE_SIZE=100MB
MAX_CONCURRENT_AGENTS=5
```

#### 3. Speed Up Tests
```bash
# Run tests in parallel
poetry run pytest -n auto

# Skip slow tests during development
poetry run pytest -m "not slow"

# Use test database
export VANA_TEST_MODE=true
```

### Development Tools

#### 1. VS Code Configuration
Create `.vscode/settings.json`:
```json
{
    "python.defaultInterpreterPath": ".venv/bin/python",
    "python.linting.enabled": true,
    "python.linting.flake8Enabled": true,
    "python.formatting.provider": "black",
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": ["tests/"]
}
```

#### 2. Debug Configuration
Create `.vscode/launch.json`:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "VANA Server",
            "type": "python",
            "request": "launch",
            "program": "main.py",
            "env": {
                "VANA_ENV": "development",
                "VANA_DEBUG": "true"
            },
            "console": "integratedTerminal"
        }
    ]
}
```

#### 3. Git Hooks
Set up pre-commit hooks:
```bash
# Install pre-commit
poetry add --group dev pre-commit

# Install hooks
poetry run pre-commit install

# Run manually
poetry run pre-commit run --all-files
```

### Next Steps
Once your local environment is set up:

1. **Explore the codebase**: Start with `main.py` and `agents/vana/`
2. **Run example workflows**: Check `scripts/` for example usage
3. **Read the architecture docs**: Understand the system design
4. **Contribute**: Follow the contribution guidelines in `CONTRIBUTING.md`
5. **Deploy to cloud**: Follow the Cloud Run deployment guide

For additional help, check the troubleshooting guide or open an issue on GitHub.

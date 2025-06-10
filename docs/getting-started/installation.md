# 🚀 Installation Guide

Complete installation guide for VANA Multi-Agent AI System.

## 📋 Prerequisites

### 🐍 Python Requirements
- **Python 3.13+** (officially supported and recommended)
- **Poetry** for dependency management
- **Git** for version control

### ☁️ Google Cloud Requirements
- **Google Cloud SDK** installed and configured
- **Google Cloud Project** with billing enabled
- **Vertex AI API** enabled
- **Cloud Run API** enabled (for deployment)

### 🔑 API Keys Required
- **Google Cloud Service Account** with appropriate permissions
- **Brave Search API Key** (for web search functionality)
- **OpenRouter API Key** (optional, for external model providers)

## 🛠️ Installation Steps

### 1️⃣ Clone Repository

```bash
# Clone the VANA repository
git clone https://github.com/NickB03/vana.git
cd vana

# Verify you're in the correct directory
ls -la
# Should see: main.py, pyproject.toml, agents/, lib/, docs/
```

### 2️⃣ Install Poetry (if not already installed)

```bash
# Install Poetry using the official installer
curl -sSL https://install.python-poetry.org | python3 -

# Add Poetry to your PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"

# Verify installation
poetry --version
```

### 3️⃣ Install Dependencies

```bash
# Install all dependencies using Poetry
poetry install

# Verify installation
poetry show | grep google-adk
# Should show Google ADK and related packages
```

### 4️⃣ Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment configuration
nano .env  # or use your preferred editor
```

#### Required Environment Variables

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# API Keys
BRAVE_API_KEY=your-brave-search-api-key
OPENROUTER_API_KEY=your-openrouter-key  # Optional

# Model Configuration
VANA_MODEL=gemini-2.0-flash  # Default model
ENVIRONMENT=local

# Vector Search Configuration
VECTOR_SEARCH_ENDPOINT=your-vertex-ai-endpoint
VECTOR_SEARCH_INDEX_ID=your-index-id
```

### 5️⃣ Google Cloud Setup

#### Create Service Account

```bash
# Create service account
gcloud iam service-accounts create vana-service-account \
    --description="VANA Multi-Agent System" \
    --display-name="VANA Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:vana-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:vana-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create secrets/vana-service-account.json \
    --iam-account=vana-service-account@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### Enable Required APIs

```bash
# Enable necessary Google Cloud APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable storage.googleapis.com
```

### 6️⃣ Verify Installation

```bash
# Test basic functionality
poetry run python -c "
import sys
sys.path.insert(0, '.')
from agents.vana import agent
print('✅ VANA agent imported successfully')
print(f'✅ Agent name: {agent.name}')
"

# Test environment configuration
poetry run python -c "
from lib.environment import setup_environment
env_type = setup_environment()
print(f'✅ Environment configured: {env_type}')
"
```

## 🧪 Testing Installation

### Run Health Check

```bash
# Start VANA locally
poetry run python main.py &

# Wait a moment for startup, then test
sleep 5

# Test health endpoint
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy","agent":"vana","mcp_enabled":true}

# Stop the server
pkill -f "python main.py"
```

### Test Agent Functionality

```bash
# Run comprehensive tool validation
poetry run python -c "
from lib._tools.comprehensive_tool_listing import validate_tool_functionality
results = validate_tool_functionality()
print(f'Tests run: {results[\"tests_run\"]}')
print(f'Tests passed: {results[\"tests_passed\"]}')
print(f'Success rate: {results[\"success_rate\"]}')
"
```

## 🔧 Development Setup

### Pre-commit Hooks

```bash
# Install pre-commit hooks for code quality
poetry run pre-commit install

# Test pre-commit hooks
poetry run pre-commit run --all-files
```

### IDE Configuration

#### VS Code Settings

Create `.vscode/settings.json`:

```json
{
    "python.defaultInterpreterPath": ".venv/bin/python",
    "python.linting.enabled": true,
    "python.linting.pylintEnabled": true,
    "python.formatting.provider": "black",
    "python.sortImports.args": ["--profile", "black"]
}
```

## 🚨 Troubleshooting

### Common Issues

#### Poetry Installation Issues

```bash
# If Poetry installation fails
pip install --user poetry

# If dependencies conflict
poetry lock --no-update
poetry install
```

#### Google Cloud Authentication

```bash
# If authentication fails
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID

# Verify authentication
gcloud auth list
```

#### Import Hanging Issues

```bash
# If imports hang (Python 3.13 compatibility)
poetry env remove python
poetry install
```

### Environment Validation

```bash
# Comprehensive environment check
poetry run python scripts/validate_environment.py
```

## 📚 Next Steps

After successful installation:

1. **[Quick Start Guide](quick-start.md)** - Get VANA running in 5 minutes
2. **[Configuration Guide](configuration.md)** - Advanced configuration options
3. **[User Guide](../guides/user-guide.md)** - Learn to use VANA effectively
4. **[Developer Guide](../guides/developer-guide.md)** - Contribute to VANA development

## 🆘 Getting Help

- **Documentation**: [Documentation Index](../README.md)
- **Issues**: [GitHub Issues](https://github.com/NickB03/vana/issues)
- **Troubleshooting**: [Common Issues](../troubleshooting/common-issues.md)

---

**🎯 Installation Complete!** You're ready to start using VANA's powerful multi-agent capabilities.

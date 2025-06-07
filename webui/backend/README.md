# VANA FastAPI Backend Configuration

This directory contains a clean, robust FastAPI backend configuration system designed specifically for the VANA project. It integrates seamlessly with VANA's existing environment detection and follows FastAPI best practices.

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
# From the project root (pydantic-settings is already added to pyproject.toml)
poetry install
```

### Step 2: Test Configuration

```bash
# Test that configuration loads correctly with actual API keys
poetry run python webui/backend/test_config.py
```

### Step 3: Run the Server

```bash
# From the webui/backend directory
poetry run python main.py

# Or using uvicorn directly
poetry run uvicorn webui.backend.main:app --reload --host 0.0.0.0 --port 8000
```

### ✅ Configuration Status

The configuration is **already loaded with actual API keys** from your production environment:

- **Google Cloud Project**: `analystai-454200` ✅
- **Brave API Key**: `BSA6fMCYrfJC5seE-AVsWrKjpOFk6Nm` ✅
- **OpenRouter API Key**: `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` ✅
- **RAG Corpus**: `projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus` ✅
- **Vector Search**: Ready for configuration ✅

## 📁 File Structure

```
webui/backend/
├── config.py          # Main configuration module
├── main.py            # Example FastAPI application
├── .env.example       # Environment variables template
└── README.md          # This file
```

## ⚙️ Configuration Features

### 🔧 Smart Environment Detection

The configuration automatically detects your environment:

- **Production**: Cloud Run (detects `K_SERVICE` environment variable)
- **Development**: Local machine

### 📄 Environment File Loading

Follows VANA's existing patterns:

- `.env.production` - Production deployment
- `.env.local` - Local development  
- `.env` - Fallback for backward compatibility

### 🎛️ Feature Flags

Built-in feature flags for easy toggling:

```python
from config import is_feature_enabled

if is_feature_enabled("workflow"):
    # Enable workflow features
    pass
```

### 🔐 Security Validation

Automatic validation of required settings:

- Google API credentials
- Production security keys
- Required environment variables

## 🛠️ Usage in Your Code

### Basic Usage

```python
from config import settings

# Access configuration values
api_key = settings.google_api_key
project_id = settings.google_cloud_project
```

### FastAPI Integration

```python
from fastapi import FastAPI, Depends
from config import settings, VanaBackendSettings

app = FastAPI(title=settings.vana_brand_name)

def get_settings() -> VanaBackendSettings:
    return settings

@app.get("/info")
async def info(config: VanaBackendSettings = Depends(get_settings)):
    return {"app_name": config.vana_brand_name}
```

### Feature Checking

```python
from config import is_feature_enabled

# Check if MCP is enabled
if is_feature_enabled("mcp"):
    # Initialize MCP features
    pass
```

## 🔧 Environment Variables

### Required Variables

```bash
# Google API (choose one)
GOOGLE_API_KEY=your_api_key_here
# OR
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Google Cloud Project
GOOGLE_CLOUD_PROJECT=your-project-id
```

### Optional Variables

See `.env.example` for a complete list of available configuration options.

## 🧪 Testing Configuration

The configuration includes built-in validation:

```python
from config import settings

# Validate all required settings
try:
    settings.validate_required_settings()
    print("✅ Configuration is valid")
except RuntimeError as e:
    print(f"❌ Configuration error: {e}")
```

## 🔄 Integration with Existing VANA

This configuration system is designed to work alongside VANA's existing configuration:

- **Integrates** with `lib/environment.py`
- **Respects** existing `.env.local` and `.env.production` files
- **Follows** VANA's Google Cloud authentication patterns
- **Compatible** with existing ADK integration

## 🤖 AI Agent Friendly

The configuration is designed to be easily extended by AI agents:

### Adding New Configuration

```python
# In config.py, add to VanaBackendSettings class:
new_feature_enabled: bool = get_env_var("NEW_FEATURE_ENABLED", default="false").lower() == "true"
```

### Adding New Environment Variables

```bash
# In .env.example, add:
NEW_FEATURE_ENABLED=true
NEW_FEATURE_API_URL=http://localhost:9000
```

## 📊 Available Endpoints

When running the example `main.py`:

- `GET /` - Basic app information
- `GET /health` - Health check with feature status
- `GET /config` - Public configuration (non-sensitive)
- `GET /vana/status` - VANA-specific status
- `GET /features/{feature_name}` - Check specific feature

## 🔍 Troubleshooting

### Configuration Warnings

If you see configuration warnings on startup:

1. Check your `.env.local` file exists
2. Verify required environment variables are set
3. Ensure Google API credentials are configured

### Missing Environment Variables

```bash
# Check what environment variables are loaded
python -c "from config import settings; print(settings.model_dump())"
```

### Production Deployment

For production deployment:

1. Create `.env.production` with production values
2. Set secure `SESSION_SECRET` and `JWT_SECRET_KEY`
3. Configure proper `GOOGLE_APPLICATION_CREDENTIALS`

## 🔗 Integration Examples

### With Existing VANA Main

```python
# In your existing main.py
from webui.backend.config import settings

# Use VANA configuration
app = FastAPI(
    title=settings.vana_brand_name,
    debug=settings.debug_mode
)
```

### With Dashboard

```python
# In dashboard code
from webui.backend.config import settings

dashboard_config = {
    "api_url": settings.vana_service_url,
    "features": {
        "mcp": settings.vana_feature_mcp_enabled
    }
}
```

## 📝 Notes for AI Agents

When updating this configuration:

1. **Always** update both `config.py` and `.env.example`
2. **Match** variable names between the two files
3. **Use** `get_env_var()` helper for consistency
4. **Add** validation for critical settings
5. **Document** new features in this README

## 🎯 Next Steps

1. Customize environment variables for your needs
2. Add any VANA-specific configuration options
3. Integrate with your existing FastAPI routes
4. Set up production environment variables
5. Test configuration validation

---

**Ready to use!** This configuration system provides a solid foundation for your VANA FastAPI backend while maintaining compatibility with the existing project structure.

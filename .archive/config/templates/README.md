# VANA Environment Configuration Templates

This directory contains environment configuration templates for different deployment scenarios and the ADK memory migration.

## 📁 Template Files

### Core Environment Templates
- **`.env.development`** - Development environment with ADK memory configuration
- **`.env.production`** - Production environment with optimized ADK memory settings
- **`.env.test`** - Test environment with mock services and ADK memory testing
- **`.env.adk-memory`** - ADK-specific memory configuration reference

### Legacy Templates
- **`credentials.json.template`** - Google Cloud service account template

## 🚀 Quick Start

### For Development
```bash
# Copy development template
cp config/templates/.env.development .env

# Edit with your specific values
nano .env
```

### For Production
```bash
# Copy production template
cp config/templates/.env.production .env

# Update with production credentials and settings
nano .env
```

### For Testing
```bash
# Copy test template
cp config/templates/.env.test .env.test

# Used automatically when VANA_ENV=test
```

## 🔧 ADK Memory Migration

### Migration Steps
1. **Backup Current Configuration**:
   ```bash
   cp .env .env.backup
   ```

2. **Add ADK Memory Variables**:
   ```bash
   # Copy ADK memory configuration
   cat config/templates/.env.adk-memory >> .env
   ```

3. **Remove MCP Variables**:
   ```bash
   # Remove deprecated MCP configuration
   sed -i '/MCP_/d' .env
   sed -i '/KNOWLEDGE_GRAPH_/d' .env
   ```

### Required ADK Variables
```bash
RAG_CORPUS_RESOURCE_NAME="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
MEMORY_SIMILARITY_TOP_K="5"
MEMORY_VECTOR_DISTANCE_THRESHOLD="0.7"
SESSION_SERVICE_TYPE="vertex_ai"
```

## 📊 Environment Comparison

| Setting | Development | Production | Test |
|---------|-------------|------------|------|
| **Memory Top K** | 5 | 10 | 3 |
| **Distance Threshold** | 0.7 | 0.8 | 0.6 |
| **Cache Size** | 1000 | 2000 | 100 |
| **Cache TTL** | 3600s | 7200s | 300s |
| **Log Level** | DEBUG | INFO | DEBUG |
| **Mock Services** | Optional | Disabled | Enabled |
| **Auto Fallback** | Enabled | Disabled | Enabled |

## 🔍 Configuration Validation

### Validate Environment Setup
```bash
# Test configuration loading
python -c "
from config.environment import EnvironmentConfig
import os

# Load environment
from dotenv import load_dotenv
load_dotenv()

# Test ADK memory config
try:
    config = EnvironmentConfig.get_adk_memory_config()
    print('✅ ADK Memory Config:', config)
except Exception as e:
    print('❌ ADK Memory Config Error:', e)

# Test environment detection
print('Environment:', os.environ.get('VANA_ENV', 'development'))
print('Is Development:', EnvironmentConfig.is_development())
print('Is Production:', EnvironmentConfig.is_production())
print('Is Test:', EnvironmentConfig.is_test())
"
```

### Check Required Variables
```bash
# Verify ADK memory variables
python -c "
import os
from dotenv import load_dotenv
load_dotenv()

required_vars = [
    'GOOGLE_CLOUD_PROJECT',
    'GOOGLE_CLOUD_LOCATION',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'RAG_CORPUS_RESOURCE_NAME',
    'MEMORY_SIMILARITY_TOP_K',
    'MEMORY_VECTOR_DISTANCE_THRESHOLD',
    'SESSION_SERVICE_TYPE'
]

missing = []
for var in required_vars:
    if not os.environ.get(var):
        missing.append(var)

if missing:
    print('❌ Missing variables:', missing)
else:
    print('✅ All required variables set')
"
```

## 🚨 Security Notes

### Development Environment
- Use development service account with limited permissions
- Enable debug logging for troubleshooting
- Allow mock services for offline development

### Production Environment
- Use production service account with minimal required permissions
- Disable debug logging and development features
- Enable comprehensive monitoring and alerting
- Use production-grade RAG corpus and vector search endpoints

### Test Environment
- Use separate test project or isolated test resources
- Enable mock services for unit testing
- Auto-cleanup test data to prevent resource accumulation
- Use shorter timeouts for faster test execution

## 📚 Related Documentation

- **Migration Guide**: `docs/ADK_MEMORY_CONFIGURATION_MIGRATION_GUIDE.md`
- **System Patterns**: `memory-bank/systemPatterns.md`
- **Tech Context**: `memory-bank/techContext.md`
- **Implementation Plan**: `HANDOFF_ADK_MEMORY_MIGRATION.md`

## 🔧 Troubleshooting

### Common Issues

1. **Missing RAG Corpus**:
   ```bash
   # Create RAG corpus in Vertex AI
   gcloud ai rag-corpora create --display-name="vana-corpus" --region=us-central1
   ```

2. **Authentication Errors**:
   ```bash
   # Verify service account
   gcloud auth activate-service-account --key-file=./secrets/service-account-key.json
   ```

3. **Invalid Configuration**:
   ```bash
   # Test configuration loading
   python -c "from config.environment import EnvironmentConfig; print(EnvironmentConfig.get_adk_memory_config())"
   ```

### Support Commands
```bash
# Check Google Cloud setup
gcloud config list
gcloud auth list

# Test Vertex AI access
gcloud ai endpoints list --region=us-central1

# Verify ADK installation
python -c "import google.adk; print('ADK installed successfully')"
```

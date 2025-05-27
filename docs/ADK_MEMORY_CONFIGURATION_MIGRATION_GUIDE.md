# ADK Memory Configuration Migration Guide

**Date:** 2025-01-27  
**Version:** 1.0  
**Migration Phase:** Configuration Updates  

## 📋 Overview

This guide provides step-by-step instructions for migrating VANA's configuration from custom MCP knowledge graph systems to Google ADK native memory systems.

## 🎯 Migration Objectives

- **Remove MCP Dependencies**: Eliminate custom knowledge graph server configuration
- **Add ADK Memory Configuration**: Implement Google ADK VertexAiRagMemoryService settings
- **Maintain Backward Compatibility**: Ensure smooth transition during migration period
- **Optimize Performance**: Configure ADK memory for optimal performance

## 📚 Configuration Files Updated

### Core Configuration Files
- `config/environment.py` - Main configuration management
- `.env.example` - Environment variable template
- `config/templates/.env.development` - Development environment template
- `config/templates/.env.adk-memory` - ADK-specific memory configuration
- `requirements.txt` - Python dependencies

### Deprecated Files
- `config/mcp_memory_config.py` - Will be removed in Phase 3

## 🔧 Required Environment Variables

### New ADK Memory Variables

```bash
# ===== ADK Memory Service Configuration =====
# RAG Corpus Resource Name for ADK Memory Service
RAG_CORPUS_RESOURCE_NAME="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"

# Memory similarity search settings
MEMORY_SIMILARITY_TOP_K="5"
MEMORY_VECTOR_DISTANCE_THRESHOLD="0.7"

# Session service type for ADK
SESSION_SERVICE_TYPE="vertex_ai"
```

### Updated Cache Configuration

```bash
# ===== Memory Cache Configuration =====
# Local cache settings for performance optimization
MEMORY_CACHE_SIZE="1000"
MEMORY_CACHE_TTL="3600"
```

### Deprecated MCP Variables (Remove These)

```bash
# ❌ DEPRECATED - Remove these variables
# MCP_ENDPOINT
# MCP_NAMESPACE  
# MCP_API_KEY
# USE_LOCAL_MCP
# KNOWLEDGE_GRAPH_API_KEY
# KNOWLEDGE_GRAPH_SERVER_URL
# KNOWLEDGE_GRAPH_NAMESPACE
```

## 🚀 Migration Steps

### Step 1: Update Environment Files

1. **Update your `.env` file**:
   ```bash
   # Copy new variables from .env.example
   cp .env.example .env.new
   # Merge your existing credentials with new ADK variables
   ```

2. **Add ADK Memory Configuration**:
   ```bash
   # Add these to your .env file
   RAG_CORPUS_RESOURCE_NAME="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
   MEMORY_SIMILARITY_TOP_K="5"
   MEMORY_VECTOR_DISTANCE_THRESHOLD="0.7"
   SESSION_SERVICE_TYPE="vertex_ai"
   ```

3. **Remove MCP Variables**:
   ```bash
   # Remove or comment out these lines in your .env
   # MCP_ENDPOINT=...
   # MCP_NAMESPACE=...
   # MCP_API_KEY=...
   ```

### Step 2: Update Dependencies

1. **Verify ADK Installation**:
   ```bash
   pip install google-adk[vertexai]>=1.0.0
   ```

2. **Update from requirements.txt**:
   ```bash
   pip install -r requirements.txt
   ```

### Step 3: Verify Configuration

1. **Test Configuration Loading**:
   ```python
   from config.environment import EnvironmentConfig
   
   # Test ADK memory configuration
   adk_config = EnvironmentConfig.get_adk_memory_config()
   print("ADK Memory Config:", adk_config)
   
   # Test updated memory configuration
   memory_config = EnvironmentConfig.get_memory_config()
   print("Memory Config:", memory_config)
   ```

2. **Verify Environment Variables**:
   ```bash
   python -c "
   import os
   from dotenv import load_dotenv
   load_dotenv()
   
   required_vars = [
       'RAG_CORPUS_RESOURCE_NAME',
       'MEMORY_SIMILARITY_TOP_K', 
       'MEMORY_VECTOR_DISTANCE_THRESHOLD',
       'SESSION_SERVICE_TYPE'
   ]
   
   for var in required_vars:
       value = os.environ.get(var)
       print(f'{var}: {value if value else \"NOT SET\"}')"
   ```

## 📊 Configuration Reference

### ADK Memory Service Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `RAG_CORPUS_RESOURCE_NAME` | `projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus` | Full resource name for Vertex AI RAG Corpus |
| `MEMORY_SIMILARITY_TOP_K` | `5` | Number of similar results to return from memory search |
| `MEMORY_VECTOR_DISTANCE_THRESHOLD` | `0.7` | Vector distance threshold for similarity matching (0.0-1.0) |
| `SESSION_SERVICE_TYPE` | `vertex_ai` | Session service backend type |

### Performance Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MEMORY_CACHE_SIZE` | `1000` | Local cache size for performance optimization |
| `MEMORY_CACHE_TTL` | `3600` | Cache time-to-live in seconds |

### Environment-Specific Settings

#### Development Environment
```bash
RAG_CORPUS_RESOURCE_NAME="projects/analystai-454200/locations/us-central1/ragCorpora/vana-dev-corpus"
MEMORY_SIMILARITY_TOP_K="5"
MEMORY_VECTOR_DISTANCE_THRESHOLD="0.7"
SESSION_SERVICE_TYPE="vertex_ai"
```

#### Production Environment
```bash
RAG_CORPUS_RESOURCE_NAME="projects/analystai-454200/locations/us-central1/ragCorpora/vana-prod-corpus"
MEMORY_SIMILARITY_TOP_K="10"
MEMORY_VECTOR_DISTANCE_THRESHOLD="0.8"
SESSION_SERVICE_TYPE="vertex_ai"
```

## 🔍 Troubleshooting

### Common Issues

1. **Missing RAG Corpus**:
   ```bash
   # Error: RAG Corpus not found
   # Solution: Create RAG Corpus in Vertex AI or update resource name
   ```

2. **Authentication Issues**:
   ```bash
   # Error: Permission denied
   # Solution: Verify GOOGLE_APPLICATION_CREDENTIALS and service account permissions
   ```

3. **Invalid Configuration**:
   ```bash
   # Error: Invalid similarity threshold
   # Solution: Ensure MEMORY_VECTOR_DISTANCE_THRESHOLD is between 0.0 and 1.0
   ```

### Validation Commands

```bash
# Test Google Cloud authentication
gcloud auth application-default print-access-token

# Verify project configuration
gcloud config get-value project

# Test Vertex AI access
gcloud ai endpoints list --region=us-central1
```

## 📈 Performance Optimization

### Recommended Settings

#### High Performance (Production)
```bash
MEMORY_SIMILARITY_TOP_K="10"
MEMORY_VECTOR_DISTANCE_THRESHOLD="0.8"
MEMORY_CACHE_SIZE="2000"
MEMORY_CACHE_TTL="7200"
```

#### Balanced (Development)
```bash
MEMORY_SIMILARITY_TOP_K="5"
MEMORY_VECTOR_DISTANCE_THRESHOLD="0.7"
MEMORY_CACHE_SIZE="1000"
MEMORY_CACHE_TTL="3600"
```

#### Memory Optimized (Resource Constrained)
```bash
MEMORY_SIMILARITY_TOP_K="3"
MEMORY_VECTOR_DISTANCE_THRESHOLD="0.6"
MEMORY_CACHE_SIZE="500"
MEMORY_CACHE_TTL="1800"
```

## 🚨 Migration Checklist

### Pre-Migration
- [ ] Backup current `.env` file
- [ ] Review current MCP configuration
- [ ] Verify Google Cloud project access
- [ ] Confirm Vertex AI API enablement

### During Migration
- [ ] Update environment variables
- [ ] Remove MCP configuration
- [ ] Add ADK memory configuration
- [ ] Update dependencies
- [ ] Test configuration loading

### Post-Migration
- [ ] Verify ADK memory service connectivity
- [ ] Test memory operations
- [ ] Monitor performance metrics
- [ ] Update documentation
- [ ] Remove deprecated configuration files

## 📞 Support

### Resources
- **Google ADK Documentation**: Use Context7 with library ID `/google/adk-docs`
- **Vertex AI RAG Documentation**: [Google Cloud Vertex AI RAG](https://cloud.google.com/vertex-ai/docs/rag)
- **VANA Memory Bank**: `memory-bank/systemPatterns.md` for architecture details

### Common Commands
```bash
# Check ADK installation
python -c "import google.adk; print('ADK installed successfully')"

# Test memory configuration
python -c "from config.environment import EnvironmentConfig; print(EnvironmentConfig.get_adk_memory_config())"

# Verify Google Cloud setup
gcloud auth list
gcloud config list
```

---

## 🎯 Next Steps

After completing configuration migration:

1. **Phase 1**: ADK Memory Integration (1-2 weeks)
2. **Phase 2**: Session State Enhancement (1 week)  
3. **Phase 3**: Legacy System Removal (1 week)

Refer to `HANDOFF_ADK_MEMORY_MIGRATION.md` for detailed implementation phases.

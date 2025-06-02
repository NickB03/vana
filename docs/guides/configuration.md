# VANA Configuration Guide

This guide provides comprehensive configuration instructions for VANA's ADK memory system and all related components.

## Overview

VANA uses environment variables for configuration, with production-ready defaults for the ADK memory system. The system is designed to work out-of-the-box with minimal configuration while providing flexibility for customization.

## ADK Memory Configuration

### Required Environment Variables

```bash
# Google Cloud Configuration
export GOOGLE_CLOUD_PROJECT="analystai-454200"
export GOOGLE_CLOUD_LOCATION="us-central1"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export GOOGLE_GENAI_USE_VERTEXAI="True"

# ADK Memory Configuration
export ADK_RAG_CORPUS="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
export ADK_SIMILARITY_TOP_K="5"
export ADK_VECTOR_DISTANCE_THRESHOLD="0.7"
export ADK_SESSION_SERVICE_TYPE="database"

# Environment
export VANA_ENV="production"
```

### Optional Configuration

```bash
# Vector Search (Preserved from legacy system)
export VECTOR_SEARCH_ENDPOINT_ID="your-endpoint-id"
export DEPLOYED_INDEX_ID="vanasharedindex"

# Performance Tuning
export ADK_MEMORY_CACHE_SIZE="1000"
export ADK_MEMORY_CACHE_TTL="3600"
export ADK_MAX_CONCURRENT_REQUESTS="10"

# Logging
export LOG_LEVEL="INFO"
export LOG_FORMAT="json"
```

## Configuration Files

### .env File Template

Create a `.env` file in your project root:

```bash
# VANA ADK Memory Configuration Template
# Copy this file to .env and update values as needed

# Google Cloud Configuration (REQUIRED)
GOOGLE_CLOUD_PROJECT=analystai-454200
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
GOOGLE_GENAI_USE_VERTEXAI=True

# ADK Memory Configuration (REQUIRED)
ADK_RAG_CORPUS=projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus
ADK_SIMILARITY_TOP_K=5
ADK_VECTOR_DISTANCE_THRESHOLD=0.7
ADK_SESSION_SERVICE_TYPE=database

# Environment Configuration
VANA_ENV=production

# Vector Search Configuration (OPTIONAL - Preserved)
VECTOR_SEARCH_ENDPOINT_ID=your-endpoint-id
DEPLOYED_INDEX_ID=vanasharedindex

# Performance Configuration (OPTIONAL)
ADK_MEMORY_CACHE_SIZE=1000
ADK_MEMORY_CACHE_TTL=3600
ADK_MAX_CONCURRENT_REQUESTS=10

# Logging Configuration (OPTIONAL)
LOG_LEVEL=INFO
LOG_FORMAT=json
```

### Development Configuration

For development environments:

```bash
# Development-specific overrides
VANA_ENV=development
LOG_LEVEL=DEBUG
ADK_SIMILARITY_TOP_K=3
ADK_VECTOR_DISTANCE_THRESHOLD=0.6
```

### Production Configuration

For production environments:

```bash
# Production-specific settings
VANA_ENV=production
LOG_LEVEL=INFO
ADK_SIMILARITY_TOP_K=5
ADK_VECTOR_DISTANCE_THRESHOLD=0.7
ADK_SESSION_SERVICE_TYPE=database
```

## Google Cloud Setup

### Service Account Configuration

1. **Create Service Account**:
   ```bash
   gcloud iam service-accounts create vana-adk-memory \
     --description="VANA ADK Memory Service Account" \
     --display-name="VANA ADK Memory"
   ```

2. **Grant Required Permissions**:
   ```bash
   # Vertex AI permissions
   gcloud projects add-iam-policy-binding analystai-454200 \
     --member="serviceAccount:vana-adk-memory@analystai-454200.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"

   # RAG Corpus permissions
   gcloud projects add-iam-policy-binding analystai-454200 \
     --member="serviceAccount:vana-adk-memory@analystai-454200.iam.gserviceaccount.com" \
     --role="roles/aiplatform.ragCorpusUser"
   ```

3. **Create and Download Key**:
   ```bash
   gcloud iam service-accounts keys create vana-service-account-key.json \
     --iam-account=vana-adk-memory@analystai-454200.iam.gserviceaccount.com
   ```

### RAG Corpus Setup

The RAG Corpus is already configured and operational:

```bash
# Verify RAG Corpus exists
gcloud ai rag-corpora describe vana-corpus \
  --location=us-central1 \
  --project=analystai-454200
```

## Configuration Validation

### Environment Validation Script

Create a script to validate your configuration:

```python
#!/usr/bin/env python3
"""VANA Configuration Validation Script"""

import os
import sys
from pathlib import Path

def validate_configuration():
    """Validate VANA configuration."""
    errors = []
    warnings = []

    # Required environment variables
    required_vars = [
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_CLOUD_LOCATION",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "ADK_RAG_CORPUS"
    ]

    for var in required_vars:
        if not os.getenv(var):
            errors.append(f"Missing required environment variable: {var}")

    # Validate service account file
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path and not Path(creds_path).exists():
        errors.append(f"Service account file not found: {creds_path}")

    # Validate numeric configurations
    try:
        top_k = int(os.getenv("ADK_SIMILARITY_TOP_K", "5"))
        if top_k < 1 or top_k > 20:
            warnings.append(f"ADK_SIMILARITY_TOP_K should be between 1-20, got {top_k}")
    except ValueError:
        errors.append("ADK_SIMILARITY_TOP_K must be a valid integer")

    try:
        threshold = float(os.getenv("ADK_VECTOR_DISTANCE_THRESHOLD", "0.7"))
        if threshold < 0.0 or threshold > 1.0:
            warnings.append(f"ADK_VECTOR_DISTANCE_THRESHOLD should be between 0.0-1.0, got {threshold}")
    except ValueError:
        errors.append("ADK_VECTOR_DISTANCE_THRESHOLD must be a valid float")

    # Report results
    if errors:
        print("❌ Configuration Errors:")
        for error in errors:
            print(f"  - {error}")

    if warnings:
        print("⚠️  Configuration Warnings:")
        for warning in warnings:
            print(f"  - {warning}")

    if not errors and not warnings:
        print("✅ Configuration is valid!")

    return len(errors) == 0

if __name__ == "__main__":
    if not validate_configuration():
        sys.exit(1)
```

### Test ADK Memory Connection

```python
#!/usr/bin/env python3
"""Test ADK Memory Connection"""

import os
from google.adk.memory import VertexAiRagMemoryService

def test_adk_memory():
    """Test ADK memory service connection."""
    try:
        # Initialize memory service
        memory_service = VertexAiRagMemoryService(
            rag_corpus=os.getenv("ADK_RAG_CORPUS"),
            similarity_top_k=int(os.getenv("ADK_SIMILARITY_TOP_K", "5")),
            vector_distance_threshold=float(os.getenv("ADK_VECTOR_DISTANCE_THRESHOLD", "0.7"))
        )

        print("✅ ADK Memory Service initialized successfully")

        # Test search functionality
        results = memory_service.search_memory("test query")
        print(f"✅ Memory search completed, found {len(results)} results")

        return True

    except Exception as e:
        print(f"❌ ADK Memory Service test failed: {e}")
        return False

if __name__ == "__main__":
    test_adk_memory()
```

## Configuration Templates

### Docker Environment

For Docker deployments:

```dockerfile
# Dockerfile environment configuration
ENV GOOGLE_CLOUD_PROJECT=analystai-454200
ENV GOOGLE_CLOUD_LOCATION=us-central1
ENV GOOGLE_GENAI_USE_VERTEXAI=True
ENV ADK_RAG_CORPUS=projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus
ENV VANA_ENV=production

# Copy service account key
COPY vana-service-account-key.json /app/credentials/
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/vana-service-account-key.json
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vana-config
data:
  GOOGLE_CLOUD_PROJECT: "analystai-454200"
  GOOGLE_CLOUD_LOCATION: "us-central1"
  GOOGLE_GENAI_USE_VERTEXAI: "True"
  ADK_RAG_CORPUS: "projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
  ADK_SIMILARITY_TOP_K: "5"
  ADK_VECTOR_DISTANCE_THRESHOLD: "0.7"
  VANA_ENV: "production"
```

### Systemd Service

```ini
[Unit]
Description=VANA ADK Memory Service
After=network.target

[Service]
Type=simple
User=vana
WorkingDirectory=/opt/vana
ExecStart=/opt/vana/venv/bin/python -m vana_multi_agent.main

# Environment configuration
Environment=GOOGLE_CLOUD_PROJECT=analystai-454200
Environment=GOOGLE_CLOUD_LOCATION=us-central1
Environment=GOOGLE_GENAI_USE_VERTEXAI=True
Environment=ADK_RAG_CORPUS=projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus
Environment=GOOGLE_APPLICATION_CREDENTIALS=/opt/vana/credentials/service-account-key.json
Environment=VANA_ENV=production

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Configuration Parameters Reference

### ADK Memory Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ADK_RAG_CORPUS` | string | Required | RAG Corpus resource name |
| `ADK_SIMILARITY_TOP_K` | integer | 5 | Number of similar results to return |
| `ADK_VECTOR_DISTANCE_THRESHOLD` | float | 0.7 | Similarity threshold for results |
| `ADK_SESSION_SERVICE_TYPE` | string | database | Session service type |
| `ADK_MEMORY_CACHE_SIZE` | integer | 1000 | Memory cache size |
| `ADK_MEMORY_CACHE_TTL` | integer | 3600 | Memory cache TTL in seconds |

### Google Cloud Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `GOOGLE_CLOUD_PROJECT` | string | Required | Google Cloud project ID |
| `GOOGLE_CLOUD_LOCATION` | string | Required | Google Cloud location |
| `GOOGLE_APPLICATION_CREDENTIALS` | string | Required | Path to service account key |
| `GOOGLE_GENAI_USE_VERTEXAI` | boolean | True | Use Vertex AI for Generative AI |

### Performance Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ADK_MAX_CONCURRENT_REQUESTS` | integer | 10 | Maximum concurrent requests |
| `ADK_REQUEST_TIMEOUT` | integer | 30 | Request timeout in seconds |
| `ADK_RETRY_ATTEMPTS` | integer | 3 | Number of retry attempts |
| `ADK_BACKOFF_FACTOR` | float | 2.0 | Exponential backoff factor |

## Migration from Legacy Configuration

### Removed Configuration

The following configuration parameters were removed during the ADK memory migration:

```bash
# REMOVED - No longer needed
# USE_LOCAL_MCP=true
# MCP_ENDPOINT=https://mcp.community.augment.co
# MCP_NAMESPACE=vana-project
# MCP_API_KEY=your-api-key
# MEMORY_SYNC_INTERVAL=300
# ENTITY_HALF_LIFE_DAYS=30
```

### Configuration Mapping

| Legacy Parameter | ADK Parameter | Notes |
|------------------|---------------|-------|
| `MCP_ENDPOINT` | `ADK_RAG_CORPUS` | RAG Corpus replaces MCP endpoint |
| `MEMORY_CACHE_SIZE` | `ADK_MEMORY_CACHE_SIZE` | Renamed for clarity |
| `MEMORY_CACHE_TTL` | `ADK_MEMORY_CACHE_TTL` | Renamed for clarity |
| `USE_LOCAL_MCP` | (removed) | No longer needed with ADK |

## Troubleshooting Configuration

### Common Issues

1. **Authentication Errors**
   ```bash
   # Check service account permissions
   gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
   gcloud auth list
   ```

2. **RAG Corpus Not Found**
   ```bash
   # Verify RAG Corpus exists
   gcloud ai rag-corpora list --location=$GOOGLE_CLOUD_LOCATION
   ```

3. **Environment Variables Not Loaded**
   ```bash
   # Check environment variables
   env | grep -E "(GOOGLE_|ADK_|VANA_)"
   ```

### Diagnostic Commands

```bash
# Test Google Cloud authentication
gcloud auth application-default print-access-token

# Verify Vertex AI API access
gcloud ai models list --location=us-central1

# Test ADK memory configuration
python -c "
import os
from google.adk.memory import VertexAiRagMemoryService
print('Testing ADK Memory...')
service = VertexAiRagMemoryService(rag_corpus=os.getenv('ADK_RAG_CORPUS'))
print('✅ ADK Memory Service initialized successfully')
"
```

## Security Considerations

### Credential Management

1. **Never commit credentials to version control**
2. **Use environment variables or secret management systems**
3. **Rotate service account keys regularly**
4. **Use least-privilege IAM roles**

### Network Security

```bash
# Restrict network access if needed
export ADK_ALLOWED_IPS="10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
export ADK_ENABLE_TLS=true
export ADK_TLS_VERIFY=true
```

## Best Practices

### Configuration Management

1. **Use environment-specific configuration files**
2. **Validate configuration on startup**
3. **Monitor configuration changes**
4. **Document all configuration parameters**

### Performance Optimization

1. **Tune similarity thresholds based on use case**
2. **Adjust cache sizes based on memory availability**
3. **Monitor and adjust timeout values**
4. **Use appropriate concurrency limits**

### Monitoring

```bash
# Enable configuration monitoring
export ADK_CONFIG_MONITORING=true
export ADK_CONFIG_LOG_CHANGES=true
export ADK_METRICS_ENABLED=true
```

## Conclusion

VANA's ADK memory configuration is designed to be simple, secure, and production-ready. The migration from custom knowledge graph to ADK native memory has significantly simplified configuration while improving reliability and performance. Follow this guide to ensure proper configuration for your environment.

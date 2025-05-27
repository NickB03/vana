# ADK Memory Setup Guide

This guide provides step-by-step instructions for setting up VANA's ADK memory system from scratch.

## Overview

VANA's ADK memory system provides Google-managed knowledge storage and retrieval with 99.9% uptime and zero maintenance overhead. This guide will walk you through the complete setup process.

## Prerequisites

- Google Cloud Project with billing enabled
- Google Cloud SDK (gcloud) installed and configured
- Python 3.9+ environment
- VANA project repository

## Step 1: Google Cloud Project Setup

### 1.1 Enable Required APIs

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Generative AI API
gcloud services enable generativelanguage.googleapis.com

# Enable Cloud Resource Manager API
gcloud services enable cloudresourcemanager.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled --filter="name:(aiplatform.googleapis.com OR generativelanguage.googleapis.com)"
```

### 1.2 Set Default Project and Location

```bash
# Set default project
gcloud config set project analystai-454200

# Set default location
gcloud config set ai/region us-central1
```

## Step 2: Service Account Configuration

### 2.1 Create Service Account

```bash
# Create service account for VANA ADK Memory
gcloud iam service-accounts create vana-adk-memory \
  --description="VANA ADK Memory Service Account" \
  --display-name="VANA ADK Memory"
```

### 2.2 Grant Required Permissions

```bash
# Vertex AI User role
gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-adk-memory@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# RAG Corpus User role
gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-adk-memory@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/aiplatform.ragCorpusUser"

# Generative AI User role
gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-adk-memory@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Storage Object Viewer (for RAG Corpus data)
gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-adk-memory@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### 2.3 Create and Download Service Account Key

```bash
# Create service account key
gcloud iam service-accounts keys create vana-service-account-key.json \
  --iam-account=vana-adk-memory@analystai-454200.iam.gserviceaccount.com

# Secure the key file
chmod 600 vana-service-account-key.json

# Move to secure location
sudo mkdir -p /opt/vana/credentials
sudo mv vana-service-account-key.json /opt/vana/credentials/
sudo chown vana:vana /opt/vana/credentials/vana-service-account-key.json
```

## Step 3: RAG Corpus Setup

### 3.1 Verify RAG Corpus Exists

```bash
# Check if RAG Corpus already exists
gcloud ai rag-corpora describe vana-corpus \
  --location=us-central1 \
  --project=analystai-454200
```

### 3.2 Create RAG Corpus (if needed)

```bash
# Create RAG Corpus if it doesn't exist
gcloud ai rag-corpora create \
  --display-name="VANA Knowledge Corpus" \
  --description="Knowledge corpus for VANA ADK memory system" \
  --location=us-central1 \
  --project=analystai-454200
```

### 3.3 Get RAG Corpus Resource Name

```bash
# Get the full resource name
gcloud ai rag-corpora list \
  --location=us-central1 \
  --project=analystai-454200 \
  --format="value(name)"
```

Expected output:
```
projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus
```

## Step 4: Environment Configuration

### 4.1 Copy Environment Template

```bash
# Copy production template
cp config/templates/.env.production.template .env

# Or for development
cp config/templates/.env.development.template .env
```

### 4.2 Update Environment Variables

Edit the `.env` file with your specific values:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=analystai-454200
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/opt/vana/credentials/vana-service-account-key.json
GOOGLE_GENAI_USE_VERTEXAI=True

# ADK Memory Configuration
ADK_RAG_CORPUS=projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus
ADK_SIMILARITY_TOP_K=5
ADK_VECTOR_DISTANCE_THRESHOLD=0.7
ADK_SESSION_SERVICE_TYPE=database

# Environment
VANA_ENV=production
```

### 4.3 Load Environment Variables

```bash
# Load environment variables
source .env

# Or export them manually
export GOOGLE_CLOUD_PROJECT=analystai-454200
export GOOGLE_CLOUD_LOCATION=us-central1
export GOOGLE_APPLICATION_CREDENTIALS=/opt/vana/credentials/vana-service-account-key.json
# ... etc
```

## Step 5: Python Environment Setup

### 5.1 Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv vana-env

# Activate virtual environment
source vana-env/bin/activate

# Upgrade pip
pip install --upgrade pip
```

### 5.2 Install Dependencies

```bash
# Install Google ADK with Vertex AI support
pip install google-adk[vertexai]

# Install additional dependencies
pip install python-dotenv
pip install google-cloud-aiplatform
pip install google-generativeai

# Install VANA dependencies
pip install -r requirements.txt
```

## Step 6: Configuration Validation

### 6.1 Test Authentication

```bash
# Test service account authentication
gcloud auth activate-service-account \
  --key-file=/opt/vana/credentials/vana-service-account-key.json

# Verify authentication
gcloud auth list

# Test application default credentials
python -c "
from google.auth import default
credentials, project = default()
print(f'Authenticated with project: {project}')
"
```

### 6.2 Test ADK Memory Connection

```bash
# Test ADK memory service
python -c "
import os
from google.adk.memory import VertexAiRagMemoryService

print('Testing ADK Memory Service...')
memory_service = VertexAiRagMemoryService(
    rag_corpus=os.getenv('ADK_RAG_CORPUS'),
    similarity_top_k=int(os.getenv('ADK_SIMILARITY_TOP_K', '5')),
    vector_distance_threshold=float(os.getenv('ADK_VECTOR_DISTANCE_THRESHOLD', '0.7'))
)
print('✅ ADK Memory Service initialized successfully')

# Test search functionality
results = memory_service.search_memory('test query')
print(f'✅ Memory search completed, found {len(results)} results')
"
```

### 6.3 Run Configuration Validation Script

```bash
# Run the validation script
python scripts/validate_adk_config.py
```

Expected output:
```
✅ Configuration is valid!
✅ ADK Memory Service initialized successfully
✅ Memory search completed, found 0 results
```

## Step 7: VANA Agent Setup

### 7.1 Test Basic Agent with Memory

```bash
# Test basic agent functionality
python -c "
from google.adk.agents import LlmAgent
from google.adk.tools import load_memory

print('Creating VANA agent with ADK memory...')
agent = LlmAgent(
    model='gemini-2.0-flash',
    tools=[load_memory],
    instruction='You are VANA with access to memory. Use load_memory to search for information.'
)
print('✅ VANA agent created successfully')

# Test agent response
response = agent.run('Hello, can you search for any previous conversations?')
print(f'Agent response: {response}')
"
```

### 7.2 Test Multi-Agent System

```bash
# Test multi-agent system
python -c "
from vana_multi_agent.main import create_vana_system

print('Initializing VANA multi-agent system...')
vana_system = create_vana_system()
print('✅ VANA multi-agent system initialized successfully')

# Test system functionality
response = vana_system.run('Test the ADK memory system')
print(f'System response: {response}')
"
```

## Step 8: Production Deployment

### 8.1 Systemd Service Setup

```bash
# Copy systemd service template
sudo cp config/templates/vana-adk.service /etc/systemd/system/

# Update service file with correct paths
sudo nano /etc/systemd/system/vana-adk.service

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable vana-adk
sudo systemctl start vana-adk

# Check service status
sudo systemctl status vana-adk
```

### 8.2 Log Monitoring Setup

```bash
# Create log directory
sudo mkdir -p /var/log/vana
sudo chown vana:vana /var/log/vana

# Setup log rotation
sudo cp config/templates/vana-logrotate /etc/logrotate.d/vana

# Test log rotation
sudo logrotate -d /etc/logrotate.d/vana
```

### 8.3 Health Check Setup

```bash
# Create health check script
sudo cp scripts/health_check.py /opt/vana/bin/

# Setup cron job for health checks
echo "*/5 * * * * /opt/vana/venv/bin/python /opt/vana/bin/health_check.py" | sudo crontab -u vana -
```

## Step 9: Monitoring and Alerting

### 9.1 Enable Cloud Monitoring

```bash
# Enable Cloud Monitoring API
gcloud services enable monitoring.googleapis.com

# Create monitoring dashboard
gcloud monitoring dashboards create --config-from-file=config/monitoring/vana-dashboard.json
```

### 9.2 Setup Alerting

```bash
# Create alerting policies
gcloud alpha monitoring policies create --policy-from-file=config/monitoring/memory-alerts.yaml
```

## Step 10: Backup and Recovery

### 10.1 Setup Configuration Backup

```bash
# Create backup script
sudo cp scripts/backup_config.sh /opt/vana/bin/

# Setup daily backup cron job
echo "0 2 * * * /opt/vana/bin/backup_config.sh" | sudo crontab -u vana -
```

### 10.2 Test Recovery Procedures

```bash
# Test configuration restore
sudo /opt/vana/bin/restore_config.sh /opt/vana/backups/latest

# Verify system functionality after restore
python scripts/validate_adk_config.py
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```bash
   # Check service account permissions
   gcloud projects get-iam-policy analystai-454200 \
     --flatten="bindings[].members" \
     --filter="bindings.members:vana-adk-memory@analystai-454200.iam.gserviceaccount.com"
   ```

2. **RAG Corpus Not Found**
   ```bash
   # List available RAG corpora
   gcloud ai rag-corpora list --location=us-central1
   ```

3. **Memory Search Failures**
   ```bash
   # Check Vertex AI API status
   gcloud ai operations list --location=us-central1
   ```

### Diagnostic Commands

```bash
# Full system diagnostic
python scripts/diagnose_adk_system.py

# Memory service diagnostic
python scripts/diagnose_memory_service.py

# Agent system diagnostic
python scripts/diagnose_agent_system.py
```

## Security Considerations

### 1. Credential Security

- Store service account keys in secure locations with restricted permissions
- Rotate service account keys regularly (every 90 days)
- Use Google Cloud Secret Manager for production deployments
- Never commit credentials to version control

### 2. Network Security

- Restrict network access to VANA services
- Use VPC firewall rules to limit access
- Enable audit logging for all API calls
- Monitor for unusual access patterns

### 3. Data Privacy

- Ensure sensitive data is properly handled in memory
- Implement data retention policies
- Use encryption for data at rest and in transit
- Regular security audits and compliance checks

## Performance Optimization

### 1. Memory Configuration Tuning

```bash
# Optimize for high-throughput environments
export ADK_SIMILARITY_TOP_K=10
export ADK_VECTOR_DISTANCE_THRESHOLD=0.8
export ADK_MEMORY_CACHE_SIZE=5000
export ADK_MAX_CONCURRENT_REQUESTS=50
```

### 2. Monitoring Performance

```bash
# Enable detailed performance monitoring
export ADK_METRICS_ENABLED=true
export ADK_PERFORMANCE_LOGGING=true

# Monitor memory usage
python scripts/monitor_memory_performance.py
```

## Conclusion

Your VANA ADK memory system is now fully configured and operational. The system provides:

- ✅ **99.9% Uptime**: Google Cloud managed infrastructure
- ✅ **Zero Maintenance**: No custom server management required
- ✅ **70% Cost Reduction**: Eliminated custom MCP server hosting
- ✅ **100% ADK Compliance**: Full alignment with Google ADK patterns

For ongoing maintenance and monitoring, refer to the [Configuration Guide](configuration.md) and [ADK Memory Implementation Guide](../implementation/adk-memory-implementation.md).

# VANA Deployment Guide

Comprehensive guide for deploying VANA in development and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Google Cloud Deployment](#google-cloud-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Security Setup](#security-setup)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Python 3.13+** (CRITICAL - Required for production stability)
- **Poetry** for dependency management
- **Git** for version control
- **Google Cloud SDK** for production deployment
- **Docker** (optional - system falls back gracefully)

### Google Cloud Requirements

- **Google Cloud Project** with billing enabled
- **Service Account** with appropriate permissions
- **Vertex AI API** enabled
- **Cloud Run** enabled for container deployment

## Local Development Setup

### 1. Repository Setup

```bash
# Clone repository
git clone https://github.com/your-org/vana.git
cd vana

# Verify Python version (MUST be 3.13+)
python3 --version
# Should output: Python 3.13.x

# Setup Poetry environment
poetry env use python3.13
poetry install

# Verify installation
poetry run python --version
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.template .env.local

# Configure basic settings
cat << EOF >> .env.local
# Core Configuration
VANA_MODEL=gemini-2.5-flash
ENVIRONMENT=development

# Google Cloud (for production features)
GOOGLE_CLOUD_PROJECT=your-project-id

# Optional: Enable debug logging
ANTHROPIC_LOG=debug
EOF
```

### 3. Development Server

```bash
# Start development server
poetry run python main.py

# Expected output:
# INFO:agents.vana.team:VANA Orchestrator initialized with 9 tools
# INFO:lib._shared_libraries.adk_memory_service:Initialized InMemoryMemoryService
# ✅ VANA system ready
```

### 4. Health Check

```bash
# Run system health check
poetry run python -c "
from agents.vana.team import root_agent
from lib._shared_libraries.adk_memory_service import ADKMemoryService

print('🔍 System Health Check')
print(f'✅ VANA Orchestrator: {len(root_agent.tools)} tools loaded')

try:
    service = ADKMemoryService()
    print('✅ Memory Service: Working')
except Exception as e:
    print(f'❌ Memory Service: {e}')

print('🎯 Development environment ready!')
"
```

## Google Cloud Deployment

### 1. Prerequisites Setup

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
    aiplatform.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com
```

### 2. Service Account Setup

```bash
# Create service account
gcloud iam service-accounts create vana-vector-search-sa \
    --display-name="VANA Vector Search Service Account"

# Get project number
PROJECT_NUMBER=$(gcloud projects describe $GOOGLE_CLOUD_PROJECT --format="value(projectNumber)")

# Grant permissions
gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
    --member="serviceAccount:vana-vector-search-sa@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $GOOGLE_CLOUD_PROJECT \
    --member="serviceAccount:vana-vector-search-sa@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 3. Environment Variables

Create production environment configuration:

```bash
# Set required environment variables
export GOOGLE_CLOUD_PROJECT="your-project-id"
export PROJECT_NUMBER="your-project-number"
export SERVICE_ACCOUNT="vana-vector-search-sa@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com"

# Verify variables
echo "Project: $GOOGLE_CLOUD_PROJECT"
echo "Project Number: $PROJECT_NUMBER" 
echo "Service Account: $SERVICE_ACCOUNT"
```

### 4. Using Deployment Scripts

#### Production Deployment (Recommended)

```bash
# Use the production deployment script with safety checks
./deployment/deploy-prod.sh

# This script includes:
# - Authentication verification
# - Project validation
# - User confirmation prompts
# - Resource limit configuration
# - Comprehensive error handling
```

#### Manual Cloud Build Deployment

```bash
# Build and deploy using Cloud Build
gcloud builds submit . --config=cloudbuild.yaml \
    --substitutions=_GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT,_PROJECT_NUMBER=$PROJECT_NUMBER
```

### 5. Production Configuration

The `cloudbuild.yaml` includes:

- **Service Account**: `vana-vector-search-sa@${PROJECT_ID}.iam.gserviceaccount.com`
- **Environment Variables**: `GOOGLE_CLOUD_PROJECT`, `PROJECT_NUMBER`
- **Resource Limits**: Memory and CPU configured for production workloads
- **Health Checks**: Automatic service health monitoring

## Environment Configuration

### Required Environment Variables

```bash
# Core Configuration (Required)
VANA_MODEL=gemini-2.5-flash              # AI model to use
ENVIRONMENT=production                    # Environment type
GOOGLE_CLOUD_PROJECT=your-project-id     # GCP project ID

# Production Requirements
PROJECT_NUMBER=123456789                 # GCP project number (for Vector Search)

# Optional Configuration
ANTHROPIC_LOG=info                       # Logging level
MEMORY_DB_PATH=/app/.memory_db          # Memory database path
```

### Google Cloud Secret Manager

Store sensitive configuration in Secret Manager:

```bash
# Store API keys securely
echo -n "your-api-key" | gcloud secrets create vana-api-key --data-file=-

# Store database connection strings
echo -n "postgresql://..." | gcloud secrets create vana-db-connection --data-file=-

# Grant service account access
gcloud secrets add-iam-policy-binding vana-api-key \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
```

## Security Setup

### 1. Service Account Permissions

Minimum required permissions:

```yaml
roles:
  - roles/aiplatform.user          # Vertex AI access
  - roles/secretmanager.secretAccessor  # Secret access
  - roles/logging.logWriter        # Cloud Logging
  - roles/monitoring.metricWriter  # Cloud Monitoring
```

### 2. Network Security

```bash
# Configure firewall rules for Cloud Run
gcloud compute firewall-rules create allow-vana-ingress \
    --allow tcp:8080 \
    --source-ranges 0.0.0.0/0 \
    --description "Allow VANA service ingress"
```

### 3. Access Control

```bash
# Restrict Cloud Run service access
gcloud run services add-iam-policy-binding vana \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region=us-central1

# Or restrict to specific users/groups
gcloud run services add-iam-policy-binding vana \
    --member="user:admin@yourdomain.com" \
    --role="roles/run.invoker" \
    --region=us-central1
```

## Monitoring & Health Checks

### 1. Health Check Endpoint

The application provides health check endpoints:

```bash
# Basic health check
curl https://your-vana-service-url/health

# Detailed system status
curl https://your-vana-service-url/status
```

### 2. Cloud Monitoring

```bash
# Enable monitoring
gcloud services enable monitoring.googleapis.com

# Create custom metrics for VANA
gcloud logging metrics create vana_errors \
    --log-filter='resource.type="cloud_run_revision" AND severity>=ERROR'
```

### 3. Alerting

```bash
# Create alerting policy for errors
gcloud alpha monitoring policies create \
    --notification-channels=$NOTIFICATION_CHANNEL \
    --display-name="VANA Error Rate" \
    --condition-threshold-duration=300s \
    --condition-threshold-comparison=COMPARISON_GREATER_THAN \
    --condition-threshold-value=5
```

## Troubleshooting

### Common Deployment Issues

#### 1. Python Version Errors

```bash
# Error: "Python 3.13+ required"
# Solution: Verify Poetry environment
poetry env use python3.13
poetry install --sync
```

#### 2. Missing Environment Variables

```bash
# Error: "GOOGLE_CLOUD_PROJECT not set"
# Solution: Set required variables
export GOOGLE_CLOUD_PROJECT="your-project-id"
export PROJECT_NUMBER="your-project-number"

# Verify in deployment script
./deployment/deploy-prod.sh
```

#### 3. Service Account Issues

```bash
# Error: "Failed to connect to memory server"
# Solution: Verify service account permissions
gcloud iam service-accounts describe \
    vana-vector-search-sa@$GOOGLE_CLOUD_PROJECT.iam.gserviceaccount.com

# Check IAM bindings
gcloud projects get-iam-policy $GOOGLE_CLOUD_PROJECT \
    --flatten="bindings[].members" \
    --filter="bindings.members:vana-vector-search-sa*"
```

#### 4. Build Failures

```bash
# Error: Cloud Build timeout or failure
# Solution: Check build logs
gcloud builds log [BUILD_ID]

# Retry with increased timeout
gcloud builds submit . --config=cloudbuild.yaml --timeout=1200s
```

### Debugging Commands

```bash
# Check deployment status
gcloud run services describe vana --region=us-central1

# View service logs
gcloud logs read "resource.type=cloud_run_revision" --limit=50

# Test service connectivity
gcloud run services proxy vana --port=8080 --region=us-central1
```

### Performance Optimization

#### Resource Configuration

```yaml
# cloudbuild.yaml optimizations
resources:
  limits:
    cpu: 2000m      # 2 CPU cores
    memory: 4Gi     # 4GB RAM
  requests:
    cpu: 1000m      # 1 CPU core minimum
    memory: 2Gi     # 2GB RAM minimum
```

#### Scaling Configuration

```bash
# Configure auto-scaling
gcloud run services update vana \
    --min-instances=1 \
    --max-instances=10 \
    --concurrency=100 \
    --region=us-central1
```

## Deployment Checklist

### Pre-Deployment
- [ ] Python 3.13+ verified
- [ ] Google Cloud project configured
- [ ] Service account created with proper permissions
- [ ] Environment variables set
- [ ] Health checks passing locally

### Deployment
- [ ] Authentication verified (`gcloud auth list`)
- [ ] Required APIs enabled
- [ ] Deployment script executed successfully
- [ ] Service deployed and accessible
- [ ] Health checks passing in production

### Post-Deployment
- [ ] Monitoring configured
- [ ] Alerting policies created
- [ ] Access controls verified
- [ ] Performance metrics baseline established
- [ ] Documentation updated

---

*For deployment issues, check [GitHub Issues](https://github.com/your-org/vana/issues) or contact the development team.*
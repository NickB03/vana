# Deployment Guide

## Overview

This guide covers deploying Vana to Google Cloud Platform using Cloud Run with the enhanced session management, health monitoring, and mobile-optimized frontend. The deployment includes automatic provisioning of required resources and comprehensive monitoring.

## Prerequisites

### Required Tools
```bash
# Google Cloud SDK
gcloud --version

# Terraform
terraform --version

# UV (Python package manager)
uv --version

# Node.js and npm
node --version
npm --version

# Make (build automation)
make --version
```

### Google Cloud Setup
```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project analystai-454200

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable vertexai.googleapis.com
```

## Environment Configuration

### Backend Environment Variables

#### Required (Automatically Configured)
```bash
# Project identification (auto-detected)
GOOGLE_CLOUD_PROJECT=analystai-454200
GOOGLE_CLOUD_LOCATION=us-central1

# Session storage (auto-created)
# Format: gs://analystai-454200-vana-session-storage
# Bucket created automatically during startup

# Vertex AI configuration
GOOGLE_GENAI_USE_VERTEXAI=True
```

#### Optional Configuration
```bash
# API Keys (for AI Studio instead of Vertex AI)
GOOGLE_API_KEY=your-api-key

# Alternative model providers
USE_OPENROUTER=true
OPENROUTER_API_KEY=your-openrouter-key

# Search API
BRAVE_API_KEY=your-brave-search-key

# Performance tuning
ENABLE_TRACING=true
LOG_LEVEL=INFO
```

### Frontend Environment Variables

Create `frontend/.env.local`:
```bash
# API Configuration
VITE_API_URL=https://vana-prod-960076421399.us-central1.run.app
VITE_APP_NAME=app
VITE_ENVIRONMENT=production

# Performance Configuration
VITE_MAX_RETRIES=5
VITE_RETRY_DELAY=1000
VITE_TIMEOUT=30000
VITE_ENABLE_LOGGING=false  # Disable debug logging in production
```

## Deployment Methods

### Method 1: Quick Deployment (Recommended)

#### Deploy Backend to Cloud Run
```bash
# Install dependencies
make install

# Deploy to development environment
make backend

# Deploy with Identity-Aware Proxy (for UI access)
make backend IAP=true
```

#### Deploy Frontend
```bash
# Build and deploy frontend (if using static hosting)
cd frontend
npm run build
# Upload dist/ to your static hosting provider
```

### Method 2: Full Infrastructure Setup

#### Set Up Infrastructure with Terraform
```bash
# Initialize Terraform
cd deployment/terraform/dev
terraform init

# Plan deployment
terraform plan -var-file=vars/env.tfvars

# Apply infrastructure
terraform apply -var-file=vars/env.tfvars
```

#### Deploy Application
```bash
# Deploy backend service
make setup-dev-env
make backend

# Verify health endpoint
curl https://vana-dev-960076421399.us-central1.run.app/health
```

### Method 3: CI/CD Pipeline (Production)

#### One-Command CI/CD Setup
```bash
uvx agent-starter-pack setup-cicd \
  --staging-project analystai-staging \
  --prod-project analystai-454200 \
  --repository-name vana \
  --repository-owner vana-project \
  --git-provider github \
  --auto-approve
```

## Service Configuration

### Session Storage Setup

#### Automatic Bucket Creation
The application automatically creates the session storage bucket during startup:

```python
# In app/server.py
session_service_uri = f"gs://{project_id}-vana-session-storage"

create_bucket_if_not_exists(
    bucket_name=session_service_uri,
    project=project_id,
    location="us-central1"
)
```

#### Manual Bucket Setup (if needed)
```bash
# Create session storage bucket manually
gsutil mb -p analystai-454200 -c STANDARD -l us-central1 \
  gs://analystai-454200-vana-session-storage

# Set appropriate permissions
gsutil iam ch serviceAccount:vana-service-account@analystai-454200.iam.gserviceaccount.com:objectAdmin \
  gs://analystai-454200-vana-session-storage
```

### Health Monitoring

#### Health Check Configuration
The `/health` endpoint provides comprehensive service validation:

```json
{
  "status": "healthy",
  "timestamp": "2025-08-03T10:30:00.000Z",
  "service": "vana",
  "version": "1.0.0",
  "session_storage_enabled": true
}
```

#### Cloud Run Health Checks
```yaml
# In Cloud Run service configuration
healthCheck:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Service Account Permissions

#### Required IAM Roles
```bash
# Cloud Run service account needs:
# - Storage Object Admin (for session storage)
# - Vertex AI User (for AI models)
# - Secret Manager Secret Accessor (for API keys)
# - Cloud Trace Agent (for monitoring)

gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-service-account@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding analystai-454200 \
  --member="serviceAccount:vana-service-account@analystai-454200.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

## Verification and Testing

### Backend Health Check
```bash
# Test health endpoint
curl https://your-service-url/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-08-03T10:30:00.000Z",
  "service": "vana",
  "version": "1.0.0",
  "session_storage_enabled": true
}
```

### API Functionality Test
```bash
# Test session creation
curl -X POST https://your-service-url/api/apps/app/users/testuser/sessions \
  -H "Content-Type: application/json"

# Test SSE endpoint
curl -X POST https://your-service-url/api/run_sse \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "app",
    "userId": "testuser",
    "sessionId": "testsession",
    "newMessage": {
      "parts": [{"text": "What is 2+2?"}],
      "role": "user"
    },
    "streaming": true
  }'
```

### Frontend Verification
```bash
# Test frontend build
cd frontend
npm run build

# Check build output
ls -la dist/

# Test frontend with backend
# Open browser to your frontend URL
# Verify WebSocket/SSE connections in browser dev tools
```

## Monitoring and Observability

### Cloud Monitoring Setup

#### Enable Tracing
```bash
# Tracing is automatically enabled via OpenTelemetry
# View traces in Cloud Console:
# https://console.cloud.google.com/traces/overview?project=analystai-454200
```

#### Looker Studio Dashboard
1. Access the [Dashboard Template](https://lookerstudio.google.com/reporting/46b35167-b38b-4e44-bd37-701ef4307418/page/tEnnC)
2. Follow setup instructions in the "Setup Instructions" tab
3. Configure for your project ID

#### Key Metrics to Monitor
- **Request Latency**: Response times for API endpoints
- **Error Rates**: HTTP 4xx and 5xx response rates
- **Session Creation**: Rate of new session creation
- **Agent Performance**: Execution time for different agents
- **Storage Usage**: Session storage bucket usage
- **Connection Health**: SSE connection success rates

### Log Analysis
```bash
# View application logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vana" \
  --project=analystai-454200 \
  --limit=50

# View session storage logs
gcloud logging read "resource.type=gcs_bucket AND resource.labels.bucket_name=analystai-454200-vana-session-storage" \
  --project=analystai-454200
```

## Troubleshooting

### Common Issues

#### Session Storage Bucket Creation Fails
```bash
# Check permissions
gcloud projects get-iam-policy analystai-454200

# Manually create bucket
gsutil mb -p analystai-454200 -l us-central1 gs://analystai-454200-vana-session-storage

# Verify bucket exists
gsutil ls -p analystai-454200 | grep vana-session-storage
```

#### Health Check Failures
```bash
# Check service logs
gcloud run services logs read vana --project=analystai-454200

# Test health endpoint directly
curl https://your-service-url/health -v

# Check service status
gcloud run services describe vana --project=analystai-454200 --region=us-central1
```

#### Frontend Connection Issues
```bash
# Check CORS configuration
# Verify VITE_API_URL is correct
# Test API connectivity from browser dev tools

# Check environment variables
cat frontend/.env.local

# Verify build configuration
cat frontend/vite.config.ts
```

#### Memory or Performance Issues
```bash
# Check Cloud Run resource allocation
gcloud run services describe vana --project=analystai-454200 --region=us-central1

# Update resource allocation if needed
gcloud run services update vana \
  --memory=8Gi \
  --cpu=4 \
  --project=analystai-454200 \
  --region=us-central1
```

## Security Considerations

### Access Control
- **IAM Roles**: Principle of least privilege
- **Service Accounts**: Dedicated service accounts for each service
- **API Keys**: Stored in Secret Manager, not environment variables
- **Identity-Aware Proxy**: Optional UI access control

### Data Protection
- **Session Data**: Encrypted at rest in Cloud Storage
- **Transit Security**: HTTPS/TLS for all communications
- **API Security**: Input validation and rate limiting
- **Audit Logging**: Comprehensive audit trail

### Network Security
- **VPC Configuration**: Private networking where possible
- **Firewall Rules**: Restrictive ingress rules
- **Load Balancer**: SSL termination and DDoS protection

## Scaling Considerations

### Auto-scaling Configuration
```yaml
# Cloud Run auto-scaling
annotations:
  autoscaling.knative.dev/minScale: "1"
  autoscaling.knative.dev/maxScale: "10"
  run.googleapis.com/cpu-throttling: "false"
```

### Performance Optimization
- **Resource Allocation**: 4 CPU, 8GB RAM (adjustable)
- **Connection Pooling**: Database and API connection reuse
- **Caching**: Session caching and response caching where appropriate
- **CDN**: Static asset delivery via CDN

### Cost Optimization
- **Resource Right-sizing**: Monitor and adjust resource allocation
- **Auto-scaling**: Scale to zero when not in use
- **Storage Classes**: Use appropriate storage classes for different data types
- **Monitoring**: Regular cost analysis and optimization

---

*For additional deployment scenarios or custom configurations, consult the ADK documentation or reach out to the development team.*
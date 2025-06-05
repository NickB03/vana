# ☁️ Cloud Deployment Guide

This guide covers deploying VANA to Google Cloud Run for production use.

## 🎯 Overview

VANA is designed for cloud-native deployment on Google Cloud Platform, leveraging:
- **Google Cloud Run** - Serverless container platform
- **Vertex AI** - Machine learning and vector search
- **Cloud IAM** - Authentication and authorization
- **Cloud Logging** - Centralized logging
- **Cloud Monitoring** - Performance monitoring

## 📋 Prerequisites

### Required Tools
- **Google Cloud SDK** - `gcloud` command-line tool
- **Docker** - Container runtime
- **Poetry** - Python dependency management
- **Git** - Version control

### Google Cloud Setup
1. **Google Cloud Project** with billing enabled
2. **Required APIs** enabled:
   - Cloud Run API
   - Vertex AI API
   - Cloud Build API
   - Container Registry API
   - Cloud Logging API
   - Cloud Monitoring API

### Permissions
Your account needs these IAM roles:
- `Cloud Run Admin`
- `Vertex AI User`
- `Service Account Admin`
- `Cloud Build Editor`
- `Storage Admin`

## 🚀 Deployment Steps

### 1. Environment Setup

#### Enable Required APIs
```bash
# Enable necessary Google Cloud APIs
gcloud services enable run.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
```

#### Set Project Configuration
```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export REGION="us-central1"

gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION
```

### 2. Service Account Setup

#### Create Service Account
```bash
# Create service account for VANA
gcloud iam service-accounts create vana-service \
    --display-name="VANA Production Service Account" \
    --description="Service account for VANA multi-agent system"

# Get the service account email
export SERVICE_ACCOUNT="vana-service@${PROJECT_ID}.iam.gserviceaccount.com"
```

#### Grant Required Permissions
```bash
# Vertex AI permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/aiplatform.user"

# Cloud Run permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/run.invoker"

# Logging permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/logging.logWriter"

# Monitoring permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/monitoring.metricWriter"

# Storage permissions (for document processing)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/storage.objectAdmin"
```

### 3. Vertex AI Setup

#### Create Vector Search Index
```bash
# Create vector search index
gcloud ai indexes create \
    --display-name="vana-vector-index" \
    --description="Vector search index for VANA knowledge base" \
    --metadata-schema-uri="gs://google-cloud-aiplatform/schema/metadataschema/default_metadata.yaml" \
    --region=$REGION
```

#### Deploy Vector Search Endpoint
```bash
# Create endpoint
gcloud ai index-endpoints create \
    --display-name="vana-vector-endpoint" \
    --description="Vector search endpoint for VANA" \
    --region=$REGION

# Get endpoint ID and deploy index
export ENDPOINT_ID="your-endpoint-id"
export INDEX_ID="your-index-id"

gcloud ai index-endpoints deploy-index $ENDPOINT_ID \
    --deployed-index-id="vana-deployed-index" \
    --display-name="VANA Vector Search" \
    --index=$INDEX_ID \
    --region=$REGION
```

### 4. Environment Configuration

#### Create Production Environment File
```bash
# Create .env.production file
cat > .env.production << EOF
# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
GOOGLE_CLOUD_LOCATION=${REGION}

# Vertex AI Configuration
VERTEX_AI_LOCATION=${REGION}
VECTOR_SEARCH_ENDPOINT=${ENDPOINT_ID}
VECTOR_SEARCH_INDEX=${INDEX_ID}

# API Keys (set these in Cloud Run environment variables)
BRAVE_SEARCH_API_KEY=\${BRAVE_SEARCH_API_KEY}

# Performance Settings
MAX_CONCURRENT_TASKS=50
CACHE_TTL=3600
REQUEST_TIMEOUT=300

# Security Settings
ENABLE_CORS=true
ALLOWED_ORIGINS=https://yourdomain.com
ENABLE_RATE_LIMITING=true
EOF
```

### 5. Container Build and Deploy

#### Build Container Image
```bash
# Build and push container image
gcloud builds submit --tag gcr.io/$PROJECT_ID/vana:latest

# Or use Cloud Build with cloudbuild.yaml
gcloud builds submit --config cloudbuild.yaml
```

#### Deploy to Cloud Run
```bash
# Deploy VANA to Cloud Run
gcloud run deploy vana \
    --image gcr.io/$PROJECT_ID/vana:latest \
    --service-account=$SERVICE_ACCOUNT \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
    --set-env-vars="GOOGLE_CLOUD_LOCATION=${REGION}" \
    --set-env-vars="VERTEX_AI_LOCATION=${REGION}" \
    --set-env-vars="VECTOR_SEARCH_ENDPOINT=${ENDPOINT_ID}" \
    --set-env-vars="VECTOR_SEARCH_INDEX=${INDEX_ID}" \
    --set-secrets="BRAVE_SEARCH_API_KEY=brave-api-key:latest" \
    --memory=2Gi \
    --cpu=2 \
    --concurrency=100 \
    --max-instances=10 \
    --timeout=300 \
    --port=8080 \
    --allow-unauthenticated \
    --region=$REGION
```

### 6. Custom Domain Setup (Optional)

#### Map Custom Domain
```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
    --service=vana \
    --domain=vana.yourdomain.com \
    --region=$REGION
```

#### SSL Certificate
Cloud Run automatically provisions SSL certificates for custom domains.

## 🔧 Configuration Management

### Environment Variables

#### Required Variables
```bash
# Core configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
VERTEX_AI_LOCATION=us-central1
VECTOR_SEARCH_ENDPOINT=your-endpoint-id
VECTOR_SEARCH_INDEX=your-index-id

# API keys (stored as secrets)
BRAVE_SEARCH_API_KEY=your-brave-api-key
```

#### Optional Variables
```bash
# Performance tuning
MAX_CONCURRENT_TASKS=50
CACHE_TTL=3600
REQUEST_TIMEOUT=300

# Security settings
ENABLE_CORS=true
ALLOWED_ORIGINS=https://yourdomain.com
ENABLE_RATE_LIMITING=true

# Monitoring
LOG_LEVEL=INFO
ENABLE_METRICS=true
METRICS_PORT=9090
```

### Secrets Management

#### Store API Keys as Secrets
```bash
# Create secret for Brave Search API key
echo -n "your-brave-api-key" | gcloud secrets create brave-api-key --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding brave-api-key \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
```

## 📊 Monitoring and Logging

### Cloud Logging Setup

#### Log-based Metrics
```bash
# Create log-based metric for errors
gcloud logging metrics create vana_errors \
    --description="VANA error count" \
    --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="vana" AND severity>=ERROR'
```

#### Log Sinks
```bash
# Create log sink for long-term storage
gcloud logging sinks create vana-logs-sink \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/vana_logs \
    --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="vana"'
```

### Cloud Monitoring Setup

#### Alerting Policies
```bash
# Create alerting policy for high error rate
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/error-rate-policy.yaml
```

#### Custom Dashboards
```bash
# Create custom dashboard
gcloud alpha monitoring dashboards create \
    --config-from-file=monitoring/vana-dashboard.yaml
```

## 🔒 Security Configuration

### IAM and Access Control

#### Restrict Access
```bash
# Remove public access (if needed)
gcloud run services remove-iam-policy-binding vana \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region=$REGION

# Add specific users/groups
gcloud run services add-iam-policy-binding vana \
    --member="user:admin@yourdomain.com" \
    --role="roles/run.invoker" \
    --region=$REGION
```

#### VPC Connector (Optional)
```bash
# Create VPC connector for private network access
gcloud compute networks vpc-access connectors create vana-connector \
    --network=default \
    --region=$REGION \
    --range=10.8.0.0/28

# Update Cloud Run service to use VPC connector
gcloud run services update vana \
    --vpc-connector=vana-connector \
    --region=$REGION
```

### Security Headers
Configure security headers in your application:
```python
# In your Flask/FastAPI app
@app.after_request
def after_request(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response
```

## 🚀 Automated Deployment

### Cloud Build Configuration

#### cloudbuild.yaml
```yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/vana:$COMMIT_SHA', '.']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/vana:$COMMIT_SHA']
  
  # Deploy container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'vana'
      - '--image'
      - 'gcr.io/$PROJECT_ID/vana:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--service-account'
      - 'vana-service@$PROJECT_ID.iam.gserviceaccount.com'

images:
  - 'gcr.io/$PROJECT_ID/vana:$COMMIT_SHA'
```

#### GitHub Actions Integration
```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - id: 'auth'
      uses: 'google-github-actions/auth@v1'
      with:
        credentials_json: '${{ secrets.GCP_SA_KEY }}'
    
    - name: 'Set up Cloud SDK'
      uses: 'google-github-actions/setup-gcloud@v1'
    
    - name: 'Build and Deploy'
      run: |
        gcloud builds submit --config cloudbuild.yaml
```

## 🔧 Maintenance and Updates

### Rolling Updates
```bash
# Deploy new version with zero downtime
gcloud run deploy vana \
    --image gcr.io/$PROJECT_ID/vana:new-version \
    --region=$REGION
```

### Health Checks
```bash
# Check service health
curl https://vana-qqugqgsbcq-uc.a.run.app/api/health

# Check Cloud Run service status
gcloud run services describe vana --region=$REGION
```

### Scaling Configuration
```bash
# Update scaling settings
gcloud run services update vana \
    --min-instances=1 \
    --max-instances=20 \
    --concurrency=50 \
    --region=$REGION
```

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=vana" --limit=50

# Check service configuration
gcloud run services describe vana --region=$REGION
```

#### Permission Errors
```bash
# Verify service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --format="table(bindings.role)" \
    --filter="bindings.members:vana-service@${PROJECT_ID}.iam.gserviceaccount.com"
```

#### Performance Issues
```bash
# Check metrics
gcloud monitoring metrics list --filter="metric.type:run.googleapis.com"

# Update resource allocation
gcloud run services update vana \
    --memory=4Gi \
    --cpu=4 \
    --region=$REGION
```

---

**🎉 Congratulations!** Your VANA system is now deployed to Google Cloud Run and ready for production use.

**Need help?** Check our [troubleshooting guide](../troubleshooting/common-issues.md) or [monitoring documentation](../guides/monitoring.md).

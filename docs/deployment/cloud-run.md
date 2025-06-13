# Cloud Run Deployment Guide

## Prerequisites

### Required Tools
- **Google Cloud CLI** (gcloud) installed and authenticated
- **Docker** installed locally for container building
- **Git** for source code management
- **Valid Google Cloud Project** with billing enabled

### Required Permissions
Your Google Cloud account needs the following IAM roles:
- `Cloud Run Admin`
- `Cloud Build Editor`
- `Vertex AI User`
- `Secret Manager Secret Accessor`
- `Service Account User`

## Deployment Steps

### 1. Configure Project Environment
Set up your Google Cloud project configuration:

```bash
# Set project variables
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export SERVICE_NAME="vana"

# Configure gcloud
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Set Up Secrets
Store sensitive configuration in Google Secret Manager:

```bash
# Create secrets for API keys
gcloud secrets create openai-api-key --data-file=- <<< "your-openai-api-key"
gcloud secrets create brave-api-key --data-file=- <<< "your-brave-api-key"

# Create secret for VANA configuration
cat > vana-config.json << EOF
{
  "secret_key": "your-secret-key-here",
  "vector_search_endpoint": "your-vector-search-endpoint",
  "rag_corpus_resource_name": "projects/$PROJECT_ID/locations/us-central1/ragCorpora/your-corpus-id"
}
EOF

gcloud secrets create vana-config --data-file=vana-config.json
rm vana-config.json
```

### 3. Development Environment Deployment
Deploy to development environment first for testing:

```bash
# Deploy to development
./deployment/deploy-dev.sh
```

The deployment script will:
- Build the Docker container using Cloud Build
- Deploy to Cloud Run with development configuration
- Configure environment variables and secrets
- Set up appropriate resource limits

**Development Configuration:**
- **Memory**: 4 GiB
- **CPU**: 2 vCPU
- **Concurrency**: 10 requests per instance
- **Timeout**: 300 seconds
- **Min Instances**: 0 (scales to zero)
- **Max Instances**: 10

### 4. Verify Development Deployment
Test the development deployment:

```bash
# Get service URL
DEV_URL=$(gcloud run services describe vana-dev --region=$REGION --format="value(status.url)")
echo "Development URL: $DEV_URL"

# Test health endpoint
curl "$DEV_URL/health"

# Test agent discovery
curl "$DEV_URL/list-apps"

# Test with authentication (if enabled)
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" "$DEV_URL/health"
```

### 5. Production Environment Deployment
After successful development testing, deploy to production:

```bash
# Deploy to production
./deployment/deploy-prod.sh
```

**Production Configuration:**
- **Memory**: 8 GiB
- **CPU**: 4 vCPU
- **Concurrency**: 20 requests per instance
- **Timeout**: 300 seconds
- **Min Instances**: 1 (always warm)
- **Max Instances**: 50

### 6. Configure Environment Variables
Set production environment variables:

```bash
gcloud run services update vana-prod \
  --set-env-vars="VANA_ENV=production" \
  --set-env-vars="GOOGLE_GENAI_USE_VERTEXAI=true" \
  --set-env-vars="ENABLE_SANDBOX=true" \
  --set-env-vars="MAX_CONCURRENT_AGENTS=20" \
  --region=$REGION
```

### 7. Configure Secrets Access
Grant the Cloud Run service access to secrets:

```bash
# Get the service account email
SERVICE_ACCOUNT=$(gcloud run services describe vana-prod --region=$REGION --format="value(spec.template.spec.serviceAccountName)")

# Grant secret access
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding brave-api-key \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding vana-config \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

## Advanced Configuration

### Custom Domain Setup
Configure a custom domain for your VANA deployment:

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=vana-prod \
  --domain=vana.yourdomain.com \
  --region=$REGION

# Get DNS configuration
gcloud run domain-mappings describe vana.yourdomain.com \
  --region=$REGION
```

Add the provided DNS records to your domain registrar.

### SSL Certificate Configuration
Cloud Run automatically provisions SSL certificates for custom domains. To use your own certificate:

```bash
# Upload certificate to Certificate Manager
gcloud certificate-manager certificates create vana-ssl-cert \
  --certificate-file=cert.pem \
  --private-key-file=key.pem

# Update domain mapping
gcloud run domain-mappings update vana.yourdomain.com \
  --certificate=vana-ssl-cert \
  --region=$REGION
```

### VPC Configuration
For enhanced security, deploy VANA in a VPC:

```bash
# Create VPC connector
gcloud compute networks vpc-access connectors create vana-connector \
  --region=$REGION \
  --subnet=your-subnet \
  --subnet-project=$PROJECT_ID

# Update service to use VPC
gcloud run services update vana-prod \
  --vpc-connector=vana-connector \
  --vpc-egress=private-ranges-only \
  --region=$REGION
```

### Load Balancer Setup
For high availability and global distribution:

```bash
# Create backend service
gcloud compute backend-services create vana-backend \
  --global \
  --load-balancing-scheme=EXTERNAL

# Add Cloud Run NEG
gcloud compute network-endpoint-groups create vana-neg \
  --region=$REGION \
  --network-endpoint-type=serverless \
  --cloud-run-service=vana-prod

# Add NEG to backend service
gcloud compute backend-services add-backend vana-backend \
  --global \
  --network-endpoint-group=vana-neg \
  --network-endpoint-group-region=$REGION
```

## Monitoring and Logging

### View Logs
Monitor application logs in real-time:

```bash
# Stream logs from production
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vana-prod" \
  --limit=50 \
  --format="table(timestamp,severity,textPayload)"

# Filter by severity
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vana-prod AND severity>=ERROR" \
  --limit=20
```

### Performance Monitoring
Set up monitoring dashboards:

```bash
# Create monitoring dashboard
gcloud monitoring dashboards create --config-from-file=monitoring-dashboard.json
```

Example dashboard configuration (`monitoring-dashboard.json`):
```json
{
  "displayName": "VANA Performance Dashboard",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Count",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"vana-prod\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
```

### Alerting
Set up alerts for critical metrics:

```bash
# Create alerting policy for high error rate
gcloud alpha monitoring policies create --policy-from-file=error-rate-policy.yaml
```

Example policy (`error-rate-policy.yaml`):
```yaml
displayName: "VANA High Error Rate"
conditions:
  - displayName: "Error rate > 5%"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="vana-prod"'
      comparison: COMPARISON_GREATER_THAN
      thresholdValue: 0.05
      duration: 300s
notificationChannels:
  - "projects/PROJECT_ID/notificationChannels/CHANNEL_ID"
```

## Security Configuration

### IAM and Access Control
Configure proper IAM permissions:

```bash
# Create custom service account for VANA
gcloud iam service-accounts create vana-service-account \
  --display-name="VANA Service Account"

# Grant minimal required permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:vana-service-account@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Update Cloud Run service to use custom service account
gcloud run services update vana-prod \
  --service-account=vana-service-account@$PROJECT_ID.iam.gserviceaccount.com \
  --region=$REGION
```

### Network Security
Configure Cloud Armor for DDoS protection:

```bash
# Create security policy
gcloud compute security-policies create vana-security-policy \
  --description="Security policy for VANA"

# Add rate limiting rule
gcloud compute security-policies rules create 1000 \
  --security-policy=vana-security-policy \
  --expression="true" \
  --action="rate-based-ban" \
  --rate-limit-threshold-count=100 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600
```

### HTTPS-Only Traffic
Ensure all traffic uses HTTPS:

```bash
# Configure HTTPS redirect
gcloud run services update vana-prod \
  --port=8080 \
  --use-http2 \
  --region=$REGION

# Set ingress to HTTPS only
gcloud run services update vana-prod \
  --ingress=all \
  --region=$REGION
```

## Troubleshooting

### Common Deployment Issues

#### 1. Build Failures
```bash
# Check Cloud Build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID

# Common fixes
# - Ensure Dockerfile is in project root
# - Check for syntax errors in cloudbuild.yaml
# - Verify all dependencies are in requirements.txt
```

#### 2. Service Startup Failures
```bash
# Check service logs
gcloud run services logs read vana-prod --region=$REGION

# Common issues:
# - Missing environment variables
# - Insufficient memory allocation
# - Port configuration mismatch
```

#### 3. Permission Errors
```bash
# Verify service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:vana-service-account@$PROJECT_ID.iam.gserviceaccount.com"

# Grant missing permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:vana-service-account@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/REQUIRED_ROLE"
```

### Performance Optimization

#### Memory and CPU Tuning
```bash
# Monitor resource usage
gcloud monitoring metrics list --filter="metric.type:run.googleapis.com"

# Adjust resources based on usage
gcloud run services update vana-prod \
  --memory=16Gi \
  --cpu=8 \
  --region=$REGION
```

#### Scaling Configuration
```bash
# Configure auto-scaling
gcloud run services update vana-prod \
  --min-instances=2 \
  --max-instances=100 \
  --concurrency=50 \
  --region=$REGION
```

### Rollback Procedures
```bash
# List revisions
gcloud run revisions list --service=vana-prod --region=$REGION

# Rollback to previous revision
gcloud run services update-traffic vana-prod \
  --to-revisions=REVISION_NAME=100 \
  --region=$REGION
```

## Maintenance

### Regular Updates
```bash
# Update to latest code
git pull origin main
./deployment/deploy-prod.sh

# Update dependencies
poetry update
./deployment/deploy-prod.sh
```

### Backup and Recovery
```bash
# Export service configuration
gcloud run services describe vana-prod \
  --region=$REGION \
  --format="export" > vana-prod-backup.yaml

# Restore from backup
gcloud run services replace vana-prod-backup.yaml --region=$REGION
```

For additional support, consult the VANA troubleshooting guide or contact the development team.

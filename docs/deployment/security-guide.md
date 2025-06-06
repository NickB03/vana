# 🔒 Security Guide

This guide covers security best practices for deploying and operating VANA in production environments.

## 🎯 Overview

VANA implements enterprise-grade security practices including:
- **Secret Management** - Google Secret Manager integration
- **IAM Controls** - Role-based access control
- **Network Security** - VPC and firewall configurations
- **Data Protection** - Encryption at rest and in transit
- **Audit Logging** - Comprehensive security monitoring

## 🔑 API Key and Secret Management

### ⚠️ Security Risk: Hardcoded API Keys

**NEVER** hardcode API keys in:
- Source code files
- Configuration files committed to Git
- Environment variables in deployment files
- Docker images or containers

### ✅ Secure Approach: Google Secret Manager

#### 1. Create Secrets
```bash
# Create secret for Brave Search API key
echo -n "your-actual-brave-api-key" | gcloud secrets create brave-api-key --data-file=-

# Create secret for OpenRouter API key (for external models)
echo -n "your-actual-openrouter-api-key" | gcloud secrets create openrouter-api-key --data-file=-

# Verify secrets were created
gcloud secrets list
```

#### 2. Grant Service Account Access
```bash
# Get your service account email
export SERVICE_ACCOUNT="vana-service@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant access to secrets
gcloud secrets add-iam-policy-binding brave-api-key \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding openrouter-api-key \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
```

#### 3. Use Secrets in Cloud Run
```bash
# Deploy with secrets (secure method)
gcloud run deploy vana \
    --image gcr.io/$PROJECT_ID/vana:latest \
    --set-secrets="BRAVE_API_KEY=brave-api-key:latest,OPENROUTER_API_KEY=openrouter-api-key:latest" \
    --service-account=$SERVICE_ACCOUNT \
    --region=$REGION
```

### 🔄 Secret Rotation

#### Automated Rotation
```bash
# Update secret with new value
echo -n "new-api-key-value" | gcloud secrets versions add brave-api-key --data-file=-

# Cloud Run will automatically use the latest version
# No service restart required
```

#### Manual Rotation Process
1. Generate new API key from provider
2. Update secret in Google Secret Manager
3. Verify service continues to function
4. Revoke old API key from provider

## 🛡️ IAM and Access Control

### Service Account Permissions

#### Minimum Required Permissions
```bash
# Core VANA permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/monitoring.metricWriter"

# Secret access
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor"
```

#### Optional Permissions (as needed)
```bash
# For document processing
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/storage.objectAdmin"

# For BigQuery integration
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/bigquery.dataViewer"
```

### User Access Control

#### Public Access (Default)
```bash
# VANA is deployed with public access by default
# Anyone with the URL can access the service
```

#### Restricted Access
```bash
# Remove public access
gcloud run services remove-iam-policy-binding vana \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region=$REGION

# Add specific users
gcloud run services add-iam-policy-binding vana \
    --member="user:admin@yourdomain.com" \
    --role="roles/run.invoker" \
    --region=$REGION

# Add groups
gcloud run services add-iam-policy-binding vana \
    --member="group:vana-users@yourdomain.com" \
    --role="roles/run.invoker" \
    --region=$REGION
```

## 🌐 Network Security

### VPC Configuration

#### Create VPC Connector
```bash
# Create VPC connector for private network access
gcloud compute networks vpc-access connectors create vana-connector \
    --network=default \
    --region=$REGION \
    --range=10.8.0.0/28 \
    --min-instances=2 \
    --max-instances=10
```

#### Configure Cloud Run with VPC
```bash
# Update service to use VPC connector
gcloud run services update vana \
    --vpc-connector=vana-connector \
    --vpc-egress=private-ranges-only \
    --region=$REGION
```

### Firewall Rules

#### Restrict Egress Traffic
```bash
# Create firewall rule for VANA egress
gcloud compute firewall-rules create vana-egress-allow \
    --direction=EGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:443,tcp:80 \
    --destination-ranges=0.0.0.0/0 \
    --target-tags=vana-service
```

## 🔐 Application Security

### Environment Variables

#### Secure Configuration
```python
# In your application code
import os
from google.cloud import secretmanager

def get_secret(secret_id: str) -> str:
    """Securely retrieve secret from Google Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    project_id = os.environ.get('GOOGLE_CLOUD_PROJECT')
    
    name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    
    return response.payload.data.decode("UTF-8")

# Usage
brave_api_key = get_secret("brave-api-key")
openrouter_api_key = get_secret("openrouter-api-key")
```

### Security Headers

#### HTTP Security Headers
```python
# Add to your Flask/FastAPI application
@app.after_request
def security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Content-Security-Policy'] = "default-src 'self'"
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response
```

## 📊 Security Monitoring

### Audit Logging

#### Enable Audit Logs
```bash
# Enable Cloud Audit Logs
gcloud logging sinks create vana-audit-sink \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/vana_audit_logs \
    --log-filter='protoPayload.serviceName="run.googleapis.com" OR protoPayload.serviceName="secretmanager.googleapis.com"'
```

### Security Alerts

#### Create Alert Policies
```bash
# Alert on unauthorized access attempts
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/security-alerts.yaml
```

## 🚨 Incident Response

### Security Incident Checklist

1. **Immediate Response**
   - Identify affected systems
   - Isolate compromised resources
   - Preserve evidence

2. **Assessment**
   - Determine scope of breach
   - Identify data at risk
   - Document timeline

3. **Containment**
   - Rotate compromised credentials
   - Update firewall rules
   - Deploy security patches

4. **Recovery**
   - Restore from clean backups
   - Verify system integrity
   - Monitor for persistence

5. **Lessons Learned**
   - Update security procedures
   - Improve monitoring
   - Train team members

### Emergency Contacts

- **Security Team**: security@yourdomain.com
- **On-call Engineer**: +1-XXX-XXX-XXXX
- **Google Cloud Support**: [Support Console](https://console.cloud.google.com/support)

---

**🔒 Security is a shared responsibility.** Follow these guidelines to keep VANA and your data secure.

**Need help?** Contact the security team or check our [troubleshooting guide](../troubleshooting/common-issues.md).

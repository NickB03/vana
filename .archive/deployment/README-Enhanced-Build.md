# VANA Enhanced Cloud Build & Deployment

This directory contains enhanced Cloud Build configurations for VANA with comprehensive versioning and enhanced reasoning capabilities.

## 🚀 Enhanced Features

### New Capabilities Added
- **5 Enhanced Reasoning Tools**: Mathematical solving, logical analysis, enhanced echo, enhanced task analysis, reasoning coordination
- **Comprehensive Version Tracking**: Git commits, build IDs, deployment timestamps
- **Production-Grade Security**: Vulnerability scanning, secure secrets, hardened containers
- **Automated Validation**: Health checks, feature validation, deployment verification

## 📋 Available Build Configurations

### Development Builds

#### Standard Development (`cloudbuild-dev.yaml`)
- Basic VANA deployment without enhanced reasoning
- 4GB memory, 2 CPU
- Development environment settings

#### Enhanced Development (`cloudbuild-enhanced.yaml`)
- **RECOMMENDED**: Includes all enhanced reasoning capabilities
- Comprehensive version tracking
- Automated feature validation
- 4GB memory, 2 CPU
- Build artifacts stored in Cloud Storage

### Production Builds

#### Standard Production (`cloudbuild-prod.yaml`)
- Basic production deployment
- No enhanced reasoning features

#### Enhanced Production (`cloudbuild-enhanced-prod.yaml`)
- **RECOMMENDED**: Full production deployment with enhanced reasoning
- Security scanning and validation
- Production-grade resource allocation (1-20 instances)
- Comprehensive monitoring and health checks
- Rollback capabilities

## 🛠️ Deployment Scripts

### Development Deployment
```bash
# Enhanced development deployment (recommended)
./deployment/deploy-enhanced-dev.sh

# Standard development deployment
./deployment/deploy-dev.sh
```

### Production Deployment
```bash
# Enhanced production deployment (recommended)
./deployment/deploy-enhanced-prod.sh

# Standard production deployment
./deployment/deploy-prod.sh
```

## 📊 Version Tracking

### Available Endpoints
- **`/health`**: Basic health with version summary
- **`/version`**: Detailed version information
- **`/info`**: Complete agent information including enhanced features

### Version Information Includes
- Git commit hash and branch
- Build ID and timestamp
- Deployment environment
- Enhanced reasoning capability status
- Production readiness indicators

### Example Version Response
```json
{
  "version": "1.0.0-a1b2c3d",
  "base_version": "1.0.0",
  "git": {
    "commit_hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
    "commit_short": "a1b2c3d",
    "branch": "main",
    "commit_message": "feat: integrate enhanced reasoning capabilities",
    "commit_timestamp": "2025-06-24T12:00:00Z"
  },
  "build": {
    "build_id": "12345678-1234-1234-1234-123456789012",
    "build_timestamp": "2025-06-24T12:05:00Z",
    "environment": "production"
  },
  "enhanced_features": {
    "reasoning_tools": 5,
    "mathematical_reasoning": true,
    "logical_reasoning": true,
    "enhanced_echo": true,
    "enhanced_task_analysis": true,
    "reasoning_coordination": true
  }
}
```

## 🔒 Security Features

### Enhanced Production Security
- Container vulnerability scanning
- Non-root user execution
- Secure secret management
- IAM service account authentication
- Hardened container images

### Secret Management
Secrets are automatically loaded from Google Secret Manager:
- `BRAVE_API_KEY`: Web search API key
- `OPENROUTER_API_KEY`: LLM provider API key

## 📦 Build Artifacts

### Cloud Storage Structure
```
gs://{PROJECT_ID}-vana-builds/
├── manifests/
│   ├── build-{BUILD_ID}-manifest.json
│   ├── latest-manifest.json
│   └── {PRODUCTION_TAG}-manifest.json
├── production/
│   └── manifests/
│       ├── build-{BUILD_ID}-manifest.json
│       ├── latest-manifest.json
│       └── {PRODUCTION_TAG}-manifest.json
```

### Container Images
```
gcr.io/{PROJECT_ID}/vana-enhanced:{COMMIT_SHORT}
gcr.io/{PROJECT_ID}/vana-enhanced:latest
gcr.io/{PROJECT_ID}/vana-enhanced:build-{BUILD_ID}

gcr.io/{PROJECT_ID}/vana-enhanced-prod:{PRODUCTION_TAG}
gcr.io/{PROJECT_ID}/vana-enhanced-prod:{COMMIT_SHA}
gcr.io/{PROJECT_ID}/vana-enhanced-prod:latest
```

## 🚦 Deployment Process

### Enhanced Development Deployment
1. **Pre-validation**: Check enhanced reasoning tools exist
2. **Version extraction**: Git commit, branch, timestamp
3. **Enhanced build**: Docker image with version tracking
4. **Multi-tag push**: Commit, latest, build-specific tags
5. **Service deployment**: 4GB memory, enhanced environment variables
6. **Validation**: Health check + enhanced features verification
7. **Manifest generation**: Comprehensive version manifest stored in Cloud Storage

### Enhanced Production Deployment
1. **Production validation**: Main branch, clean working directory, up-to-date
2. **Security checks**: Branch validation, uncommitted changes check
3. **Production tagging**: `prod-YYYYMMDD-{commit_short}` format
4. **Enhanced build**: Production-hardened Docker image
5. **Security scanning**: Container vulnerability assessment
6. **Production deployment**: 1-20 instances, production environment
7. **Comprehensive validation**: Health, features, version verification
8. **Production manifest**: Full deployment documentation with rollback info

## 🔄 Rollback Procedures

### Quick Rollback Command
```bash
# List recent revisions
gcloud run revisions list --service=vana-enhanced-prod --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic vana-enhanced-prod \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=us-central1
```

### Rollback Validation
After rollback, validate using:
```bash
curl https://vana-enhanced-prod-xxx.run.app/version
curl https://vana-enhanced-prod-xxx.run.app/health
```

## 🏗️ Build Requirements

### Prerequisites
- Google Cloud Project with billing enabled
- Cloud Build API enabled
- Cloud Run API enabled
- Container Registry API enabled
- Secret Manager API enabled
- Service account: `vana-vector-search-sa@{PROJECT_ID}.iam.gserviceaccount.com`

### Required IAM Permissions
Service account needs:
- `roles/run.developer`
- `roles/secretmanager.secretAccessor`
- `roles/storage.objectCreator` (for build artifacts)
- `roles/containeranalysis.notes.attachOccurrence` (for vulnerability scanning)

## 📈 Monitoring & Observability

### Key Metrics to Monitor
- Service health status (`/health`)
- Enhanced reasoning feature availability
- Version deployment success
- Container security scan results
- Resource utilization (memory, CPU)

### Alerting Recommendations
- Health check failures
- Enhanced reasoning feature failures
- Version mismatch detection
- Security vulnerability detection
- Resource exhaustion

## 🐛 Troubleshooting

### Common Issues

#### Enhanced Features Not Available
- Check if enhanced reasoning tools are committed: `lib/_tools/enhanced_reasoning_tools.py`
- Verify build logs for integration errors
- Test `/info` endpoint for feature status

#### Version Information Missing
- Check if git information is available during build
- Verify environment variables are set correctly
- Check version manifest generation in build logs

#### Production Deployment Fails
- Ensure deploying from `main` branch
- Check working directory is clean
- Verify all pre-production validations pass

### Debug Commands
```bash
# Check service logs
gcloud logs tail --project={PROJECT_ID} --resource-names=vana-enhanced-dev

# Check build logs
gcloud builds list --project={PROJECT_ID}
gcloud builds log {BUILD_ID}

# Test endpoints
curl https://vana-enhanced-dev-xxx.run.app/health
curl https://vana-enhanced-dev-xxx.run.app/version
curl https://vana-enhanced-dev-xxx.run.app/info | jq '.enhanced_features'
```

---

## 🎯 Next Steps

1. **Deploy Enhanced Development**: Test all enhanced reasoning features
2. **Validate Integration**: Confirm mathematical and logical reasoning work
3. **Production Readiness**: Run enhanced production deployment
4. **Monitor & Maintain**: Set up alerting and monitoring

For questions or issues, check the troubleshooting section above or review the build logs in Google Cloud Console.

# VANA Multi-Agent System - Production Deployment Guide

This guide outlines the production deployment process for the VANA Multi-Agent System using Docker and Google Cloud Run.

## Deployment Architecture

The VANA Multi-Agent System uses a **single container architecture** that hosts all 24 agents and 46 tools in one process. This architecture was chosen because:

1. **Performance**: In-memory agent communication is significantly faster than network calls
2. **Simplicity**: Single deployment unit is easier to manage and monitor
3. **Cost-efficiency**: No inter-service networking costs
4. **Scalability**: Cloud Run handles horizontal scaling automatically

## Prerequisites

- Google Cloud SDK installed and configured
- Docker installed locally
- Access to Google Cloud project: `analystai-454200`
- Service account with appropriate permissions

## Environment Configuration

The system uses the following environment variables:

- `GOOGLE_CLOUD_PROJECT`: analystai-454200
- `GOOGLE_CLOUD_LOCATION`: us-central1
- `GOOGLE_GENAI_USE_VERTEXAI`: True
- `VANA_MODEL`: gemini-2.0-flash
- `VANA_ENV`: production

## Deployment Steps

### 1. Authenticate with Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Configure Docker for Google Container Registry
gcloud auth configure-docker
```

### 2. Run the Deployment Script

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script performs the following actions:
- Builds a multi-stage Docker image for optimal size and security
- Pushes the image to Google Container Registry
- Deploys the service to Cloud Run with appropriate configuration
- Outputs the service URL

### 3. Verify Deployment

After deployment, verify the system is working correctly:

```bash
# Check the service status
gcloud run services describe vana-multi-agent --region us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vana-multi-agent" --limit 10
```

Visit the service URL to access the VANA dashboard.

## Scaling Configuration

The service is configured to:
- Scale from 0 to 10 instances automatically
- Use 2 vCPUs and 2GB memory per instance
- Scale based on request load

## Monitoring and Maintenance

### Monitoring

```bash
# Set up Cloud Run monitoring
gcloud run services update vana-multi-agent \
  --region us-central1 \
  --set-cloudsql-instances=${PROJECT_ID}:${REGION}:vana-monitoring-db
```

### Updating the Deployment

To update the deployment:

1. Make changes to the codebase
2. Run the deployment script again
3. Cloud Run will perform a zero-downtime update

## Troubleshooting

If you encounter issues:

1. Check Cloud Run logs for errors
2. Verify environment variables are set correctly
3. Ensure service account has appropriate permissions
4. Test the container locally before deployment

## Security Considerations

- The service is configured to allow unauthenticated access for public API
- Sensitive operations require authentication via Google Cloud IAM
- Service account permissions follow least privilege principle

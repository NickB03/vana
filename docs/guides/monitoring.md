# 📊 Monitoring Guide

This guide explains how to monitor the VANA system using built-in health checks and logging.

VANA includes comprehensive monitoring capabilities through health endpoints, logging, and performance metrics.

## Key Metrics

- **Health Status** — overall status from `/health`
- **Agent Performance** — response times and success rates
- **Tool Usage** — frequency of tool execution
- **Resource Utilization** — CPU and memory usage

## Monitoring Methods

### Health Endpoints
```bash
# Check overall system health
curl https://your-vana-deployment/health

# Test agent functionality
curl -X POST https://your-vana-deployment/run \
  -d '{"newMessage": {"parts": [{"text": "Use adk_get_health_status to check system health"}]}}'
```

### Logging
```bash
# Local development logs
tail -f logs/vana.log

# Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=vana-prod"
```

### Performance Monitoring
- Monitor response times through Cloud Run metrics
- Track agent success rates through application logs
- Use Google Cloud Monitoring for infrastructure metrics

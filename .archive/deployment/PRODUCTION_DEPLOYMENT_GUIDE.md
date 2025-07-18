# VANA Production Deployment Guide

## Overview

This guide covers deploying VANA with ADK event streaming enabled for production use.

## 🚀 Production Configuration

### 1. ADK Event Streaming (Enabled by Default)

ADK event streaming is now **enabled by default** in production for:
- Silent agent handoffs (no visible transfer messages)
- Real-time progress tracking in thinking panel
- Clean, professional user experience

**Configuration**:
- `.env.example`: `USE_ADK_EVENTS=true` 
- `Dockerfile`: `ENV USE_ADK_EVENTS=true`
- Production builds will automatically use ADK events

### 2. Environment Variables

Essential production environment variables:

```bash
# Core Configuration
GOOGLE_API_KEY=your-production-api-key
VANA_MODEL=gemini-2.0-flash
GOOGLE_CLOUD_PROJECT=your-project-id
PORT=8080  # Cloud Run default

# ADK Event Streaming
USE_ADK_EVENTS=true  # Enabled by default

# Agent Configuration
VANA_AGENT_MODULE=agents.vana.team
VANA_ENABLE_SPECIALISTS=true
VANA_MAX_TOOLS_PER_AGENT=6

# Session Management
SESSION_SERVICE_TYPE=in_memory  # Or 'persistent' for production
DATABASE_URL=your-database-url  # If using persistent sessions

# Optional Services
GOOGLE_CSE_ID=your-cse-id  # For custom search engine
```

## 🏗️ Architecture Clarification

### VANA Runtime Memory (Production)
- **Location**: `lib/_shared_libraries/adk_memory_service.py`
- **Purpose**: Agent coordination and task history
- **Storage**: In-memory (dev) or vector DB (production)
- **Usage**: Automatically managed by VANA agents

### MCP Servers (VS Code Development Tools Only)
- **Location**: `lib/mcp/servers/` and `scripts/`
- **Purpose**: Local development tools for VS Code Claude integration
- **NOT used in production runtime**
- **Examples**:
  - Memory MCP: Development context management
  - Chroma MCP: Semantic search during development

## 📦 Deployment Steps

### 1. Google Cloud Run

```bash
# Build and tag image
docker build -t gcr.io/your-project/vana:latest .

# Push to Container Registry
docker push gcr.io/your-project/vana:latest

# Deploy to Cloud Run
gcloud run deploy vana \
  --image gcr.io/your-project/vana:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="USE_ADK_EVENTS=true,GOOGLE_API_KEY=your-key"
```

### 2. Docker Compose (Self-Hosted)

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  vana:
    build: .
    ports:
      - "80:8081"
    environment:
      - USE_ADK_EVENTS=true
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - VANA_MODEL=gemini-2.0-flash
    volumes:
      - ./sessions:/app/sessions  # For persistent sessions
```

### 3. Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vana
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: vana
        image: gcr.io/your-project/vana:latest
        env:
        - name: USE_ADK_EVENTS
          value: "true"
        - name: GOOGLE_API_KEY
          valueFrom:
            secretKeyRef:
              name: vana-secrets
              key: google-api-key
```

## 🔍 Monitoring & Validation

### 1. Verify ADK Events

Check backend logs for:
```
INFO:main:ADK Event Streaming: ENABLED
```

### 2. Test Silent Handoffs

Query examples to verify no transfer messages:
- "What security vulnerabilities should I check?"
- "Analyze trends in our data"
- "Review my architecture"

### 3. Monitor Performance

Key metrics:
- Event processing latency: <100ms
- Transfer message leakage: 0%
- Specialist activation rate: >90%

## 🛡️ Security Considerations

1. **API Keys**: Use secret management (not env vars in production)
2. **CORS**: Configure allowed origins in `main.py`
3. **Authentication**: Implement if required
4. **Rate Limiting**: Add for public deployments

## 📊 Scaling Considerations

1. **Session Service**: Use persistent storage for multi-instance deployments
2. **Memory Service**: Configure vector DB for production memory
3. **Model Selection**: Consider Gemini model quotas
4. **Caching**: Implement Redis for session/response caching

## 🚨 Troubleshooting

### Issue: Transfer Messages Still Visible
- Verify `USE_ADK_EVENTS=true` in environment
- Check browser cache (clear and reload)
- Confirm latest frontend build

### Issue: Slow Event Processing
- Check model API quotas
- Monitor event queue size
- Consider increasing instance resources

### Issue: Sessions Not Persisting
- Switch to persistent session service
- Configure DATABASE_URL
- Check database connectivity

## 📝 Post-Deployment Checklist

- [ ] ADK events enabled (check logs)
- [ ] No transfer messages in chat
- [ ] Thinking panel shows real events
- [ ] API keys secured
- [ ] CORS properly configured
- [ ] Monitoring enabled
- [ ] Backup strategy implemented
- [ ] Scaling policies configured

## 🎯 Success Criteria

Your VANA deployment is successful when:
1. Users see clean responses without transfer messages
2. Thinking panel shows real-time agent activity
3. Specialists are invoked for appropriate queries
4. Response times are under 2 seconds
5. System handles concurrent users smoothly

---

**Note**: MCP servers (memory, chroma) are VS Code development tools and are NOT part of the production deployment. VANA's production memory is handled by the ADK memory service.
# 🚨 Troubleshooting Guide

This guide helps you diagnose and resolve common issues with VANA.

## 🔍 Quick Diagnostics

### System Health Check
```bash
# Check overall system health
curl https://vana-prod-960076421399.us-central1.run.app/api/health

# Local development health check
curl http://localhost:8080/api/health
```

### Log Analysis
```bash
# View recent logs (local)
tail -f logs/vana.log

# View Cloud Run logs
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=vana" --limit=50
```

### Performance Metrics
```bash
# Check system performance
curl https://vana-prod-960076421399.us-central1.run.app/api/metrics

# Agent-specific status
curl https://vana-prod-960076421399.us-central1.run.app/api/agents
```

## 🚫 Common Issues

### 1. VANA Won't Start

#### Symptoms
- Service fails to start
- Import errors in logs
- Port binding failures

#### Diagnosis
```bash
# Check Python environment
python --version
poetry --version

# Verify dependencies
poetry install --dry-run

# Check port availability
lsof -i :8080
```

#### Solutions

**Poetry Environment Issues:**
```bash
# Clear Poetry cache
poetry cache clear pypi --all

# Recreate virtual environment
poetry env remove python
poetry install

# Use specific Python version
poetry env use python3.11
```

**Import Errors:**
```bash
# Check Python path
python -c "import sys; print(sys.path)"

# Verify package installation
poetry show

# Reinstall problematic packages
poetry remove package-name
poetry add package-name
```

**Port Conflicts:**
```bash
# Kill process using port 8080
sudo lsof -ti:8080 | xargs kill -9

# Use different port
export PORT=8081
python main.py
```

### 2. Authentication Failures

#### Symptoms
- 401 Unauthorized errors
- Google Cloud authentication issues
- API key validation failures

#### Diagnosis
```bash
# Check Google Cloud authentication
gcloud auth list
gcloud auth application-default print-access-token

# Verify service account
gcloud iam service-accounts list

# Check API key configuration
grep -E "(API_KEY|TOKEN)" .env.local
```

#### Solutions

**Google Cloud Authentication:**
```bash
# Re-authenticate
gcloud auth application-default login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Verify permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID
```

**Service Account Issues:**
```bash
# Create new service account key
gcloud iam service-accounts keys create key.json \
    --iam-account=vana-service@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Update environment variable
export GOOGLE_APPLICATION_CREDENTIALS=./key.json
```

**API Key Problems:**
```bash
# Verify API key format
echo $BRAVE_SEARCH_API_KEY | wc -c

# Test API key
curl -H "X-Subscription-Token: $BRAVE_SEARCH_API_KEY" \
     "https://api.search.brave.com/res/v1/web/search?q=test"
```

### 3. Performance Issues

#### Symptoms
- Slow response times
- High memory usage
- Timeout errors

#### Diagnosis
```bash
# Monitor resource usage
top -p $(pgrep -f "python main.py")

# Check memory usage
ps aux | grep python

# Monitor network connections
netstat -an | grep :8080
```

#### Solutions

**Memory Optimization:**
```bash
# Increase memory limit (Cloud Run)
gcloud run services update vana \
    --memory=4Gi \
    --region=us-central1

# Clear cache
rm -rf cache/*
python -c "import gc; gc.collect()"
```

**Performance Tuning:**
```bash
# Adjust concurrency settings
export MAX_CONCURRENT_TASKS=20
export CACHE_TTL=1800

# Enable performance monitoring
export ENABLE_METRICS=true
export LOG_LEVEL=WARNING
```

**Timeout Configuration:**
```bash
# Increase timeout limits
export REQUEST_TIMEOUT=600
export TOOL_TIMEOUT=300

# Configure Cloud Run timeout
gcloud run services update vana \
    --timeout=900 \
    --region=us-central1
```

### 4. Agent Communication Failures

#### Symptoms
- Agent not responding
- Tool execution failures
- Coordination errors

#### Diagnosis
```bash
# Check agent status
curl http://localhost:8080/api/agents

# Test specific agent
curl -X POST http://localhost:8080/api/tools/echo \
     -H "Content-Type: application/json" \
     -d '{"parameters": {"message": "test"}}'

# Check agent logs
grep "agent_name" logs/agents.log
```

#### Solutions

**Agent Registration Issues:**
```bash
# Verify agent configuration
python -c "
from agents.vana.agent import VanaAgent
agent = VanaAgent()
print('Agent tools:', agent.tools)
"

# Restart agent system
python scripts/restart_agents.py
```

**Tool Registration Problems:**
```bash
# Check tool imports
python -c "
from lib._tools import get_all_tools
tools = get_all_tools()
print(f'Loaded {len(tools)} tools')
"

# Verify tool functions
python scripts/validate_tools.py
```

### 5. Vector Search Issues

#### Symptoms
- Search returning no results
- Embedding failures
- Index connection errors

#### Diagnosis
```bash
# Test vector search connection
python -c "
from lib.vector_search.client import VectorSearchClient
client = VectorSearchClient()
print('Connection status:', client.health_check())
"

# Check index status
gcloud ai indexes list --region=us-central1

# Verify endpoint deployment
gcloud ai index-endpoints list --region=us-central1
```

#### Solutions

**Connection Issues:**
```bash
# Verify endpoint configuration
export VECTOR_SEARCH_ENDPOINT=your-endpoint-id
export VECTOR_SEARCH_INDEX=your-index-id

# Test connectivity
python scripts/test_vector_search.py
```

**Index Problems:**
```bash
# Rebuild vector index
python scripts/rebuild_vector_index.py

# Check index health
python scripts/vector_search_health_check.py
```

### 6. Web Search Functionality Issues

#### Symptoms
- Web search queries return "The web search failed" instead of real-time data
- Time queries fail: "What time is it in Tokyo?" → "The web search failed"
- Weather queries fail: "What's the weather in London?" → "The web search failed"
- Agent shows web_search tool calls in Events tab but returns error responses
- Preloaded responses instead of live data

#### Diagnosis
```bash
# Check if web search tool is being called
# Look for web_search function calls in agent Events tab

# Test API key access locally
python -c "
import os
from lib.environment import setup_environment
setup_environment()
print('BRAVE_API_KEY set:', bool(os.getenv('BRAVE_API_KEY')))
"

# Check Cloud Run service account
gcloud run services describe YOUR_SERVICE_NAME \
    --region=us-central1 \
    --project=YOUR_PROJECT_ID \
    --format="value(spec.template.spec.serviceAccountName)"

# Verify Secret Manager permissions
gcloud secrets get-iam-policy brave-api-key --project=YOUR_PROJECT_ID
```

#### Solutions

**Root Cause:** Cloud Run service account lacks Secret Manager permissions

**Step 1: Identify Service Account**
```bash
SERVICE_ACCOUNT=$(gcloud run services describe YOUR_SERVICE_NAME \
    --region=us-central1 \
    --project=YOUR_PROJECT_ID \
    --format="value(spec.template.spec.serviceAccountName)")
echo "Service Account: $SERVICE_ACCOUNT"
```

**Step 2: Grant Secret Manager Access**
```bash
gcloud secrets add-iam-policy-binding brave-api-key \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" \
    --project=YOUR_PROJECT_ID
```

**Step 3: Redeploy Service**
```bash
gcloud run deploy YOUR_SERVICE_NAME \
    --source . \
    --region us-central1 \
    --project YOUR_PROJECT_ID
```

**Step 4: Verify Fix**
Test with queries like:
- "What time is it in Tokyo?" → Should return "The current time in Tokyo is XX:XX AM/PM"
- "What's the weather in London?" → Should return "The weather in London is [conditions]"

### 7. API Rate Limiting

#### Symptoms
- 429 Too Many Requests errors
- API quota exceeded messages
- Slow API responses

#### Diagnosis
```bash
# Check API usage
gcloud logging read "protoPayload.methodName=search" --limit=100

# Monitor rate limits
curl -H "X-Subscription-Token: $BRAVE_SEARCH_API_KEY" \
     "https://api.search.brave.com/res/v1/web/search?q=test" -I
```

#### Solutions

**Rate Limit Configuration:**
```bash
# Adjust rate limits
export BRAVE_SEARCH_RATE_LIMIT=50
export VERTEX_AI_RATE_LIMIT=30

# Implement backoff strategy
export ENABLE_EXPONENTIAL_BACKOFF=true
export MAX_RETRY_ATTEMPTS=3
```

**API Quota Management:**
```bash
# Monitor quotas
gcloud logging read "protoPayload.authenticationInfo.principalEmail" --limit=50

# Request quota increase
# Visit Google Cloud Console > IAM & Admin > Quotas
```

## 🔧 Advanced Troubleshooting

### Debug Mode

#### Enable Debug Logging
```bash
# Local development
export DEBUG=true
export LOG_LEVEL=DEBUG
python main.py

# Production (temporary)
gcloud run services update vana \
    --set-env-vars="LOG_LEVEL=DEBUG" \
    --region=us-central1
```

#### Verbose Tool Execution
```bash
# Enable tool debugging
export TOOL_DEBUG=true
export TRACE_TOOL_EXECUTION=true

# Monitor tool performance
tail -f logs/tools.log | grep "execution_time"
```

### Network Diagnostics

#### Connectivity Tests
```bash
# Test external API connectivity
curl -I https://api.search.brave.com/res/v1/web/search
curl -I https://aiplatform.googleapis.com

# Check DNS resolution
nslookup vana-qqugqgsbcq-uc.a.run.app

# Test internal connectivity
curl http://localhost:8080/api/health
```

#### Firewall and Security
```bash
# Check Cloud Run ingress settings
gcloud run services describe vana --region=us-central1

# Verify IAM permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:vana-service@*"
```

### Database and Storage Issues

#### Vector Search Diagnostics
```bash
# Test vector search health
python scripts/comprehensive_vector_search_test.py

# Check index statistics
gcloud ai indexes describe INDEX_ID --region=us-central1

# Verify embeddings
python scripts/test_embeddings.py
```

#### Cache Issues
```bash
# Clear all caches
rm -rf cache/*
redis-cli FLUSHALL  # if using Redis

# Test cache connectivity
python -c "
from lib.caching import CacheManager
cache = CacheManager()
print('Cache status:', cache.health_check())
"
```

## 📊 Monitoring and Alerting

### Set Up Monitoring

#### Cloud Monitoring Alerts
```bash
# Create error rate alert
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/high-error-rate.yaml

# Create latency alert
gcloud alpha monitoring policies create \
    --policy-from-file=monitoring/high-latency.yaml
```

#### Custom Metrics
```bash
# Enable custom metrics
export ENABLE_CUSTOM_METRICS=true

# Monitor specific operations
python scripts/setup_custom_metrics.py
```

### Log Analysis

#### Structured Logging
```bash
# Search for specific errors
gcloud logs read 'jsonPayload.level="ERROR"' --limit=50

# Filter by component
gcloud logs read 'jsonPayload.component="vector_search"' --limit=20

# Time-based filtering
gcloud logs read 'timestamp>="2024-01-15T10:00:00Z"' --limit=100
```

#### Error Patterns
```bash
# Common error patterns
grep -E "(ERROR|CRITICAL|FATAL)" logs/vana.log | tail -20

# Tool-specific errors
grep "tool_execution_failed" logs/tools.log

# Agent communication errors
grep "agent_communication_error" logs/agents.log
```

## 🆘 Emergency Procedures

### Service Recovery

#### Quick Restart
```bash
# Local development
pkill -f "python main.py"
python main.py

# Cloud Run
gcloud run services update vana \
    --set-env-vars="RESTART_TIMESTAMP=$(date +%s)" \
    --region=us-central1
```

#### Rollback Deployment
```bash
# Rollback to previous version
gcloud run services update vana \
    --image=gcr.io/PROJECT_ID/vana:previous-version \
    --region=us-central1

# Check deployment history
gcloud run revisions list --service=vana --region=us-central1
```

### Data Recovery

#### Backup and Restore
```bash
# Backup vector index
python scripts/backup_vector_index.py

# Restore from backup
python scripts/restore_vector_index.py --backup-date=2024-01-15
```

#### Cache Rebuild
```bash
# Rebuild all caches
python scripts/rebuild_caches.py

# Warm up critical caches
python scripts/warmup_caches.py
```

## 📞 Getting Help

### Support Channels

1. **GitHub Issues**: [Create an issue](https://github.com/NickB03/vana/issues)
2. **Documentation**: Check relevant guides and references
3. **Logs**: Always include relevant log snippets
4. **System Info**: Provide environment and configuration details

### Information to Include

When reporting issues, include:
- **Error messages** - Complete error text and stack traces
- **Environment** - Local vs production, OS, Python version
- **Configuration** - Relevant environment variables (redact secrets)
- **Steps to reproduce** - Detailed reproduction steps
- **Expected vs actual behavior** - What should happen vs what happens
- **Logs** - Relevant log entries with timestamps

### Emergency Contacts

For critical production issues:
- **Escalation**: Create urgent GitHub issue with "CRITICAL" label
- **Monitoring**: Check Cloud Monitoring dashboards
- **Status**: Monitor service health at `/api/health`

---

**🔧 Still having issues?** Create a detailed issue on [GitHub](https://github.com/NickB03/vana/issues) with logs and reproduction steps.

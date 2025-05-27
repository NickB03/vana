# ADK Memory Troubleshooting Guide

This guide provides step-by-step troubleshooting procedures for common ADK memory issues in the VANA system.

## Quick Diagnostic Checklist

Before diving into specific issues, run this quick diagnostic:

```bash
# 1. Check ADK memory status
curl http://localhost:5050/api/adk-memory/status

# 2. Get diagnostic information
curl http://localhost:5050/api/adk-memory/diagnostics

# 3. Check recent errors
curl http://localhost:5050/api/adk-memory/reliability
```

## Common Issues and Solutions

### 1. ADK Not Available / Mock Data Mode

#### Symptoms
- Dashboard shows "Using Mock Data (ADK not available)"
- API responses contain `"adk_available": false`
- Error: "Google ADK not available"

#### Diagnosis
```bash
# Check if ADK is installed
python -c "import google.adk.memory; print('ADK available')"

# Check environment variables
echo $RAG_CORPUS_RESOURCE_NAME
echo $GOOGLE_CLOUD_PROJECT
```

#### Solutions

**Step 1: Install Google ADK**
```bash
pip install google-adk[vertexai]
```

**Step 2: Set Environment Variables**
```bash
export RAG_CORPUS_RESOURCE_NAME="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
export SIMILARITY_TOP_K=5
export VECTOR_DISTANCE_THRESHOLD=0.7
export GOOGLE_CLOUD_PROJECT="analystai-454200"
export VERTEX_AI_REGION="us-central1"
```

**Step 3: Configure Authentication**
```bash
# Option 1: Service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Option 2: gcloud auth
gcloud auth application-default login
```

**Step 4: Verify RAG Corpus Access**
```bash
# Test RAG Corpus access
gcloud ai rag-corpora describe vana-corpus \
  --location=us-central1 \
  --project=analystai-454200
```

### 2. High Query Latency

#### Symptoms
- Average query latency > 500ms
- Dashboard shows "High latency" warnings
- Slow response times in applications

#### Diagnosis
```python
from dashboard.monitoring.adk_memory_logger import adk_memory_logger

# Analyze recent performance
analysis = adk_memory_logger.analyze_performance(hours=1)
print(f"Average latency: {analysis.get('average_latency_ms', 0):.1f}ms")

# Check operation logs
operations = adk_memory_logger.get_operation_logs(hours=1)
slow_ops = [op for op in operations if op.get('latency_ms', 0) > 500]
print(f"Slow operations: {len(slow_ops)}")
```

#### Solutions

**Step 1: Check Network Connectivity**
```bash
# Test connectivity to Google Cloud
ping googleapis.com

# Check DNS resolution
nslookup vertex-ai.googleapis.com
```

**Step 2: Optimize Query Parameters**
```python
# Reduce similarity threshold for faster results
export VECTOR_DISTANCE_THRESHOLD=0.8

# Reduce number of results
export SIMILARITY_TOP_K=3
```

**Step 3: Monitor System Resources**
```bash
# Check CPU and memory usage
top
htop

# Check disk I/O
iostat -x 1
```

**Step 4: Enable Query Caching**
```python
# Implement local caching for frequent queries
from functools import lru_cache

@lru_cache(maxsize=100)
def cached_memory_query(query_text):
    return memory_service.search_memory(query_text)
```

### 3. High Error Rate

#### Symptoms
- Error rate > 5%
- Frequent operation failures
- Alert: "High error rate detected"

#### Diagnosis
```python
# Get recent errors
errors = adk_memory_logger.get_error_logs(hours=1)
print(f"Recent errors: {len(errors)}")

# Analyze error patterns
error_types = {}
for error in errors:
    error_type = error.get('error_type', 'unknown')
    error_types[error_type] = error_types.get(error_type, 0) + 1

print("Error patterns:", error_types)
```

#### Solutions

**Step 1: Check Authentication**
```bash
# Verify credentials
gcloud auth list

# Test API access
gcloud ai rag-corpora list --location=us-central1
```

**Step 2: Verify RAG Corpus Status**
```bash
# Check corpus health
gcloud ai rag-corpora describe vana-corpus \
  --location=us-central1 \
  --project=analystai-454200
```

**Step 3: Review Query Patterns**
```python
# Check for malformed queries
operations = adk_memory_logger.get_operation_logs(hours=1)
failed_ops = [op for op in operations if not op.get('success', True)]

for op in failed_ops[:5]:  # Review first 5 failures
    print(f"Failed query: {op.get('query_text', 'N/A')}")
    print(f"Error: {op.get('error_message', 'N/A')}")
```

**Step 4: Implement Retry Logic**
```python
import time
from functools import wraps

def retry_on_failure(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(delay * (2 ** attempt))  # Exponential backoff
            return None
        return wrapper
    return decorator
```

### 4. Session Persistence Issues

#### Symptoms
- Session persistence rate < 95%
- Lost session data
- Alert: "Session persistence issues detected"

#### Diagnosis
```python
# Analyze session health
session_health = adk_memory_logger.analyze_session_health(hours=1)
print(f"Persistence rate: {session_health.get('persistence_success_rate', 0):.2%}")

# Check session logs
sessions = adk_memory_logger.get_session_logs(hours=1)
failed_sessions = [s for s in sessions if not s.get('persistence_success', True)]
print(f"Failed sessions: {len(failed_sessions)}")
```

#### Solutions

**Step 1: Check Session Storage**
```bash
# Verify session service configuration
curl http://localhost:5050/api/adk-memory/diagnostics | jq '.data.service_health'
```

**Step 2: Optimize Session State Size**
```python
# Monitor session state sizes
sessions = adk_memory_logger.get_session_logs(hours=1)
large_sessions = [s for s in sessions if s.get('state_size_mb', 0) > 10]
print(f"Large sessions: {len(large_sessions)}")

# Implement state compression
import json
import gzip

def compress_session_state(state):
    json_str = json.dumps(state)
    return gzip.compress(json_str.encode())

def decompress_session_state(compressed_state):
    json_str = gzip.decompress(compressed_state).decode()
    return json.loads(json_str)
```

**Step 3: Implement Session Cleanup**
```python
import datetime

def cleanup_old_sessions(max_age_hours=24):
    cutoff_time = datetime.datetime.now() - datetime.timedelta(hours=max_age_hours)
    # Remove sessions older than cutoff_time
    pass
```

### 5. High Costs

#### Symptoms
- Daily costs > $100
- Unexpected cost spikes
- Alert: "High daily cost"

#### Diagnosis
```bash
# Check current costs
curl http://localhost:5050/api/adk-memory/costs

# Get cost history
curl "http://localhost:5050/api/adk-memory/cost-history?hours=24"
```

#### Solutions

**Step 1: Analyze Query Patterns**
```python
# Check query volume
operations = adk_memory_logger.get_operation_logs(hours=24)
query_count = len([op for op in operations if op.get('operation_type') == 'query'])
print(f"Daily queries: {query_count}")

# Identify expensive operations
expensive_ops = [op for op in operations if op.get('cost_estimate_usd', 0) > 0.01]
print(f"Expensive operations: {len(expensive_ops)}")
```

**Step 2: Optimize Query Efficiency**
```python
# Implement query deduplication
from functools import lru_cache
import hashlib

def get_query_hash(query_text):
    return hashlib.md5(query_text.encode()).hexdigest()

# Cache recent queries
query_cache = {}

def cached_query(query_text):
    query_hash = get_query_hash(query_text)
    if query_hash in query_cache:
        return query_cache[query_hash]
    
    result = memory_service.search_memory(query_text)
    query_cache[query_hash] = result
    return result
```

**Step 3: Set Cost Alerts**
```python
# Configure cost thresholds
daily_cost_threshold = 50.0  # $50 per day
hourly_cost_threshold = 5.0  # $5 per hour

# Monitor costs and alert
def check_cost_thresholds():
    cost_data = adk_memory_api.get_cost_metrics()
    if cost_data.get('status') == 'success':
        daily_cost = cost_data['data']['daily_costs']['total_cost_usd']
        if daily_cost > daily_cost_threshold:
            # Trigger alert
            pass
```

### 6. Memory Storage Issues

#### Symptoms
- Memory storage growing rapidly
- Storage size > 1GB
- Performance degradation

#### Diagnosis
```bash
# Check memory usage
curl http://localhost:5050/api/adk-memory/metrics | jq '.data.storage'
```

#### Solutions

**Step 1: Implement Data Retention**
```python
import datetime

def cleanup_old_memory_data(retention_days=30):
    cutoff_date = datetime.datetime.now() - datetime.timedelta(days=retention_days)
    # Remove memory data older than cutoff_date
    pass
```

**Step 2: Optimize Data Storage**
```python
# Implement data compression
def compress_memory_data(data):
    # Compress large text data
    pass

# Remove duplicate entries
def deduplicate_memory_data():
    # Remove similar or duplicate memory entries
    pass
```

## Advanced Troubleshooting

### Performance Profiling

```python
import cProfile
import pstats

def profile_memory_operation():
    profiler = cProfile.Profile()
    profiler.enable()
    
    # Perform memory operation
    result = memory_service.search_memory("test query")
    
    profiler.disable()
    stats = pstats.Stats(profiler)
    stats.sort_stats('cumulative')
    stats.print_stats(10)  # Top 10 functions
```

### Memory Leak Detection

```python
import tracemalloc
import gc

def detect_memory_leaks():
    tracemalloc.start()
    
    # Perform operations
    for i in range(100):
        memory_service.search_memory(f"test query {i}")
    
    current, peak = tracemalloc.get_traced_memory()
    print(f"Current memory usage: {current / 1024 / 1024:.1f} MB")
    print(f"Peak memory usage: {peak / 1024 / 1024:.1f} MB")
    
    tracemalloc.stop()
    gc.collect()  # Force garbage collection
```

### Network Diagnostics

```bash
# Test network latency to Google Cloud
ping -c 10 googleapis.com

# Test bandwidth
curl -o /dev/null -s -w "%{time_total}\n" https://googleapis.com

# Check DNS resolution time
dig googleapis.com
```

## Monitoring and Alerting Setup

### Custom Alerts

```python
from dashboard.alerting.alert_manager import AlertManager

alert_manager = AlertManager()

# Create custom ADK memory alert
def create_custom_alert(condition, message):
    if condition:
        alert_manager.create_alert(
            message=message,
            severity="warning",
            source="adk_memory.custom"
        )

# Example: Alert on high query volume
operations = adk_memory_logger.get_operation_logs(hours=1)
if len(operations) > 1000:
    create_custom_alert(True, "High query volume detected: {len(operations)} queries in last hour")
```

### Health Check Automation

```bash
#!/bin/bash
# health_check.sh - Automated health check script

# Check ADK memory status
status=$(curl -s http://localhost:5050/api/adk-memory/status | jq -r '.status')

if [ "$status" != "ok" ]; then
    echo "ADK Memory health check failed: $status"
    # Send notification
    # curl -X POST webhook_url -d "ADK Memory issue detected"
fi
```

## Recovery Procedures

### Service Recovery

```bash
# 1. Restart monitoring service
sudo systemctl restart adk-memory-monitor

# 2. Clear cache and restart
rm -rf /tmp/adk_memory_cache/*
sudo systemctl restart dashboard-api

# 3. Reinitialize ADK memory service
python -c "
from dashboard.monitoring.adk_memory_monitor import adk_memory_monitor
adk_memory_monitor.__init__()
print('ADK Memory Monitor reinitialized')
"
```

### Data Recovery

```python
# Backup current state
import json
import datetime

def backup_memory_state():
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"adk_memory_backup_{timestamp}.json"
    
    # Get current metrics
    metrics = adk_memory_api.get_metrics()
    
    with open(backup_file, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print(f"Backup saved to {backup_file}")

# Restore from backup
def restore_memory_state(backup_file):
    with open(backup_file, 'r') as f:
        backup_data = json.load(f)
    
    # Restore configuration
    # ... implementation depends on backup format
```

## Prevention Strategies

### Proactive Monitoring

1. **Set up automated health checks** every 5 minutes
2. **Monitor cost trends** daily
3. **Review error patterns** weekly
4. **Analyze performance trends** monthly

### Capacity Planning

```python
def predict_capacity_needs():
    # Analyze growth trends
    history = adk_memory_api.get_history(hours=24*7)  # 7 days
    
    # Calculate growth rate
    # Predict future needs
    # Recommend scaling actions
    pass
```

### Best Practices

1. **Regular Backups**: Backup configuration and critical data
2. **Monitoring Alerts**: Set appropriate thresholds
3. **Performance Testing**: Regular load testing
4. **Documentation**: Keep troubleshooting logs
5. **Training**: Ensure team knows troubleshooting procedures

## Getting Help

### Log Analysis

```bash
# Collect diagnostic information
mkdir -p /tmp/adk_memory_diagnostics
cp logs/adk_memory/* /tmp/adk_memory_diagnostics/
curl http://localhost:5050/api/adk-memory/diagnostics > /tmp/adk_memory_diagnostics/diagnostics.json

# Create support bundle
tar -czf adk_memory_support_$(date +%Y%m%d_%H%M%S).tar.gz /tmp/adk_memory_diagnostics/
```

### Contact Information

For escalation:
1. Check this troubleshooting guide
2. Review system logs and diagnostics
3. Consult ADK documentation
4. Contact development team with support bundle

---

This troubleshooting guide covers the most common ADK memory issues and their solutions. Keep this guide updated as new issues are discovered and resolved.

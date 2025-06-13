# VANA Monitoring and Security Framework

## Overview

The VANA Monitoring and Security Framework provides comprehensive performance monitoring, logging systems, and security hardening measures for the VANA agent system. This framework enables real-time observability, security protection, and operational excellence.

## Components

### 1. Performance Monitoring (`lib/monitoring/`)

#### PerformanceMonitor
- **Real-time metrics collection** with configurable retention
- **Response time tracking** for agents and tools
- **System resource monitoring** (CPU, memory)
- **Threshold-based alerting** with warning and critical levels
- **Statistical summaries** and time-based filtering

#### APM (Application Performance Monitoring)
- **Function decorators** for automatic performance tracking
- **Async function support** for modern Python applications
- **Error tracking** and success rate monitoring
- **Automatic metric recording** with minimal code changes

#### MonitoringIntegration
- **Configuration-driven setup** with YAML configuration
- **Global monitoring instance** for easy access
- **VANA-specific helpers** for agent and tool monitoring
- **Health status reporting** for system overview

### 2. Security Framework (`lib/security/`)

#### SecurityManager
- **Input validation** with pattern-based threat detection
- **Rate limiting** with configurable windows and limits
- **IP blocking** with automatic threat response
- **CSRF protection** with token generation and validation
- **Security event logging** for audit and analysis

#### SecurityIntegration
- **Configuration-driven policies** with YAML configuration
- **VANA-specific validation** for agent inputs and requests
- **Security headers** for HTTP responses
- **Security status reporting** for monitoring

### 3. Centralized Logging (`lib/logging/`)

#### StructuredLogger
- **JSON-formatted logs** for Cloud Run and Google Cloud Logging
- **Correlation IDs** for request tracing across components
- **Component-based logging** with hierarchical organization
- **Metadata support** for rich contextual information

## Configuration

### Monitoring Configuration (`config/monitoring/monitoring.yaml`)

```yaml
performance_monitoring:
  retention_minutes: 60
  collection_interval: 30

thresholds:
  response_time:
    warning: 2.0
    critical: 5.0
  memory_usage:
    warning: 80.0
    critical: 90.0

alerting:
  enabled: true
  channels:
    - type: "log"
      level: "warning"

logging:
  level: "INFO"
  format: "json"
  correlation_id_header: "X-Correlation-ID"
```

### Security Configuration (`config/security/security_policies.yaml`)

```yaml
input_validation:
  max_input_length: 10000
  forbidden_patterns:
    - '<script[^>]*>.*?</script>'
    - 'union\s+select'

rate_limiting:
  default_limit: 100
  window_seconds: 60

ip_blocking:
  auto_block_on_critical: true
  block_duration_hours: 24

headers:
  security_headers:
    X-Content-Type-Options: "nosniff"
    X-Frame-Options: "DENY"
```

## Usage Examples

### Basic Integration

```python
from lib.monitoring import get_monitoring
from lib.security import get_security
from lib.logging import StructuredLogger

# Get global instances
monitoring = get_monitoring()
security = get_security()
logger = StructuredLogger("my_component")

# Record metrics
monitoring.record_agent_response("my_agent", 1.5, success=True)
monitoring.record_tool_execution("search_tool", 0.3, success=True)

# Validate input
is_valid, message = security.validate_agent_input(user_input, source_ip)

# Log with correlation
logger.info("Processing request", user_id="123", action="search")
```

### Using APM Decorators

```python
from lib.monitoring import get_monitoring

monitoring = get_monitoring()
apm = monitoring.get_apm()

@apm.trace(operation_name="agent_processing")
def process_agent_request(request):
    # Function execution is automatically monitored
    return handle_request(request)

@apm.trace_async(operation_name="async_tool_execution")
async def execute_tool_async(tool_name, params):
    # Async function execution is automatically monitored
    return await tool_execution(tool_name, params)
```

### Security Validation

```python
from lib.security import get_security

security = get_security()

# Validate input
is_valid, message = security.validate_agent_input(user_input, source_ip)
if not is_valid:
    return {"error": "Invalid input", "details": message}

# Check rate limits
if not security.check_request_rate_limit(user_id, source_ip):
    return {"error": "Rate limit exceeded"}

# Generate CSRF token
csrf_token = security.security_manager.generate_csrf_token(session_id, secret_key)
```

## Integration with Existing VANA Components

### Agent Integration

```python
class VanaAgent:
    def __init__(self, agent_name):
        self.monitoring = get_monitoring()
        self.security = get_security()
        self.logger = StructuredLogger(f"agent.{agent_name}")
    
    def process_request(self, request, source_ip):
        # Security validation
        is_valid, message = self.security.validate_agent_input(request, source_ip)
        if not is_valid:
            return {"error": message}
        
        # Process with monitoring
        start_time = time.time()
        try:
            result = self._process(request)
            success = True
        except Exception as e:
            result = {"error": str(e)}
            success = False
        finally:
            duration = time.time() - start_time
            self.monitoring.record_agent_response(self.agent_name, duration, success)
        
        return result
```

### FastAPI Integration

```python
from fastapi import FastAPI, Request
from lib.security import get_security

app = FastAPI()
security = get_security()

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    # Add security headers
    response = await call_next(request)
    headers = security.get_security_headers()
    for key, value in headers.items():
        response.headers[key] = value
    return response

@app.post("/agent/process")
async def process_agent_request(request: dict, request_info: Request):
    source_ip = request_info.client.host
    
    # Validate input
    is_valid, message = security.validate_agent_input(str(request), source_ip)
    if not is_valid:
        return {"error": message}
    
    # Process request...
```

## Monitoring and Alerting

### Health Status Endpoint

```python
@app.get("/health/detailed")
async def detailed_health():
    monitoring = get_monitoring()
    security = get_security()
    
    return {
        "monitoring": monitoring.get_health_status(),
        "security": security.get_security_status(),
        "timestamp": time.time()
    }
```

### Custom Metrics

```python
# Record custom business metrics
monitoring.monitor.record_metric("user_sessions", session_count, "count")
monitoring.monitor.record_metric("api_calls", call_count, "count", tags={"endpoint": "/search"})

# Set custom thresholds
monitoring.monitor.set_threshold("user_sessions", warning=1000, critical=1500)
```

## Testing

Run the comprehensive test suite:

```bash
# Unit tests
pytest tests/unit/monitoring/ -v
pytest tests/unit/security/ -v
pytest tests/unit/logging/ -v

# Integration tests
pytest tests/integration/test_monitoring_security_integration.py -v

# All tests
pytest tests/ -v
```

## Performance Considerations

- **Lightweight monitoring**: Minimal overhead on application performance
- **Configurable retention**: Automatic cleanup of old metrics
- **Async-compatible**: Works with async/await patterns
- **Memory efficient**: Uses deques with maximum length for metric storage
- **Cloud Run optimized**: Designed for serverless environments

## Security Features

- **Input validation**: Prevents XSS, SQL injection, path traversal
- **Rate limiting**: Protects against abuse and DoS attacks
- **IP blocking**: Automatic blocking of malicious IPs
- **CSRF protection**: Token-based CSRF prevention
- **Security headers**: Automatic security header injection
- **Audit logging**: Comprehensive security event logging

## Best Practices

1. **Use global instances**: Access monitoring and security through `get_monitoring()` and `get_security()`
2. **Configure thresholds**: Set appropriate warning and critical thresholds for your use case
3. **Use correlation IDs**: Include correlation IDs in logs for request tracing
4. **Monitor key metrics**: Track response times, error rates, and resource usage
5. **Validate all inputs**: Use security validation for all user inputs
6. **Review security events**: Regularly review security logs for threats
7. **Test configurations**: Validate monitoring and security configurations in development

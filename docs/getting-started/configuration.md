# ⚙️ Configuration Guide

This guide covers all configuration options for VANA, from basic setup to advanced customization.

## 📋 Environment Configuration

### Environment Files

VANA uses different environment files for different deployment scenarios:

- **`.env.local`** - Local development
- **`.env.production`** - Production deployment
- **`.env.test`** - Testing environment

### Basic Configuration

#### Required Variables
```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Vertex AI Configuration
VERTEX_AI_LOCATION=us-central1
VECTOR_SEARCH_ENDPOINT=your-endpoint-id
VECTOR_SEARCH_INDEX=your-index-id

# API Keys
BRAVE_SEARCH_API_KEY=your-brave-api-key

# Environment Settings
ENVIRONMENT=local
DEBUG=true
LOG_LEVEL=INFO
```

#### Optional Variables
```bash
# Performance Settings
MAX_CONCURRENT_TASKS=10
CACHE_TTL=3600
REQUEST_TIMEOUT=300

# Security Settings
ENABLE_CORS=true
ALLOWED_ORIGINS=https://yourdomain.com
ENABLE_RATE_LIMITING=true

# Feature Flags
ENABLE_WEB_SEARCH=true
ENABLE_VECTOR_SEARCH=true
ENABLE_FILE_OPERATIONS=true

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30
```

## 🔧 Agent Configuration

### Agent Settings

Configure individual agents in `agents/*/config.yaml`:

```yaml
# agents/vana/config.yaml
agent:
  name: "vana"
  description: "Master orchestrator agent"
  max_iterations: 10
  confidence_threshold: 0.8
  enable_memory: true

tools:
  default_timeout: 30
  retry_attempts: 3
  enable_caching: true

performance:
  max_concurrent_tools: 5
  tool_execution_timeout: 60
  memory_limit: "1GB"
```

### Tool Configuration

Configure tools in `lib/_tools/config.yaml`:

```yaml
# File System Tools
file_system:
  max_file_size: "10MB"
  allowed_extensions: [".txt", ".md", ".json", ".yaml", ".py"]
  base_directory: "/workspace"
  enable_write: true

# Search Tools
search:
  brave_search:
    rate_limit: 100  # requests per hour
    safe_search: "moderate"
    country: "US"

  vector_search:
    similarity_threshold: 0.7
    max_results: 10
    enable_reranking: true

# System Tools
system:
  health_check_interval: 30
  metrics_collection: true
  log_retention_days: 30
```

## 🌐 API Configuration

### REST API Settings

Configure the API server in `api/config.yaml`:

```yaml
server:
  host: "0.0.0.0"
  port: 8080
  workers: 4
  timeout: 300

cors:
  enabled: true
  origins: ["*"]
  methods: ["GET", "POST", "PUT", "DELETE"]
  headers: ["*"]

rate_limiting:
  enabled: true
  requests_per_minute: 100
  burst_size: 20

authentication:
  enabled: true
  method: "api_key"  # or "oauth", "jwt"
  api_key_header: "X-API-Key"
```

### WebSocket Configuration

For real-time features:

```yaml
websocket:
  enabled: true
  port: 8081
  max_connections: 100
  heartbeat_interval: 30
  message_size_limit: "1MB"
```

## 📊 Monitoring Configuration

### Logging Configuration

Configure logging in `logging.yaml`:

```yaml
version: 1
disable_existing_loggers: false

formatters:
  standard:
    format: "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
  json:
    format: "%(asctime)s %(name)s %(levelname)s %(message)s"
    class: "pythonjsonlogger.jsonlogger.JsonFormatter"

handlers:
  console:
    class: "logging.StreamHandler"
    level: "INFO"
    formatter: "standard"
    stream: "ext://sys.stdout"

  file:
    class: "logging.handlers.RotatingFileHandler"
    level: "DEBUG"
    formatter: "json"
    filename: "logs/vana.log"
    maxBytes: 10485760  # 10MB
    backupCount: 5

loggers:
  agents:
    level: "DEBUG"
    handlers: ["console", "file"]
    propagate: false

  tools:
    level: "INFO"
    handlers: ["console", "file"]
    propagate: false

  api:
    level: "INFO"
    handlers: ["console", "file"]
    propagate: false

root:
  level: "INFO"
  handlers: ["console", "file"]
```

### Metrics Configuration

Configure metrics collection:

```yaml
metrics:
  enabled: true
  port: 9090
  path: "/metrics"

  collectors:
    - system_metrics
    - agent_metrics
    - tool_metrics
    - api_metrics

  custom_metrics:
    - name: "vana_requests_total"
      type: "counter"
      description: "Total number of requests"
      labels: ["agent", "tool", "status"]

    - name: "vana_request_duration_seconds"
      type: "histogram"
      description: "Request duration in seconds"
      labels: ["agent", "tool"]
      buckets: [0.1, 0.5, 1.0, 2.5, 5.0, 10.0]
```

## 🔒 Security Configuration

### Authentication Settings

```yaml
security:
  authentication:
    enabled: true
    methods:
      - api_key
      - oauth2
      - jwt

    api_key:
      header_name: "X-API-Key"
      query_param: "api_key"

    oauth2:
      provider: "google"
      client_id: "${OAUTH_CLIENT_ID}"
      client_secret: "${OAUTH_CLIENT_SECRET}"

    jwt:
      secret_key: "${JWT_SECRET_KEY}"
      algorithm: "HS256"
      expiration: 3600  # 1 hour

  authorization:
    enabled: true
    default_role: "user"

    roles:
      admin:
        permissions: ["*"]

      user:
        permissions:
          - "chat:read"
          - "chat:write"
          - "health:read"

      readonly:
        permissions:
          - "health:read"
          - "metrics:read"
```

### Input Validation

```yaml
validation:
  enabled: true

  input_limits:
    max_message_length: 10000
    max_file_size: "10MB"
    max_request_size: "50MB"

  sanitization:
    enabled: true
    remove_html: true
    escape_sql: true
    validate_json: true

  rate_limiting:
    enabled: true
    window_size: 60  # seconds
    max_requests: 100
    burst_size: 20
```

## 🚀 Performance Configuration

### Caching Settings

```yaml
caching:
  enabled: true
  backend: "redis"  # or "memory", "file"

  redis:
    host: "localhost"
    port: 6379
    db: 0
    password: "${REDIS_PASSWORD}"

  settings:
    default_ttl: 3600  # 1 hour
    max_memory: "1GB"
    eviction_policy: "allkeys-lru"

  cache_policies:
    vector_search:
      ttl: 7200  # 2 hours
      max_size: 1000

    web_search:
      ttl: 1800  # 30 minutes
      max_size: 500

    file_operations:
      ttl: 300  # 5 minutes
      max_size: 100
```

### Connection Pooling

```yaml
connection_pools:
  vertex_ai:
    max_connections: 10
    timeout: 30
    retry_attempts: 3

  brave_search:
    max_connections: 5
    timeout: 15
    retry_attempts: 2

  database:
    max_connections: 20
    min_connections: 5
    timeout: 30
```

## 🌍 Environment-Specific Configuration

### Local Development

```bash
# .env.local
ENVIRONMENT=local
DEBUG=true
LOG_LEVEL=DEBUG

# Use local services
REDIS_URL=redis://localhost:6379
DATABASE_URL=sqlite:///local.db

# Relaxed security for development
ENABLE_CORS=true
ALLOWED_ORIGINS=*
DISABLE_AUTH=true
```

### Production

```bash
# .env.production
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Use production services
REDIS_URL=redis://production-redis:6379
DATABASE_URL=postgresql://user:pass@prod-db:5432/vana

# Strict security
ENABLE_CORS=false
ALLOWED_ORIGINS=https://yourdomain.com
ENABLE_AUTH=true
ENABLE_RATE_LIMITING=true
```

### Testing

```bash
# .env.test
ENVIRONMENT=test
DEBUG=true
LOG_LEVEL=WARNING

# Use test services
REDIS_URL=redis://test-redis:6379
DATABASE_URL=sqlite:///:memory:

# Mock external services
MOCK_VERTEX_AI=true
MOCK_BRAVE_SEARCH=true
```

## 🔧 Advanced Configuration

### Custom Tool Registration

```python
# config/custom_tools.py
from lib._tools.base_tool import BaseTool

def register_custom_tools():
    """Register custom tools for your deployment."""

    @tool
    def custom_tool(parameters):
        """Your custom tool implementation."""
        pass

    return {
        "custom_tool": custom_tool
    }
```

### Agent Customization

```python
# config/custom_agents.py
from agents.base_agent import BaseAgent

class CustomAgent(BaseAgent):
    """Custom agent for specific use cases."""

    def __init__(self, config):
        super().__init__(config)
        self.name = "custom_agent"

    def process_request(self, message, context=None):
        """Custom request processing logic."""
        pass

def register_custom_agents():
    return {
        "custom_agent": CustomAgent
    }
```

### Middleware Configuration

```python
# config/middleware.py
def custom_middleware(request, response):
    """Custom middleware for request/response processing."""

    # Add custom headers
    response.headers["X-Custom-Header"] = "VANA"

    # Log requests
    logger.info(f"Request: {request.method} {request.url}")

    return response
```

## 📝 Configuration Validation

### Validation Script

```python
# scripts/validate_config.py
import yaml
import os
from pathlib import Path

def validate_configuration():
    """Validate all configuration files."""

    config_files = [
        ".env.local",
        "agents/vana/config.yaml",
        "lib/_tools/config.yaml",
        "api/config.yaml"
    ]

    for config_file in config_files:
        if not Path(config_file).exists():
            print(f"❌ Missing config file: {config_file}")
            continue

        try:
            if config_file.endswith('.yaml'):
                with open(config_file) as f:
                    yaml.safe_load(f)
            print(f"✅ Valid config: {config_file}")
        except Exception as e:
            print(f"❌ Invalid config {config_file}: {e}")

if __name__ == "__main__":
    validate_configuration()
```

## 🚨 Troubleshooting Configuration

### Common Issues

#### Environment Variables Not Loading
```bash
# Check if environment file exists
ls -la .env.local

# Verify environment variables are set
env | grep VANA

# Test configuration loading
python -c "from lib.environment import get_config; print(get_config())"
```

#### Invalid YAML Configuration
```bash
# Validate YAML syntax
python -c "import yaml; yaml.safe_load(open('config.yaml'))"

# Check for common YAML issues
yamllint config.yaml
```

#### Permission Issues
```bash
# Check file permissions
ls -la .env.local

# Fix permissions if needed
chmod 600 .env.local
```

---

**Next Steps:**
- [Quick Start Guide](quick-start.md) - Get VANA running
- [User Guide](../guides/user-guide.md) - Learn how to use VANA
- [Deployment Guide](../deployment/cloud-deployment.md) - Deploy to production

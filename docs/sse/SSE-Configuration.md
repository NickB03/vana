# SSE Configuration Guide

## Storage Architecture Note

**IMPORTANT**: Vana uses different storage technologies for different components:

| Component | Storage | Configuration Variable | File Location |
|-----------|---------|----------------------|---------------|
| **SSE Sessions** | In-memory dict | N/A (hardcoded) | `app/utils/session_store.py` |
| **ADK Sessions** | SQLite | `ADK_SESSION_DB_URI` | `app/services/adk_services.py` |
| **Authentication** | SQLite/PostgreSQL | `AUTH_DATABASE_URL` | `app/auth/database.py` |

This guide configures all three layers. SSE-specific settings are prefixed with `SSE_*`.

## Environment Variables

### Backend Configuration

**File**: `.env.local` (backend root)

```bash
# === Authentication ===
JWT_SECRET_KEY=your-secret-key-here-minimum-32-chars
AUTH_SECRET_KEY=fallback-if-jwt-secret-not-set
REQUIRE_SSE_AUTH=true  # Set to false only in development

# === Google AI ===
GOOGLE_API_KEY=your-google-ai-api-key
GOOGLE_CLOUD_PROJECT=your-gcp-project-id

# === CORS Configuration ===
ALLOW_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001

# === SSE Broadcaster ===
SSE_MAX_QUEUE_SIZE=1000
SSE_MAX_HISTORY_PER_SESSION=500
SSE_EVENT_TTL=300  # 5 minutes in seconds
SSE_SESSION_TTL=1800  # 30 minutes
SSE_CLEANUP_INTERVAL=60  # 1 minute
SSE_MEMORY_WARNING_MB=100
SSE_MEMORY_CRITICAL_MB=200

# === ADK Session Storage (Google ADK requirement) ===
# Note: This is for ADK agent sessions, NOT for SSE chat sessions
# SSE sessions use in-memory dict (see app/utils/session_store.py)
ADK_SESSION_DB_URI=sqlite:////tmp/vana_sessions.db
CLOUD_RUN_SESSION_DB_PATH=/persistent-storage/sessions.db  # For Cloud Run

# === Server Configuration ===
VANA_HOST=127.0.0.1
VANA_PORT=8000
ENVIRONMENT=development  # or production

# === OpenTelemetry (Optional) ===
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
ENABLE_TRACING=false
```

### Frontend Configuration

**File**: `frontend/.env.local`

```bash
# === API Configuration ===
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_ADK_APP_NAME=vana
NEXT_PUBLIC_ADK_DEFAULT_USER=default

# === SSE Configuration ===
NEXT_PUBLIC_SSE_AUTO_RECONNECT=true
NEXT_PUBLIC_SSE_MAX_RECONNECT_ATTEMPTS=5
NEXT_PUBLIC_SSE_RECONNECT_DELAY=1000  # milliseconds
NEXT_PUBLIC_SSE_MAX_RECONNECT_DELAY=30000

# === Feature Flags ===
NEXT_PUBLIC_ENABLE_POLLING_FALLBACK=true
NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=false

# === Authentication ===
NEXT_PUBLIC_AUTH_COOKIE_NAME=vana_access_token
```

## Broadcaster Configuration

### Development Configuration

**File**: `app/utils/sse_broadcaster.py`

```python
from app.utils.sse_broadcaster import BroadcasterConfig, EnhancedSSEBroadcaster

# Relaxed limits for development
dev_config = BroadcasterConfig(
    max_queue_size=500,              # Smaller for faster testing
    max_history_per_session=100,     # Less history needed
    event_ttl=60.0,                  # 1 minute for rapid iteration
    session_ttl=600.0,               # 10 minutes
    cleanup_interval=30.0,           # Cleanup every 30s
    enable_metrics=True,             # Full metrics
    max_subscriber_idle_time=300.0,  # 5 minutes idle
    memory_warning_threshold_mb=50.0,
    memory_critical_threshold_mb=100.0
)
```

### Production Configuration

```python
# High-performance production settings
prod_config = BroadcasterConfig(
    max_queue_size=2000,              # Handle bursts
    max_history_per_session=500,      # Full history for reliability
    event_ttl=300.0,                  # 5 minutes
    session_ttl=1800.0,               # 30 minutes
    cleanup_interval=120.0,           # Cleanup every 2 minutes
    enable_metrics=True,
    max_subscriber_idle_time=600.0,   # 10 minutes
    memory_warning_threshold_mb=200.0,
    memory_critical_threshold_mb=500.0
)
```

### High-Traffic Configuration

```python
# Optimized for high event volume
high_traffic_config = BroadcasterConfig(
    max_queue_size=5000,              # Large queues
    max_history_per_session=100,      # Minimal history
    event_ttl=60.0,                   # Aggressive expiration
    session_ttl=600.0,                # Shorter sessions
    cleanup_interval=30.0,            # Frequent cleanup
    enable_metrics=True,
    max_subscriber_idle_time=300.0,
    memory_warning_threshold_mb=500.0,
    memory_critical_threshold_mb=1000.0
)
```

### Memory-Constrained Configuration

```python
# Minimal memory footprint
low_memory_config = BroadcasterConfig(
    max_queue_size=200,               # Small queues
    max_history_per_session=50,       # Minimal history
    event_ttl=30.0,                   # 30 seconds
    session_ttl=300.0,                # 5 minutes
    cleanup_interval=15.0,            # Very frequent cleanup
    enable_metrics=False,             # Disable metrics overhead
    max_subscriber_idle_time=120.0,   # 2 minutes
    memory_warning_threshold_mb=25.0,
    memory_critical_threshold_mb=50.0
)
```

## Deployment Configurations

### Local Development

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=development
      - REQUIRE_SSE_AUTH=false
      - ALLOW_ORIGINS=http://localhost:3000
      - SSE_MAX_QUEUE_SIZE=500
      - SSE_CLEANUP_INTERVAL=30
    volumes:
      - ./:/app
    command: uvicorn app.server:app --reload --host 0.0.0.0 --port 8000

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
```

### Cloud Run (Google Cloud)

**cloudbuild.yaml**:
```yaml
steps:
  # Build backend container
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/vana-backend', '.']

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/vana-backend']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'vana-backend'
      - '--image=gcr.io/$PROJECT_ID/vana-backend'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=2Gi'
      - '--cpu=2'
      - '--timeout=3600'
      - '--max-instances=10'
      - '--set-env-vars=ENVIRONMENT=production,REQUIRE_SSE_AUTH=true'

options:
  logging: CLOUD_LOGGING_ONLY
```

**Cloud Run Configuration**:
```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: vana-backend
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"  # Important for SSE
        run.googleapis.com/execution-environment: gen2
    spec:
      containerConcurrency: 80  # SSE connections per instance
      timeoutSeconds: 3600  # 1 hour for long-lived connections
      containers:
        - image: gcr.io/PROJECT_ID/vana-backend
          resources:
            limits:
              memory: 2Gi
              cpu: "2"
          env:
            - name: ENVIRONMENT
              value: production
            - name: REQUIRE_SSE_AUTH
              value: "true"
            - name: SSE_MAX_QUEUE_SIZE
              value: "2000"
            - name: ADK_SESSION_DB_URI
              value: "sqlite:////var/data/sessions.db"  # For ADK sessions
          volumeMounts:
            - name: session-storage
              mountPath: /var/data
      volumes:
        - name: session-storage
          emptyDir: {}  # Or NFS for persistence
```

### Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vana-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vana-backend
  template:
    metadata:
      labels:
        app: vana-backend
    spec:
      containers:
        - name: backend
          image: vana-backend:latest
          ports:
            - containerPort: 8000
          env:
            - name: ENVIRONMENT
              value: production
            - name: REQUIRE_SSE_AUTH
              value: "true"
            - name: SSE_MAX_QUEUE_SIZE
              value: "2000"
            - name: JWT_SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: vana-secrets
                  key: jwt-secret
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: vana-backend
spec:
  selector:
    app: vana-backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
  type: LoadBalancer
  sessionAffinity: ClientIP  # Sticky sessions for SSE
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 1800  # 30 minutes
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/vana

upstream vana_backend {
    # Session affinity for SSE
    ip_hash;

    server backend1:8000 max_fails=3 fail_timeout=30s;
    server backend2:8000 max_fails=3 fail_timeout=30s;
    server backend3:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.vana.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.vana.com;

    ssl_certificate /etc/ssl/certs/vana.crt;
    ssl_certificate_key /etc/ssl/private/vana.key;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # SSE endpoints
    location /agent_network_sse/ {
        proxy_pass http://vana_backend;

        # Critical SSE settings
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;

        # Timeouts
        proxy_read_timeout 3600s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 10s;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Allow large headers (for JWT)
        proxy_buffer_size 16k;
        proxy_busy_buffers_size 24k;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://vana_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Standard timeouts
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # Health check
    location /health {
        proxy_pass http://vana_backend;
        access_log off;
    }
}
```

## Performance Tuning

### Memory Optimization

```python
# Calculate optimal queue size based on available memory
import os
import psutil

def calculate_optimal_config() -> BroadcasterConfig:
    """Calculate broadcaster config based on system resources."""
    # Get available memory
    mem = psutil.virtual_memory()
    available_mb = mem.available / (1024 * 1024)

    # Allocate 10% of available memory to broadcaster
    broadcaster_budget_mb = available_mb * 0.1

    # Estimate: 1KB per event, 500 bytes per queue
    # Budget = (events * 1024 + queues * 500) bytes
    # Assume 10 sessions, 5 subscribers each
    num_sessions = 10
    subscribers_per_session = 5

    # Calculate max events per session
    bytes_per_event = 1024
    bytes_per_queue = 500
    queue_overhead = num_sessions * subscribers_per_session * bytes_per_queue

    available_for_events = (broadcaster_budget_mb * 1024 * 1024) - queue_overhead
    max_events_per_session = int(available_for_events / (num_sessions * bytes_per_event))

    return BroadcasterConfig(
        max_history_per_session=min(max_events_per_session, 1000),  # Cap at 1000
        max_queue_size=min(max_events_per_session * 2, 5000),  # 2x history
        event_ttl=300.0,
        memory_warning_threshold_mb=broadcaster_budget_mb * 0.8,
        memory_critical_threshold_mb=broadcaster_budget_mb * 0.95
    )
```

### CPU Optimization

```python
# Tune cleanup interval based on CPU cores
import multiprocessing

def get_cleanup_interval() -> float:
    """Calculate cleanup interval based on available CPU."""
    cpu_count = multiprocessing.cpu_count()

    # More CPUs = more frequent cleanup (less blocking)
    if cpu_count >= 8:
        return 30.0  # 30 seconds
    elif cpu_count >= 4:
        return 60.0  # 1 minute
    else:
        return 120.0  # 2 minutes
```

### Network Optimization

```python
# Enable compression for large events
from starlette.responses import StreamingResponse
import gzip
import json

async def compressed_sse_stream(session_id: str):
    """SSE stream with gzip compression."""

    async def compress_events():
        async with broadcaster.subscribe(session_id) as queue:
            while True:
                event = await queue.get()

                # Compress large events
                event_str = event if isinstance(event, str) else event.to_sse_format()

                if len(event_str) > 1024:  # Compress events > 1KB
                    compressed = gzip.compress(event_str.encode())
                    # Send compressed data with encoding header
                    yield f"data: {compressed.hex()}\n\n"
                else:
                    yield event_str

    return StreamingResponse(
        compress_events(),
        media_type="text/event-stream",
        headers={"Content-Encoding": "gzip"}
    )
```

## Monitoring Configuration

### Prometheus Metrics

```python
# app/monitoring.py
from prometheus_client import Counter, Gauge, Histogram
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

# Define metrics
sse_connections_active = Gauge(
    'sse_connections_active',
    'Number of active SSE connections',
    ['session_id']
)

sse_events_total = Counter(
    'sse_events_total',
    'Total SSE events broadcasted',
    ['event_type', 'session_id']
)

sse_event_latency = Histogram(
    'sse_event_latency_seconds',
    'SSE event broadcast latency',
    buckets=[0.001, 0.01, 0.1, 0.5, 1.0, 5.0]
)

sse_memory_usage = Gauge(
    'sse_memory_usage_bytes',
    'SSE broadcaster memory usage'
)

# Expose metrics endpoint
@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

### Cloud Logging

```python
# app/logging_config.py
import logging
from google.cloud import logging as cloud_logging

def setup_logging(environment: str):
    """Configure logging based on environment."""

    if environment == "production":
        # Use Google Cloud Logging
        client = cloud_logging.Client()
        client.setup_logging(log_level=logging.INFO)

        # Structured logging
        logger = client.logger("vana-sse")

        def log_sse_event(event_type: str, session_id: str, **kwargs):
            logger.log_struct({
                "event_type": event_type,
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }, severity="INFO")

        return logger, log_sse_event

    else:
        # Development: Standard logging
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        logger = logging.getLogger("vana-sse")

        def log_sse_event(event_type: str, session_id: str, **kwargs):
            logger.info(f"SSE Event: {event_type} session={session_id} {kwargs}")

        return logger, log_sse_event
```

## Security Configuration

### JWT Configuration

```python
# app/auth/config.py
from datetime import timedelta

class AuthSettings:
    # JWT Configuration
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # SSE Authentication
    REQUIRE_SSE_AUTH: bool = os.getenv("REQUIRE_SSE_AUTH", "true").lower() == "true"

    # Cookie Configuration
    COOKIE_NAME: str = "vana_access_token"
    COOKIE_SECURE: bool = os.getenv("ENVIRONMENT") == "production"
    COOKIE_HTTPONLY: bool = True
    COOKIE_SAMESITE: str = "lax"  # or "strict" for production

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_CALLS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
```

### CORS Configuration

```python
# app/server.py
from fastapi.middleware.cors import CORSMiddleware

def configure_cors(app: FastAPI, environment: str):
    """Configure CORS based on environment."""

    if environment == "production":
        # Strict CORS for production
        allowed_origins = [
            "https://app.vana.com",
            "https://www.vana.com"
        ]
    else:
        # Permissive CORS for development
        allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001"
        ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["*"],
        max_age=3600
    )
```

## Health Checks

```python
# app/health.py
from fastapi import APIRouter
from app.utils.sse_broadcaster import get_sse_broadcaster

router = APIRouter()

@router.get("/health")
async def health_check():
    """Comprehensive health check."""

    broadcaster = get_sse_broadcaster()
    stats = await broadcaster.get_stats()

    # Check memory usage
    memory_ok = stats['memoryUsageMB'] < 1000  # Under 1GB

    # Check active sessions
    sessions_ok = stats['totalSessions'] < 100  # Under 100 sessions

    # Overall status
    status = "healthy" if (memory_ok and sessions_ok) else "degraded"

    return {
        "status": status,
        "checks": {
            "memory": "ok" if memory_ok else "warning",
            "sessions": "ok" if sessions_ok else "warning"
        },
        "metrics": {
            "memory_mb": stats['memoryUsageMB'],
            "sessions": stats['totalSessions'],
            "subscribers": stats['totalSubscribers']
        }
    }

@router.get("/health/live")
async def liveness_probe():
    """Kubernetes liveness probe."""
    return {"status": "alive"}

@router.get("/health/ready")
async def readiness_probe():
    """Kubernetes readiness probe."""
    broadcaster = get_sse_broadcaster()
    stats = await broadcaster.get_stats()

    ready = stats['memoryUsageMB'] < 2000  # Under 2GB

    return {
        "status": "ready" if ready else "not_ready",
        "ready": ready
    }
```

---

**Related Documentation**:
- [SSE Overview](./SSE-Overview.md) - Architecture and design
- [SSE Implementation Guide](./SSE-Implementation-Guide.md) - Code examples
- [SSE Troubleshooting](./SSE-Troubleshooting.md) - Debugging guide

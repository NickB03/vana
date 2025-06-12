# AGENT 6: Performance Monitoring and Security Enhancement

**Priority**: LOW | **Timeline**: 2-3 days | **Branch**: `feature/monitoring-security-agent6`

## 🎯 YOUR MISSION

Implement comprehensive performance monitoring, logging systems, and security hardening measures. Build robust infrastructure for observability, security, and operational excellence.

## 📋 SETUP INSTRUCTIONS

```bash
git clone https://github.com/NickB03/vana.git
cd vana
git checkout main
git pull origin main
git checkout -b feature/monitoring-security-agent6
poetry install
```

## 🎯 YOUR ASSIGNED DIRECTORIES

**YOU HAVE EXCLUSIVE OWNERSHIP OF:**
- `lib/monitoring/` (create monitoring infrastructure)
- `lib/security/` (enhance security systems)
- `lib/logging/` (create centralized logging)
- `config/security/` (security configuration files)
- `config/monitoring/` (monitoring configuration)

**DO NOT MODIFY ANY OTHER DIRECTORIES**

## 🔧 IMPLEMENTATION REQUIREMENTS

### 1. Performance Monitoring (`lib/monitoring/`)

**Performance Monitor (`lib/monitoring/performance_monitor.py`):**
```python
import time
import psutil
import asyncio
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Callable
from collections import defaultdict, deque
import json

@dataclass
class PerformanceMetric:
    """Performance metric data structure."""
    timestamp: float
    metric_name: str
    value: float
    unit: str
    tags: Dict[str, str] = None
    metadata: Dict[str, any] = None

class PerformanceMonitor:
    """Real-time performance monitoring and metrics collection."""
    
    def __init__(self, retention_minutes: int = 60):
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.retention_seconds = retention_minutes * 60
        self.alerts: List[Dict] = []
        self.thresholds: Dict[str, Dict] = {}
    
    def record_metric(self, name: str, value: float, unit: str = "", 
                     tags: Dict[str, str] = None, metadata: Dict = None):
        """Record a performance metric."""
        metric = PerformanceMetric(
            timestamp=time.time(),
            metric_name=name,
            value=value,
            unit=unit,
            tags=tags or {},
            metadata=metadata or {}
        )
        
        self.metrics[name].append(metric)
        self._check_thresholds(metric)
    
    def record_response_time(self, operation: str, duration: float, 
                           success: bool = True, **kwargs):
        """Record response time for an operation."""
        self.record_metric(
            f"response_time.{operation}",
            duration,
            "seconds",
            tags={"success": str(success), **kwargs}
        )
    
    def record_memory_usage(self, component: str = "system"):
        """Record current memory usage."""
        process = psutil.Process()
        memory_info = process.memory_info()
        
        self.record_metric(
            f"memory.{component}.rss",
            memory_info.rss / 1024 / 1024,
            "MB"
        )
        
        self.record_metric(
            f"memory.{component}.vms",
            memory_info.vms / 1024 / 1024,
            "MB"
        )
    
    def record_cpu_usage(self, component: str = "system"):
        """Record current CPU usage."""
        cpu_percent = psutil.cpu_percent(interval=1)
        self.record_metric(f"cpu.{component}.usage", cpu_percent, "percent")
    
    def set_threshold(self, metric_name: str, warning: float, critical: float, 
                     comparison: str = "greater"):
        """Set alert thresholds for a metric."""
        self.thresholds[metric_name] = {
            "warning": warning,
            "critical": critical,
            "comparison": comparison
        }
    
    def _check_thresholds(self, metric: PerformanceMetric):
        """Check if metric exceeds thresholds and generate alerts."""
        threshold = self.thresholds.get(metric.metric_name)
        if not threshold:
            return
        
        comparison = threshold["comparison"]
        value = metric.value
        
        alert_level = None
        if comparison == "greater":
            if value >= threshold["critical"]:
                alert_level = "critical"
            elif value >= threshold["warning"]:
                alert_level = "warning"
        elif comparison == "less":
            if value <= threshold["critical"]:
                alert_level = "critical"
            elif value <= threshold["warning"]:
                alert_level = "warning"
        
        if alert_level:
            self.alerts.append({
                "timestamp": metric.timestamp,
                "level": alert_level,
                "metric": metric.metric_name,
                "value": value,
                "threshold": threshold[alert_level],
                "message": f"{metric.metric_name} {comparison} {threshold[alert_level]} ({value})"
            })
    
    def get_metrics(self, metric_name: str, since: Optional[float] = None) -> List[PerformanceMetric]:
        """Get metrics for a specific metric name."""
        metrics = list(self.metrics.get(metric_name, []))
        
        if since:
            metrics = [m for m in metrics if m.timestamp >= since]
        
        return metrics
    
    def get_summary(self, metric_name: str, since: Optional[float] = None) -> Dict:
        """Get statistical summary of a metric."""
        metrics = self.get_metrics(metric_name, since)
        
        if not metrics:
            return {"count": 0}
        
        values = [m.value for m in metrics]
        return {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "latest": values[-1] if values else None
        }
```

**Application Performance Monitor (`lib/monitoring/apm.py`):**
```python
import functools
import time
from typing import Callable, Any
from .performance_monitor import PerformanceMonitor

class APM:
    """Application Performance Monitoring decorator and context manager."""
    
    def __init__(self, monitor: PerformanceMonitor):
        self.monitor = monitor
    
    def trace(self, operation_name: str = None, tags: dict = None):
        """Decorator to trace function execution time."""
        def decorator(func: Callable) -> Callable:
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            @functools.wraps(func)
            def wrapper(*args, **kwargs) -> Any:
                start_time = time.time()
                success = True
                error = None
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = False
                    error = str(e)
                    raise
                finally:
                    duration = time.time() - start_time
                    self.monitor.record_response_time(
                        op_name, 
                        duration, 
                        success=success,
                        **(tags or {})
                    )
                    
                    if error:
                        self.monitor.record_metric(
                            f"errors.{op_name}",
                            1,
                            "count",
                            tags={"error": error}
                        )
            
            return wrapper
        return decorator
    
    def trace_async(self, operation_name: str = None, tags: dict = None):
        """Decorator to trace async function execution time."""
        def decorator(func: Callable) -> Callable:
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            @functools.wraps(func)
            async def wrapper(*args, **kwargs) -> Any:
                start_time = time.time()
                success = True
                error = None
                
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = False
                    error = str(e)
                    raise
                finally:
                    duration = time.time() - start_time
                    self.monitor.record_response_time(
                        op_name, 
                        duration, 
                        success=success,
                        **(tags or {})
                    )
                    
                    if error:
                        self.monitor.record_metric(
                            f"errors.{op_name}",
                            1,
                            "count",
                            tags={"error": error}
                        )
            
            return wrapper
        return decorator
```

### 2. Security Hardening (`lib/security/`)

**Security Manager (`lib/security/security_manager.py`):**
```python
import hashlib
import hmac
import time
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict, deque

@dataclass
class SecurityEvent:
    """Security event for logging and analysis."""
    timestamp: float
    event_type: str
    severity: str  # "low", "medium", "high", "critical"
    source_ip: str
    user_agent: str
    details: Dict[str, any]

class SecurityManager:
    """Comprehensive security management and hardening."""
    
    def __init__(self):
        self.rate_limits: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.blocked_ips: set = set()
        self.security_events: List[SecurityEvent] = []
        self.suspicious_patterns = [
            r'<script[^>]*>.*?</script>',  # XSS
            r'union\s+select',  # SQL injection
            r'\.\./',  # Path traversal
            r'eval\s*\(',  # Code injection
            r'exec\s*\(',  # Code injection
        ]
    
    def validate_input(self, input_data: str, max_length: int = 10000) -> Tuple[bool, str]:
        """Validate and sanitize input data."""
        if len(input_data) > max_length:
            return False, f"Input exceeds maximum length of {max_length}"
        
        # Check for suspicious patterns
        for pattern in self.suspicious_patterns:
            if re.search(pattern, input_data, re.IGNORECASE):
                return False, f"Suspicious pattern detected: {pattern}"
        
        return True, "Input validation passed"
    
    def check_rate_limit(self, identifier: str, limit: int = 100, 
                        window_seconds: int = 60) -> bool:
        """Check if identifier is within rate limits."""
        now = time.time()
        window_start = now - window_seconds
        
        # Clean old entries
        requests = self.rate_limits[identifier]
        while requests and requests[0] < window_start:
            requests.popleft()
        
        # Check limit
        if len(requests) >= limit:
            return False
        
        # Add current request
        requests.append(now)
        return True
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP address is blocked."""
        return ip_address in self.blocked_ips
    
    def block_ip(self, ip_address: str, reason: str = "Security violation"):
        """Block an IP address."""
        self.blocked_ips.add(ip_address)
        self.log_security_event(
            "ip_blocked",
            "high",
            ip_address,
            "",
            {"reason": reason}
        )
    
    def log_security_event(self, event_type: str, severity: str, 
                          source_ip: str, user_agent: str, details: Dict):
        """Log a security event."""
        event = SecurityEvent(
            timestamp=time.time(),
            event_type=event_type,
            severity=severity,
            source_ip=source_ip,
            user_agent=user_agent,
            details=details
        )
        
        self.security_events.append(event)
        
        # Auto-block on critical events
        if severity == "critical":
            self.block_ip(source_ip, f"Critical security event: {event_type}")
    
    def generate_csrf_token(self, session_id: str, secret_key: str) -> str:
        """Generate CSRF token for session."""
        timestamp = str(int(time.time()))
        message = f"{session_id}:{timestamp}"
        signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"{timestamp}:{signature}"
    
    def validate_csrf_token(self, token: str, session_id: str, 
                           secret_key: str, max_age: int = 3600) -> bool:
        """Validate CSRF token."""
        try:
            timestamp_str, signature = token.split(':', 1)
            timestamp = int(timestamp_str)
            
            # Check age
            if time.time() - timestamp > max_age:
                return False
            
            # Verify signature
            message = f"{session_id}:{timestamp_str}"
            expected_signature = hmac.new(
                secret_key.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(signature, expected_signature)
            
        except (ValueError, IndexError):
            return False
```

### 3. Centralized Logging (`lib/logging/`)

**Structured Logger (`lib/logging/structured_logger.py`):**
```python
import json
import time
import logging
import uuid
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict

@dataclass
class LogEntry:
    """Structured log entry."""
    timestamp: float
    level: str
    message: str
    correlation_id: str
    component: str
    metadata: Dict[str, Any] = None
    
    def to_json(self) -> str:
        """Convert log entry to JSON string."""
        return json.dumps(asdict(self), default=str)

class StructuredLogger:
    """Centralized structured logging with correlation IDs."""
    
    def __init__(self, component: str, correlation_id: str = None):
        self.component = component
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.logger = logging.getLogger(component)
    
    def _log(self, level: str, message: str, **metadata):
        """Internal logging method."""
        entry = LogEntry(
            timestamp=time.time(),
            level=level,
            message=message,
            correlation_id=self.correlation_id,
            component=self.component,
            metadata=metadata
        )
        
        # Log as JSON for structured logging
        self.logger.log(
            getattr(logging, level.upper()),
            entry.to_json()
        )
    
    def debug(self, message: str, **metadata):
        """Log debug message."""
        self._log("debug", message, **metadata)
    
    def info(self, message: str, **metadata):
        """Log info message."""
        self._log("info", message, **metadata)
    
    def warning(self, message: str, **metadata):
        """Log warning message."""
        self._log("warning", message, **metadata)
    
    def error(self, message: str, **metadata):
        """Log error message."""
        self._log("error", message, **metadata)
    
    def critical(self, message: str, **metadata):
        """Log critical message."""
        self._log("critical", message, **metadata)
    
    def with_correlation_id(self, correlation_id: str) -> 'StructuredLogger':
        """Create new logger with different correlation ID."""
        return StructuredLogger(self.component, correlation_id)
```

### 4. Configuration Files

**Security Configuration (`config/security/security_policies.yaml`):**
```yaml
input_validation:
  max_input_length: 10000
  forbidden_patterns:
    - '<script[^>]*>.*?</script>'
    - 'union\s+select'
    - '\.\.\/'
    - 'eval\s*\('
    - 'exec\s*\('
  
rate_limiting:
  default_limit: 100
  window_seconds: 60
  burst_limit: 10
  
ip_blocking:
  auto_block_on_critical: true
  block_duration_hours: 24
  whitelist:
    - "127.0.0.1"
    - "::1"
  
csrf_protection:
  token_max_age: 3600
  require_csrf: true
  
headers:
  security_headers:
    X-Content-Type-Options: "nosniff"
    X-Frame-Options: "DENY"
    X-XSS-Protection: "1; mode=block"
    Strict-Transport-Security: "max-age=31536000; includeSubDomains"
    Content-Security-Policy: "default-src 'self'"
```

**Monitoring Configuration (`config/monitoring/monitoring.yaml`):**
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
  
  cpu_usage:
    warning: 70.0
    critical: 85.0
  
  error_rate:
    warning: 5.0
    critical: 10.0

alerting:
  enabled: true
  channels:
    - type: "log"
      level: "warning"
    - type: "email"
      level: "critical"
      recipients: ["admin@example.com"]

logging:
  level: "INFO"
  format: "json"
  correlation_id_header: "X-Correlation-ID"
  
  components:
    - name: "agent_execution"
      level: "DEBUG"
    - name: "security"
      level: "WARNING"
    - name: "performance"
      level: "INFO"
```

## ✅ SUCCESS CRITERIA

Your implementation is successful when:

1. **Performance monitoring provides real-time insights**
2. **Security hardening prevents common vulnerabilities**
3. **Centralized logging enables effective troubleshooting**
4. **Security configuration follows industry best practices**
5. **Monitoring and alerting systems are operational**
6. **All components integrate with existing VANA infrastructure**
7. **Configuration is externalized and manageable**
8. **Documentation explains monitoring and security features**

## 🚀 GETTING STARTED

1. **Create directory structure:**
```bash
mkdir -p lib/monitoring lib/security lib/logging config/security config/monitoring
```

2. **Start with Performance Monitor** - Foundation for observability
3. **Build Security Manager** - Critical for protection
4. **Implement Structured Logging** - Enable troubleshooting
5. **Create Configuration Files** - Enable management
6. **Add Integration Points** - Connect to existing system
7. **Write comprehensive tests** - Ensure reliability
8. **Document usage patterns** - Enable operations

## 📝 COMMIT GUIDELINES

- Commit frequently: `feat: add performance monitoring framework`
- Include configuration examples in commits
- Test security measures thoroughly
- Document monitoring and alerting setup

## 🔄 WHEN READY TO MERGE

1. All monitoring and security components work
2. Configuration files are complete and documented
3. Integration with existing system is seamless
4. Security measures prevent common vulnerabilities
5. Performance monitoring provides actionable insights

**Remember: You are building the operational foundation. Focus on reliability, security, and providing actionable insights for system health.**

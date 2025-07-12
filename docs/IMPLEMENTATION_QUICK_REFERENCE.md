# VANA Improvement - Quick Implementation Reference

## 🚀 Week 1: ADK Compliance Quick Fixes

### ❌ STOP doing this:
```python
# Manual state tracking
self.task_results = []
for agent in agents:
    result = agent.run(task)
    self.task_results.append(result)
```

### ✅ START doing this:
```python
# ADK state management
from google.adk.agents import SequentialAgent, StateSchema

workflow = SequentialAgent(
    name="MyWorkflow",
    sub_agents=agents,
    state_schema=StateSchema({
        "properties": {
            "step_results": {"type": "array"}
        }
    })
)
```

### 🔧 Quick ADK Checklist:
- [ ] No manual arrays for state
- [ ] Use `state_schema` in all workflows
- [ ] Let ADK handle state propagation
- [ ] Test with `assert workflow.state is not None`

## 📐 Week 2: Code Quality Quick Wins

### Function Refactoring Template:
```python
# Before: 100+ line function
def complex_function(data):
    # validation logic (20 lines)
    # processing logic (40 lines)
    # analysis logic (30 lines)
    # formatting logic (20 lines)

# After: Modular approach
def complex_function(data):
    validated_data = _validate_input(data)
    processed = _process_data(validated_data)
    analysis = _analyze_results(processed)
    return _format_output(analysis)

def _validate_input(data): ...  # 20 lines
def _process_data(data): ...     # 40 lines
def _analyze_results(data): ...  # 30 lines
def _format_output(data): ...    # 20 lines
```

### Common Utilities to Extract:
```python
# lib/utils/validation.py
def validate_file_path(path: str) -> Path:
    """Common path validation."""

def validate_input_length(text: str, max_length: int = 1000):
    """Common input validation."""

# lib/utils/error_handling.py
def safe_file_operation(func):
    """Decorator for file operations."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except IOError as e:
            return {"error": f"File operation failed: {str(e)}"}
    return wrapper
```

## ⚡ Week 3: Performance Quick Boosts

### Redis Cache Setup:
```python
# lib/utils/cache.py
from functools import lru_cache
import redis
import json

redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    decode_responses=True
)

def redis_cache(ttl=300):
    def decorator(func):
        def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try cache first
            cached = redis_client.get(key)
            if cached:
                return json.loads(cached)
            
            # Compute and cache
            result = func(*args, **kwargs)
            redis_client.setex(key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

# Usage
@redis_cache(ttl=600)
def expensive_operation(data):
    # Your code here
```

### Connection Pooling:
```python
# lib/utils/connection_pool.py
from concurrent.futures import ThreadPoolExecutor
import threading

class ConnectionPool:
    def __init__(self, max_connections=10):
        self.pool = []
        self.lock = threading.Lock()
        self.max_connections = max_connections
        
    def get_connection(self):
        with self.lock:
            if self.pool:
                return self.pool.pop()
            return self._create_connection()
    
    def return_connection(self, conn):
        with self.lock:
            if len(self.pool) < self.max_connections:
                self.pool.append(conn)
```

## 🔒 Week 4: Security Quick Hardening

### Path Validation:
```python
# lib/utils/security.py
from pathlib import Path

ALLOWED_DIRS = [
    Path.cwd(),
    Path.home() / "Development" / "vana"
]

def secure_path(path: str) -> Path:
    """Validate and return secure path."""
    target = Path(path).resolve()
    
    for allowed in ALLOWED_DIRS:
        try:
            target.relative_to(allowed)
            return target
        except ValueError:
            continue
    
    raise SecurityError(f"Path {path} not allowed")

# Usage
@safe_file_operation
def read_file(path: str):
    safe_path = secure_path(path)
    return safe_path.read_text()
```

### Input Sanitization:
```python
# lib/utils/sanitize.py
import re
import html

def sanitize_input(text: str, max_length: int = 1000) -> str:
    """Sanitize user input."""
    # Length check
    if len(text) > max_length:
        text = text[:max_length]
    
    # Remove control characters
    text = ''.join(char for char in text if ord(char) >= 32)
    
    # HTML escape
    text = html.escape(text)
    
    # Remove potential injections
    text = re.sub(r'[<>\"\'`]', '', text)
    
    return text.strip()
```

### Rate Limiting:
```python
# lib/utils/rate_limit.py
from collections import defaultdict
from datetime import datetime, timedelta
import threading

class RateLimiter:
    def __init__(self, max_requests=100, window_seconds=60):
        self.max_requests = max_requests
        self.window = timedelta(seconds=window_seconds)
        self.requests = defaultdict(list)
        self.lock = threading.Lock()
    
    def is_allowed(self, key: str) -> bool:
        with self.lock:
            now = datetime.now()
            # Clean old requests
            self.requests[key] = [
                req for req in self.requests[key]
                if now - req < self.window
            ]
            
            if len(self.requests[key]) < self.max_requests:
                self.requests[key].append(now)
                return True
            return False

# Usage
limiter = RateLimiter(max_requests=100, window_seconds=60)

def handle_request(user_id: str):
    if not limiter.is_allowed(user_id):
        return {"error": "Rate limit exceeded"}
    # Process request
```

## 🧪 Testing Quick Templates

### ADK Compliance Test:
```python
def test_workflow_uses_adk_state():
    workflow = create_sequential_workflow(tasks)
    assert hasattr(workflow, 'state_schema')
    assert workflow.state_schema is not None
    assert 'manual_results' not in workflow.__dict__
```

### Performance Benchmark:
```python
import time

def benchmark_operation(func, *args, iterations=100):
    times = []
    for _ in range(iterations):
        start = time.time()
        func(*args)
        times.append(time.time() - start)
    
    return {
        "avg": sum(times) / len(times),
        "min": min(times),
        "max": max(times),
        "p95": sorted(times)[int(len(times) * 0.95)]
    }
```

### Security Test:
```python
def test_path_traversal_protection():
    malicious_paths = [
        "../../../etc/passwd",
        "/etc/shadow",
        "~/../../../root/.ssh/id_rsa"
    ]
    
    for path in malicious_paths:
        with pytest.raises(SecurityError):
            secure_path(path)
```

## 📋 Daily Checklist

### Before Committing:
- [ ] Run ADK compliance tests
- [ ] Check function length (<50 lines)
- [ ] Verify no circular imports
- [ ] Run security tests
- [ ] Check performance benchmarks
- [ ] Update documentation

### Code Review Checklist:
- [ ] State management uses ADK patterns?
- [ ] Functions properly decomposed?
- [ ] Common patterns extracted?
- [ ] Caching implemented where needed?
- [ ] Inputs validated and sanitized?
- [ ] Rate limiting in place?

---
*Keep this reference handy during implementation!*
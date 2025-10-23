# SSE Error Handling - Quick Reference

**For**: Backend developers integrating error handling into ADK streaming endpoints
**Time to Read**: 5 minutes

---

## TL;DR

Replace manual error handling in `/run_sse` with `SSEStreamWrapper`:

```python
from app.utils.sse_error_handler import RetryConfig, SSEStreamWrapper

# Configure retry
retry_config = RetryConfig(max_retries=2, base_delay=2.0, retry_on_codes=[503, 429])

# Create wrapper
wrapper = SSEStreamWrapper(session_id=request.session_id, retry_config=retry_config)

# Use wrapper (handles errors, retries, completion automatically)
async with httpx.AsyncClient(timeout=timeout_config) as client:
    async for line in wrapper.wrap_stream(
        upstream_url="http://127.0.0.1:8080/run_sse",
        request_payload=request.model_dump(by_alias=True, exclude_none=True),
        client=client,
    ):
        yield line
```

**Result**: Automatic 503 detection + retry + user-friendly errors + telemetry

---

## What It Does

✅ **Detects errors** - 503 "model overloaded", 429 rate limits, timeouts
✅ **Retries automatically** - Up to 2 times with exponential backoff (2s → 4s)
✅ **Normalizes errors** - "AI model is temporarily busy..." instead of "503 ServerError"
✅ **Tracks stream health** - Content received, completion markers, error states
✅ **Collects telemetry** - Success rate, error counts, retry statistics
✅ **Injects completion markers** - Prevents hanging connections

---

## Integration Checklist

### ✅ Step 1: Import

```python
from app.utils.sse_error_handler import (
    RetryConfig,
    SSEStreamWrapper,
    get_stream_telemetry_stats,  # For monitoring endpoint
)
```

### ✅ Step 2: Replace Streaming Logic

**Find**:
```python
async with client.stream("POST", "http://127.0.0.1:8080/run_sse", json=...) as upstream:
    async for line in upstream.aiter_lines():
        # Manual error detection...
        yield line
```

**Replace with**:
```python
retry_config = RetryConfig(max_retries=2, base_delay=2.0)
wrapper = SSEStreamWrapper(session_id, retry_config)

async for line in wrapper.wrap_stream(
    upstream_url="http://127.0.0.1:8080/run_sse",
    request_payload={...},
    client=client,
):
    yield line
```

### ✅ Step 3: Remove Manual Error Handling

Delete lines that:
- Detect 503/429 errors manually
- Normalize error messages
- Inject completion markers

These are now automatic.

### ✅ Step 4: Add Telemetry Endpoint

```python
@adk_router.get("/debug/sse-telemetry")
async def get_sse_telemetry(
    current_user: User | None = Depends(get_current_active_user_optional()),
) -> dict[str, Any]:
    """Get SSE stream telemetry statistics."""
    return get_stream_telemetry_stats()
```

### ✅ Step 5: Test

```bash
# Run unit tests
pytest tests/unit/test_sse_error_handler.py -v

# Check telemetry
curl http://localhost:8000/debug/sse-telemetry | jq

# Expected: success_rate > 95%
```

---

## Configuration

### Default Config (Recommended)

```python
RetryConfig(
    max_retries=2,              # Retry up to 2 times
    base_delay=2.0,             # Start with 2 second delay
    max_delay=30.0,             # Cap at 30 seconds
    exponential_base=2.0,       # Double delay each retry (2s → 4s → 8s)
    jitter=True,                # Add randomness (prevent thundering herd)
    retry_on_codes=[503, 429],  # Only retry transient errors
)
```

### Custom Config Examples

**Aggressive Retry** (critical routes):
```python
RetryConfig(max_retries=3, base_delay=1.0)  # 3 retries, faster backoff
```

**Conservative Retry** (non-critical):
```python
RetryConfig(max_retries=1, base_delay=5.0)  # Only 1 retry, longer wait
```

**No Retry** (fail fast):
```python
RetryConfig(max_retries=0)  # Disable retry
```

---

## Error Messages

### 503 "Model Overloaded"

**Before**: `{"error": "503 model overloaded"}`

**After**:
```json
{
  "error": {
    "code": 503,
    "message": "AI model is temporarily busy. This is a free-tier demo project - please wait a moment and try again.",
    "user_friendly": true,
    "retry_after": 10,
    "is_transient": true
  },
  "invocationId": "...",
  "timestamp": 1234567890
}
```

### 429 "Rate Limit"

**Before**: `{"error": "429 Too Many Requests"}`

**After**:
```json
{
  "error": {
    "code": 429,
    "message": "Rate limit reached. Please wait a moment before trying again.",
    "user_friendly": true,
    "retry_after": 30,
    "is_transient": true
  }
}
```

### Stream Termination

**Detected**: Stream ends without `event: done`

**Response**:
```json
{
  "error": {
    "code": 500,
    "message": "Connection was interrupted. Partial response received. Please try again.",
    "user_friendly": true,
    "is_transient": false
  }
}
```

---

## Monitoring

### Telemetry Endpoint

```bash
curl http://localhost:8000/debug/sse-telemetry
```

**Response**:
```json
{
  "total_streams": 150,
  "successful_streams": 142,
  "success_rate": 94.67,
  "error_counts": {
    "503": 5,
    "429": 2,
    "500": 1
  },
  "total_retries": 8,
  "avg_stream_duration": 12.5
}
```

### Key Metrics to Watch

| Metric | Target | Alert | Action |
|--------|--------|-------|--------|
| `success_rate` | > 95% | < 90% | Check error_counts |
| `error_counts[503]` | < 5% | > 10% | May need paid tier |
| `total_retries / total_streams` | < 0.2 | > 0.5 | API instability |
| `avg_stream_duration` | 8-15s | > 30s | Slow queries |

### Logging

**Info** (normal operation):
```
INFO: Stream completed successfully for session abc123
INFO: Daily quota: 50/1000 (950 remaining)
```

**Warning** (recoverable issues):
```
WARNING: Normalized 503 error for session abc123
WARNING: Stream terminated without completion marker for session abc123
```

**Error** (failures):
```
ERROR: Max retries reached for session abc123: 503 model overloaded
```

---

## Testing

### Unit Tests

```bash
pytest tests/unit/test_sse_error_handler.py -v

# Expected: 32 tests passed
```

### Manual Test: Trigger 503

```bash
# Exhaust free-tier quota (send 10 rapid requests)
for i in {1..10}; do
  curl -X POST http://localhost:8000/run_sse \
    -H "Content-Type: application/json" \
    -d '{
      "appName": "vana",
      "userId": "test",
      "sessionId": "session_'$i'",
      "newMessage": {
        "parts": [{"text": "test query"}],
        "role": "user"
      }
    }' &
done

# Check telemetry
curl http://localhost:8000/debug/sse-telemetry | jq
```

**Expected**:
- Some requests get 503 errors
- Automatic retries visible in logs
- Eventual success or graceful failure
- Telemetry shows retry counts

---

## Troubleshooting

### "Retry not working"

**Check**:
1. Is error code in `retry_on_codes`? (default: [503, 429])
2. Is `is_transient=True` for error? (503/429 are transient)
3. Have you reached `max_retries`? (default: 2)

**Fix**: Increase `max_retries` or add error code to `retry_on_codes`

### "Too many retries"

**Check**: Telemetry shows `total_retries / total_streams > 0.5`

**Fix**:
1. Check if API is overloaded (error_counts[503] high)
2. Consider paid tier if consistently hitting free-tier limits
3. Reduce `max_retries` if wasting resources

### "Missing completion markers"

**Check**: Frontend shows hanging connections

**Verify**: Wrapper should inject markers automatically. Check logs for:
```
WARNING: Stream terminated without completion marker for session {id}
```

**Fix**: Wrapper handles this automatically. If still seeing issues, check:
1. Is wrapper being used? (not bypassed)
2. Check exception handling in route

---

## Common Patterns

### Pattern 1: Route-Specific Retry

```python
# Critical route: aggressive retry
if route_name == "research":
    config = RetryConfig(max_retries=3, base_delay=1.0)
else:
    config = RetryConfig(max_retries=1, base_delay=5.0)

wrapper = SSEStreamWrapper(session_id, config)
```

### Pattern 2: Environment-Based Config

```python
# .env.local
SSE_MAX_RETRIES=2
SSE_BASE_DELAY=2.0

# app/config.py
def get_sse_retry_config() -> RetryConfig:
    return RetryConfig(
        max_retries=int(os.getenv("SSE_MAX_RETRIES", "2")),
        base_delay=float(os.getenv("SSE_BASE_DELAY", "2.0")),
    )
```

### Pattern 3: Conditional Retry

```python
# Only retry for free-tier users (paid users get instant failure)
if user_tier == "free":
    config = RetryConfig(max_retries=2)
else:
    config = RetryConfig(max_retries=0)  # No retry
```

---

## API Reference

### `SSEStreamWrapper`

```python
class SSEStreamWrapper:
    def __init__(
        self,
        session_id: str,
        retry_config: Optional[RetryConfig] = None,
    ):
        """
        Initialize stream wrapper.

        Args:
            session_id: Session identifier for tracking
            retry_config: RetryConfig instance (uses defaults if None)
        """

    async def wrap_stream(
        self,
        upstream_url: str,
        request_payload: dict[str, Any],
        client: httpx.AsyncClient,
    ) -> AsyncGenerator[str, None]:
        """
        Wrap ADK stream with error handling.

        Args:
            upstream_url: ADK service URL (e.g., "http://127.0.0.1:8080/run_sse")
            request_payload: Request payload for ADK
            client: HTTP client for streaming

        Yields:
            SSE event lines (including errors, retries, completion)
        """
```

### `RetryConfig`

```python
@dataclass
class RetryConfig:
    max_retries: int = 2                    # Max retry attempts
    base_delay: float = 2.0                 # Initial delay (seconds)
    max_delay: float = 30.0                 # Max delay cap
    exponential_base: float = 2.0           # Delay multiplier
    jitter: bool = True                     # Add randomness
    retry_on_codes: list[int] = [503, 429] # Retryable error codes
```

### `get_stream_telemetry_stats()`

```python
def get_stream_telemetry_stats() -> dict[str, Any]:
    """
    Get global stream telemetry statistics.

    Returns:
        {
            "total_streams": int,
            "successful_streams": int,
            "success_rate": float,
            "error_counts": dict[int, int],  # code → count
            "total_retries": int,
            "avg_stream_duration": float,
        }
    """
```

---

## Files

| File | Purpose | LOC |
|------|---------|-----|
| `app/utils/sse_error_handler.py` | Core wrapper + error handling | 710 |
| `app/routes/adk_integration_example.py` | Integration example + migration guide | 450 |
| `tests/unit/test_sse_error_handler.py` | Unit tests (32 tests) | 600 |
| `docs/architecture/SSE_ERROR_HANDLING_ARCHITECTURE.md` | Full documentation | 1500 |
| `docs/architecture/SSE_ERROR_HANDLING_SUMMARY.md` | Executive summary | 440 |

---

## Need Help?

- **Full Documentation**: `/docs/architecture/SSE_ERROR_HANDLING_ARCHITECTURE.md`
- **Integration Example**: `/app/routes/adk_integration_example.py`
- **Unit Tests**: `/tests/unit/test_sse_error_handler.py`

**Questions?** Check the [Trade-offs & Alternatives](../architecture/SSE_ERROR_HANDLING_ARCHITECTURE.md#trade-offs--alternatives) section.

---

**Last Updated**: 2025-10-23
**Version**: 1.0

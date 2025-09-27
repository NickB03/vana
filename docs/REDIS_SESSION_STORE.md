# Redis Session Store Implementation

This document describes the Redis-based session store implementation for ADK compliance, providing persistent session storage and cross-session memory capabilities.

## Overview

The Redis session store extends the existing in-memory session store with the following features:

- **Session Persistence**: Sessions are stored in Redis with configurable TTL
- **Cross-Session Memory**: User context and agent memory persist across sessions
- **Atomic Operations**: Redis transactions ensure data consistency
- **Connection Pooling**: Efficient Redis connection management
- **Graceful Fallback**: Automatic fallback to in-memory storage if Redis unavailable
- **Security Preservation**: All existing security features are maintained

## Architecture

### Components

1. **RedisSessionStore**: Main session store implementation
2. **CrossSessionMemory**: Manages persistent memory across sessions
3. **SessionFactory**: Factory for creating appropriate session stores
4. **RedisConfiguration**: Configuration management for Redis settings

### Data Organization

Redis keys are organized with prefixes for efficient management:

- `vana:session:{session_id}` - Session data
- `vana:memory:user_context:{user_id}:{context_key}` - User contexts
- `vana:memory:agent:{agent_id}:{memory_key}` - Agent memories
- `vana:memory:knowledge:{category}:{knowledge_key}` - Shared knowledge
- `vana:memory:history:user:{user_id}:{timestamp}:{session_id}` - Session history
- `vana:memory:index:*` - Memory indexes for efficient querying

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
REDIS_DB=0
REDIS_PASSWORD=your_password_here
REDIS_MAX_CONNECTIONS=10
REDIS_RETRY_ATTEMPTS=3
REDIS_FALLBACK_TO_MEMORY=true

# Memory TTL Configuration
MEMORY_TTL_HOURS=72        # User context and agent memory (3 days)
KNOWLEDGE_TTL_HOURS=168    # Shared knowledge base (1 week)
HISTORY_TTL_HOURS=720      # Session history (30 days)
```

### Application Configuration

```python
from app.config import get_config

config = get_config()
redis_config = config.redis_config

# Configuration is automatically loaded from environment variables
print(f"Redis enabled: {redis_config.redis_enabled}")
print(f"Redis URL: {redis_config.redis_url}")
```

## Usage

### Basic Session Operations

```python
from app.utils import get_session_store

# Get the session store (automatically chooses Redis or in-memory)
store = get_session_store()

# Create a session
session = store.ensure_session(
    "session_123",
    user_id=42,
    title="Research Session",
    status="active"
)

# Add messages
message = store.add_message("session_123", {
    "role": "user",
    "content": "Hello, world!",
    "metadata": {"source": "web"}
})

# Retrieve session
session_data = store.get_session("session_123", user_id=42)
```

### Async Operations (Redis-specific)

```python
# For Redis stores, async operations are more efficient
if hasattr(store, 'ensure_session_async'):
    session = await store.ensure_session_async(
        "session_123",
        user_id=42,
        title="Research Session"
    )

    message = await store.add_message_async("session_123", {
        "role": "assistant",
        "content": "Response from agent"
    })

    session_data = await store.get_session_async("session_123", user_id=42)
```

### Cross-Session Memory

```python
from app.utils import (
    store_user_context,
    get_user_context,
    store_agent_memory,
    get_agent_memory,
    get_session_history
)

# Store user preferences that persist across sessions
await store_user_context(user_id=42, context_key="preferences", context_data={
    "theme": "dark",
    "language": "en",
    "research_depth": "comprehensive"
})

# Retrieve user context in a different session
preferences = await get_user_context(user_id=42, context_key="preferences")

# Store agent learning data
await store_agent_memory(agent_id="research_agent", memory_key="patterns", memory_data={
    "user_preferences": ["detailed_analysis", "academic_sources"],
    "successful_strategies": ["step_by_step", "examples"]
})

# Retrieve agent memory
patterns = await get_agent_memory(agent_id="research_agent", memory_key="patterns")

# Get session history for a user
history = await get_session_history(user_id=42, limit=10)
```

### Factory Pattern

```python
from app.utils import create_session_store, SessionStoreConfig

# Create with custom configuration
config = SessionStoreConfig(
    max_sessions=5000,
    session_ttl_hours=48,
    cleanup_interval_minutes=30
)

# Create Redis store (or fallback to memory)
store = create_session_store(config_override=config)

# Force in-memory store for testing
memory_store = create_session_store(force_memory=True)
```

## Installation

### Requirements

Add to `requirements.txt`:

```
redis>=5.0.0
```

Install Redis server:

```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS with Homebrew
brew install redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Setup

1. **Install Redis client**:
   ```bash
   pip install redis>=5.0.0
   ```

2. **Start Redis server**:
   ```bash
   redis-server
   ```

3. **Configure environment** (optional):
   ```bash
   export REDIS_URL=redis://localhost:6379
   export REDIS_ENABLED=true
   ```

4. **Verify connection**:
   ```bash
   python scripts/redis_session_example.py
   ```

## Features

### Session Persistence

- **Automatic Serialization**: Sessions are automatically serialized using pickle
- **TTL Management**: Configurable time-to-live for all session data
- **Atomic Updates**: Redis transactions ensure consistency
- **Batch Operations**: Efficient bulk operations for large datasets

### Cross-Session Memory

- **User Context**: Store user preferences, settings, and history
- **Agent Memory**: Persist agent learning and patterns
- **Shared Knowledge**: Global knowledge base accessible to all agents
- **Session History**: Track user session patterns and behavior

### Connection Management

- **Connection Pooling**: Efficient connection reuse
- **Automatic Retry**: Configurable retry logic for failed operations
- **Health Monitoring**: Background health checks and reconnection
- **Graceful Degradation**: Fallback to in-memory storage

### Security Features

All existing security features are preserved:

- **Session Validation**: Enhanced session ID validation
- **User Binding**: Tamper-proof user session binding
- **CSRF Protection**: Cross-site request forgery prevention
- **Enumeration Detection**: Session enumeration attack prevention
- **Access Logging**: Comprehensive security event logging

## Performance Characteristics

### Memory Usage

- **Efficient Serialization**: Pickle format for optimal storage
- **Key Expiration**: Automatic cleanup via Redis TTL
- **Batch Operations**: Reduced network overhead
- **Connection Pooling**: Minimal connection overhead

### Scalability

- **Horizontal Scaling**: Multiple application instances can share Redis
- **Memory Management**: Configurable limits and cleanup policies
- **Background Tasks**: Non-blocking cleanup and maintenance
- **Load Distribution**: Connection pooling across instances

### Benchmarks

Typical performance characteristics:

- **Session Creation**: ~1-2ms with Redis, ~0.1ms in-memory
- **Message Addition**: ~0.5-1ms with Redis, ~0.05ms in-memory
- **Cross-Session Access**: ~1-3ms (Redis only)
- **Cleanup Operations**: Background, non-blocking

## Error Handling

### Redis Connection Failures

```python
# Automatic fallback to in-memory storage
store = get_session_store()  # Will use memory if Redis fails

# Check store type
stats = get_session_store_stats()
if stats['store_type'] == 'memory':
    print("Using fallback in-memory storage")
```

### Data Corruption

- **Graceful Degradation**: Corrupted sessions are automatically removed
- **Error Logging**: Comprehensive error tracking
- **Recovery Mechanisms**: Automatic retry and fallback strategies

### Network Issues

- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Health Monitoring**: Background connection health checks
- **Circuit Breaker**: Automatic fallback during extended outages

## Monitoring and Debugging

### Statistics

```python
from app.utils import get_session_store_stats

stats = get_session_store_stats()
print(f"Store type: {stats['store_type']}")
print(f"Total sessions: {stats['total_sessions']}")
print(f"Redis available: {stats['redis']['redis_available']}")
```

### Health Checks

```python
store = get_session_store()

if hasattr(store, 'get_redis_stats'):
    redis_stats = store.get_redis_stats()
    print(f"Connection retries: {redis_stats['connection_retries']}")
    print(f"Pool connections: {redis_stats.get('pool_created_connections', 0)}")
```

### Security Monitoring

```python
if hasattr(store, 'get_security_stats'):
    security_stats = store.get_security_stats()
    print(f"Failed attempts: {security_stats['total_failed_attempts']}")
    print(f"Flagged sessions: {security_stats['flagged_sessions']}")
```

## Testing

### Unit Tests

```bash
# Run Redis integration tests
python -m pytest tests/test_redis_session_integration.py -v

# Test with Redis unavailable
REDIS_ENABLED=false python -m pytest tests/test_redis_session_integration.py -v
```

### Load Testing

```bash
# Run the example script for load testing
python scripts/redis_session_example.py
```

### Memory Testing

```python
# Test memory cleanup
store = get_session_store()
if hasattr(store, 'cleanup_expired_sessions_async'):
    removed = await store.cleanup_expired_sessions_async()
    print(f"Cleaned up {removed} expired sessions")
```

## Migration

### From In-Memory to Redis

The Redis session store is backward compatible. To migrate:

1. **Install Redis**: Set up Redis server and client
2. **Configure Environment**: Set `REDIS_ENABLED=true`
3. **Restart Application**: Existing sessions will gradually move to Redis
4. **Verify**: Check statistics to confirm Redis usage

### Data Export/Import

```python
# Export sessions to backup
sessions = await store.list_sessions_async()

# Import from backup (application-specific logic)
for session_data in backup_sessions:
    store.ensure_session(session_data['id'], **session_data)
```

## Best Practices

### Configuration

- **Use Environment Variables**: Keep configuration flexible
- **Set Appropriate TTLs**: Balance persistence with memory usage
- **Enable Fallback**: Always allow fallback to in-memory storage
- **Monitor Health**: Set up Redis health monitoring

### Development

- **Use Factory Pattern**: Use `get_session_store()` for automatic selection
- **Handle Async/Sync**: Use async methods when available for better performance
- **Test Both Modes**: Test with both Redis and in-memory stores
- **Monitor Statistics**: Regular monitoring of store statistics

### Production

- **Redis Clustering**: Use Redis Cluster for high availability
- **Backup Strategy**: Regular Redis backups
- **Memory Monitoring**: Monitor Redis memory usage
- **Security**: Secure Redis with authentication and network restrictions

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis server is running: `redis-cli ping`
   - Verify connection string: `REDIS_URL`
   - Check network connectivity and firewall

2. **Memory Usage High**
   - Check TTL settings: `MEMORY_TTL_HOURS`
   - Monitor cleanup: `store.cleanup_expired_sessions()`
   - Review data retention policies

3. **Performance Issues**
   - Increase connection pool: `REDIS_MAX_CONNECTIONS`
   - Use async methods: `add_message_async`
   - Monitor Redis performance: `redis-cli --latency`

4. **Data Not Persisting**
   - Verify Redis enabled: `REDIS_ENABLED=true`
   - Check store type: `get_session_store_stats()['store_type']`
   - Review error logs for connection issues

### Debug Commands

```bash
# Check Redis connectivity
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Check Redis memory usage
redis-cli info memory

# List Vana keys
redis-cli keys "vana:*"
```

## Future Enhancements

### Planned Features

- **Redis Cluster Support**: Automatic sharding across Redis nodes
- **Compression**: Optional compression for large session data
- **Encryption**: At-rest encryption for sensitive session data
- **Metrics Integration**: Prometheus/Grafana monitoring
- **Schema Evolution**: Automatic migration for data format changes

### Configuration Extensions

- **Multiple Redis Instances**: Load balancing across Redis servers
- **Region-Based Storage**: Geographic data distribution
- **Tiered Storage**: Hot/cold data separation
- **Custom Serialization**: Support for additional serialization formats

---

## Example: Complete Integration

Here's a complete example showing how to integrate the Redis session store:

```python
import asyncio
from app.utils import (
    get_session_store,
    store_user_context,
    store_agent_memory,
    get_session_store_stats,
    shutdown_session_store
)

async def research_workflow_example():
    """Example research workflow using Redis session store."""

    # Get session store (automatically uses Redis if available)
    store = get_session_store()

    # Create research session
    session_id = "research_001"
    user_id = 123

    session = store.ensure_session(
        session_id,
        user_id=user_id,
        title="AI Safety Research",
        status="active"
    )

    # Store user research preferences
    await store_user_context(user_id, "research_prefs", {
        "depth": "comprehensive",
        "sources": ["academic", "industry"],
        "format": "detailed"
    })

    # Add research conversation
    messages = [
        {"role": "user", "content": "Research AI safety developments"},
        {"role": "assistant", "content": "Starting comprehensive research..."},
        {"role": "system", "content": "Phase 1: Literature review"},
    ]

    for msg in messages:
        store.add_message(session_id, msg)

    # Store agent learning
    await store_agent_memory("research_agent", "user_patterns", {
        "user_id": user_id,
        "research_topics": ["AI safety"],
        "preferred_depth": "comprehensive"
    })

    # Show statistics
    stats = get_session_store_stats()
    print(f"Using {stats['store_type']} store with {stats['total_sessions']} sessions")

    # Cleanup
    await shutdown_session_store()

# Run the example
if __name__ == "__main__":
    asyncio.run(research_workflow_example())
```

This Redis session store implementation provides a robust, scalable foundation for session management with comprehensive persistence, security, and cross-session memory capabilities.
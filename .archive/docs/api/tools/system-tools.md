# System Tools

Core system monitoring, health checks, and utility operations.

## Available Tools

### `get_health_status`
**Status**: ✅ Fully Functional  
**Description**: Comprehensive system health monitoring

```python
# Example usage
result = await get_health_status()
# Returns: system status, component health, and metrics
```

**Response Format**:
```json
{
  "status": "healthy",
  "agent": "vana",
  "mcp_enabled": true,
  "components": {
    "agents": "operational",
    "tools": "functional",
    "memory": "fallback_mode"
  }
}
```

**Parameters**:
- `detailed` (boolean, optional): Include detailed component status
- `include_metrics` (boolean, optional): Add performance metrics

### `echo`
**Status**: ✅ Fully Functional  
**Description**: Simple echo utility for testing and debugging

```python
# Example usage
result = await echo("test message")
# Returns: echoed message with timestamp
```

**Parameters**:
- `message` (string, required): Message to echo
- `format` (string, optional): Output format preference

### `get_system_info`
**Status**: ✅ Fully Functional  
**Description**: System environment and configuration details

```python
# Example usage
result = await get_system_info()
# Returns: environment details, versions, and configuration
```

**Response Includes**:
- Python version and environment
- System platform and architecture
- Available memory and resources
- Configuration status

### `monitor_performance`
**Status**: ✅ Fully Functional  
**Description**: Real-time performance monitoring

```python
# Example usage
result = await monitor_performance({
    "duration": 30,
    "metrics": ["cpu", "memory", "response_time"]
})
# Returns: performance metrics over specified duration
```

**Parameters**:
- `duration` (number, optional): Monitoring duration in seconds
- `metrics` (array, optional): Specific metrics to track
- `interval` (number, optional): Sampling interval

## Health Check Endpoints

### System Health
- **Endpoint**: `GET /health`
- **Response**: Basic system health status
- **Use Case**: Load balancer health checks

### Detailed Status
- **Endpoint**: `GET /info`
- **Response**: Comprehensive system information
- **Use Case**: Monitoring and diagnostics

### Version Information
- **Endpoint**: `GET /version`
- **Response**: System version and build details
- **Use Case**: Deployment verification

## Implementation Details

**Source Location**: `lib/_tools/adk_tools.py`  
**Health Service**: `lib/monitoring/health_check.py`  
**Performance Monitor**: `lib/monitoring/performance_monitor.py`

## Monitoring Features

- **Real-time Metrics**: CPU, memory, and response time tracking
- **Component Status**: Individual service health monitoring
- **Alert Thresholds**: Configurable warning and error levels
- **Historical Data**: Performance trend analysis

## Common Use Cases

1. **System Monitoring**: Track system health and performance
2. **Debugging**: Test connectivity and component status
3. **Load Balancing**: Health check endpoints for infrastructure
4. **Performance Tuning**: Identify bottlenecks and optimization opportunities

## Performance Thresholds

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| **CPU Usage** | < 70% | 70-85% | > 85% |
| **Memory Usage** | < 80% | 80-90% | > 90% |
| **Response Time** | < 200ms | 200-500ms | > 500ms |
| **Error Rate** | < 1% | 1-5% | > 5% |
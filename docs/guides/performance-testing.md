# Performance Testing Guide

[Home](../../index.md) > [Guides](../index.md) > Performance Testing

This guide explains how to run performance tests for VANA components, interpret the results, and use them to optimize your deployment.

## 1. Overview

Performance testing is essential for ensuring that VANA components meet performance requirements and for identifying bottlenecks. VANA includes a comprehensive performance testing framework that allows you to:

- Measure the latency of key operations
- Benchmark different components under various conditions
- Collect and analyze performance metrics
- Compare performance across different configurations

## 2. Vector Search Performance Testing

### 2.1. Running Vector Search Performance Tests

VANA includes performance tests for Vector Search components in the `tests/performance/test_vector_search_performance.py` file. These tests measure:

- Health check latency
- Embedding generation performance
- Search operation performance

To run the Vector Search performance tests:

```bash
# Run all Vector Search performance tests
pytest tests/performance/test_vector_search_performance.py -v

# Run a specific test
pytest tests/performance/test_vector_search_performance.py::TestVectorSearchPerformance::test_embedding_generation_performance -v

# Run tests with real Vector Search service (requires valid configuration)
RUN_REAL_PERFORMANCE_TESTS=1 pytest tests/performance/test_vector_search_performance.py -v
```

### 2.2. Understanding the Results

The performance tests output detailed statistics for each benchmark, including:

- **Count**: Number of measurements taken
- **Min**: Minimum execution time
- **Max**: Maximum execution time
- **Mean**: Average execution time
- **Median**: Median execution time
- **Std Dev**: Standard deviation of execution times
- **P95**: 95th percentile execution time
- **P99**: 99th percentile execution time

Example output:

```
Benchmark: Embedding Generation (Length: 100)
  Count: 20
  Min: 5.23 ms
  Max: 15.67 ms
  Mean: 8.45 ms
  Median: 7.89 ms
  Std Dev: 2.34 ms
  P95: 12.56 ms
  P99: 15.67 ms
  Metadata: {'text_length': 100}
```

### 2.3. Performance Expectations

The following table provides general performance expectations for Vector Search operations when using the mock implementation:

| Operation | Expected Latency (Mock) | Notes |
|-----------|-------------------------|-------|
| Health Check | 10-50 ms | Depends on number of checks performed |
| Embedding Generation (short text) | 1-10 ms | Text length < 100 characters |
| Embedding Generation (medium text) | 5-20 ms | Text length 100-1000 characters |
| Embedding Generation (long text) | 10-50 ms | Text length > 1000 characters |
| Search (5 results) | 5-20 ms | Depends on query complexity |
| Search (20 results) | 10-50 ms | Depends on query complexity |

When using the real Vector Search service, latencies will be significantly higher due to network communication and service processing time. Typical latencies for the real service are:

| Operation | Expected Latency (Real) | Notes |
|-----------|-------------------------|-------|
| Health Check | 500-2000 ms | Depends on number of checks performed |
| Embedding Generation | 200-1000 ms | Depends on text length and model |
| Search | 300-1500 ms | Depends on query complexity and result count |

### 2.4. Custom Performance Testing

You can use the performance testing utilities in your own scripts to benchmark specific operations:

```python
from tests.performance.test_vector_search_performance import run_benchmark
from tools.vector_search.vector_search_client import VectorSearchClient

# Create a client
client = VectorSearchClient()

# Benchmark embedding generation
result = run_benchmark(
    client.generate_embedding,
    iterations=10,
    warmup_iterations=2,
    name="Custom Embedding Benchmark",
    text="This is a test query"
)

# Print the results
print(result)
```

## 3. Performance Optimization

### 3.1. Vector Search Client Optimization

The following settings can be adjusted to optimize Vector Search client performance:

| Setting | Description | Optimization |
|---------|-------------|--------------|
| `VECTOR_SEARCH_MAX_RETRIES` | Number of retries | Lower for faster failure, higher for reliability |
| `VECTOR_SEARCH_TIMEOUT` | Operation timeout | Lower for faster failure, higher for reliability |
| `VECTOR_SEARCH_AUTO_FALLBACK` | Auto-fallback to mock | Enable for reliability, disable for consistency |

### 3.2. Circuit Breaker Optimization

The circuit breaker pattern can be optimized with these settings:

| Setting | Description | Optimization |
|---------|-------------|--------------|
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Failure threshold | Lower for faster protection, higher for tolerance |
| `CIRCUIT_BREAKER_RECOVERY_TIMEOUT` | Recovery timeout | Lower for faster recovery, higher for stability |

### 3.3. Caching Strategies

Consider implementing caching for frequently used operations:

- Cache embedding results for common queries
- Cache search results with appropriate TTL (time-to-live)
- Use in-memory caching for high-performance requirements

## 4. Performance Monitoring

### 4.1. Enabling Performance Tracking

To enable performance tracking in your VANA deployment:

1. Set `ENABLE_PERFORMANCE_TRACKING=true` in your `.env` file
2. Set `PERFORMANCE_LOG_PATH` to a valid file path
3. Restart your application

### 4.2. Analyzing Performance Logs

The performance logs are stored in JSON format and can be analyzed with tools like Python's `pandas` or visualization tools like Grafana.

Example script to analyze performance logs:

```python
import json
import pandas as pd
import matplotlib.pyplot as plt

# Load performance logs
with open('./data/performance_logs.json', 'r') as f:
    logs = json.load(f)

# Convert to DataFrame
df = pd.DataFrame(logs)

# Calculate statistics
stats = df.groupby('operation').agg({
    'duration_ms': ['mean', 'median', 'min', 'max', 'count']
})

# Plot results
stats['duration_ms']['mean'].plot(kind='bar')
plt.title('Average Operation Duration')
plt.ylabel('Duration (ms)')
plt.savefig('performance_analysis.png')
```

## 5. Advanced Performance Testing

### 5.1. Load Testing

For load testing Vector Search, you can use tools like `locust` or custom scripts:

```python
import concurrent.futures
from tools.vector_search.vector_search_client import VectorSearchClient

client = VectorSearchClient()

def search_task(query):
    return client.search(query)

# Run 100 concurrent searches
queries = ["test query " + str(i) for i in range(100)]
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(search_task, queries))
```

### 5.2. Continuous Performance Monitoring

For continuous performance monitoring, consider:

1. Integrating performance tests into your CI/CD pipeline
2. Setting up alerts for performance degradation
3. Regularly reviewing performance trends

## 6. Troubleshooting Performance Issues

### 6.1. Common Performance Issues

- **High Latency**: Check network connectivity, service health, and resource utilization
- **Inconsistent Performance**: Look for resource contention or throttling
- **Degrading Performance Over Time**: Check for memory leaks or resource exhaustion

### 6.2. Performance Debugging

To debug performance issues:

1. Run performance tests with increased logging (`LOG_LEVEL=DEBUG`)
2. Check system resource utilization during tests
3. Use profiling tools to identify bottlenecks
4. Compare with baseline performance metrics

## 7. Conclusion

Regular performance testing is essential for maintaining a high-performance VANA deployment. Use the provided tools and guidelines to establish performance baselines, optimize configurations, and monitor performance over time.

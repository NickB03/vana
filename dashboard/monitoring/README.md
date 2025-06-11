# ADK Memory Monitoring System

A comprehensive monitoring solution for Google ADK memory performance, costs, and reliability in the VANA system.

## Overview

This monitoring system provides real-time visibility into:

- **Performance Metrics**: Query latency, error rates, throughput, and cache efficiency
- **Cost Tracking**: ADK memory usage costs, projections, and optimization insights
- **Session State Monitoring**: Session persistence, state management, and memory usage
- **Reliability Metrics**: Uptime, SLA compliance, error patterns, and recovery metrics
- **Debugging Tools**: Comprehensive logging, tracing, and troubleshooting utilities

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADK Memory Monitoring System                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   ADK Memory    │  │   ADK Memory    │  │   ADK Memory    │ │
│  │    Monitor      │  │      API        │  │    Logger       │ │
│  │                 │  │                 │  │                 │ │
│  │ • Metrics       │  │ • REST API      │  │ • Operations    │ │
│  │ • Health Checks │  │ • Data Format   │  │ • Sessions      │ │
│  │ • Cost Tracking │  │ • Validation    │  │ • Errors        │ │
│  │ • Alerting      │  │ • Integration   │  │ • Tracing       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                     │                     │        │
│           └─────────────────────┼─────────────────────┘        │
│                                 │                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 ADK Memory Dashboard                        │ │
│  │                                                             │ │
│  │ • Performance Views    • Cost Analysis    • Session Monitoring │ │
│  │ • Historical Charts    • Alerts & Health  • Diagnostics    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                 │                              │
├─────────────────────────────────────────────────────────────────┤
│                    Integration Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Health Check   │  │ Alert Manager   │  │  API Server     │ │
│  │   Integration   │  │  Integration    │  │  Integration    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. ADK Memory Monitor (`adk_memory_monitor.py`)

Core monitoring component that:
- Collects real-time metrics from Google ADK memory services
- Performs health checks and generates alerts
- Tracks costs and usage patterns
- Provides performance analysis and comparisons

**Key Features:**
- Real-time metrics collection
- Automatic health monitoring
- Cost estimation and tracking
- Performance baseline comparison
- Alert generation for issues

### 2. ADK Memory API (`adk_memory_api.py`)

REST API layer that:
- Exposes monitoring data via HTTP endpoints
- Formats data for dashboard consumption
- Provides historical data access
- Enables external integrations

**Endpoints:**
- `/api/adk-memory/status` - System health status
- `/api/adk-memory/metrics` - Current performance metrics
- `/api/adk-memory/costs` - Cost metrics and projections
- `/api/adk-memory/history` - Historical data
- `/api/adk-memory/sessions` - Session state metrics
- `/api/adk-memory/reliability` - Reliability and SLA metrics
- `/api/adk-memory/diagnostics` - Diagnostic information

### 3. ADK Memory Logger (`adk_memory_logger.py`)

Comprehensive logging system that:
- Records all memory operations with structured logging
- Tracks session state events and changes
- Logs errors with full context and stack traces
- Provides operation tracing for debugging
- Analyzes logs for performance insights

**Log Types:**
- **Operations Log**: All memory queries and operations
- **Session Log**: Session state events and changes
- **Trace Log**: Detailed operation traces for debugging
- **Error Log**: Errors with context and stack traces

### 4. ADK Memory Dashboard (`adk_memory_dashboard.py`)

Interactive Streamlit dashboard that:
- Visualizes performance metrics in real-time
- Displays cost analysis and projections
- Shows session state monitoring
- Provides historical trend analysis
- Offers diagnostic and troubleshooting views

**Dashboard Sections:**
- **Performance**: Metrics, latency, error rates
- **Cost Analysis**: Usage costs and projections
- **Session Monitoring**: Session state and persistence
- **Historical Data**: Trends and patterns over time
- **Alerts & Health**: System health and alerts
- **Diagnostics**: Troubleshooting information

## Installation and Setup

### Prerequisites

1. **Google ADK Installation**:
   ```bash
   pip install google-adk[vertexai]
   ```

2. **Required Dependencies**:
   ```bash
   pip install streamlit plotly pandas
   ```

### Environment Configuration

Set the following environment variables:

```bash
# Required
export RAG_CORPUS_RESOURCE_NAME="projects/960076421399/locations/us-central1/ragCorpora/vana-corpus"
export GOOGLE_CLOUD_PROJECT="960076421399"

# Optional (with defaults)
export SIMILARITY_TOP_K=5
export VECTOR_DISTANCE_THRESHOLD=0.7
export VERTEX_AI_REGION="us-central1"
```

### Authentication

Configure Google Cloud authentication:

```bash
# Option 1: Service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Option 2: gcloud auth
gcloud auth application-default login
```

### Starting the System

1. **Start the API Server**:
   ```bash
   cd dashboard
   python api/server.py
   ```

2. **Start the Dashboard**:
   ```bash
   streamlit run app.py
   ```

3. **Access the Dashboard**:
   - Open http://localhost:8501 in your browser
   - Navigate to the "ADK Memory" tab

## Usage

### Monitoring Performance

The system automatically monitors:
- Query latency and throughput
- Error rates and success rates
- Cache hit rates and efficiency
- Memory usage and storage

### Cost Tracking

Track costs across:
- RAG Corpus queries
- Session storage
- Vertex AI API calls
- Total daily and monthly projections

### Session State Monitoring

Monitor session health:
- Active session count
- Session persistence rates
- Memory usage per session
- Session creation/termination rates

### Alerting

Automatic alerts for:
- High latency (>500ms)
- High error rate (>5%)
- Low cache hit rate (<70%)
- High costs (>$100/day)
- SLA breaches (<99.9% uptime)
- Session persistence issues (<95%)

### Debugging and Troubleshooting

Use the logging system for:
- Operation tracing and profiling
- Error analysis and patterns
- Performance bottleneck identification
- Session state debugging

## API Reference

### Health Status
```bash
curl http://localhost:5050/api/adk-memory/status
```

### Current Metrics
```bash
curl http://localhost:5050/api/adk-memory/metrics
```

### Cost Information
```bash
curl http://localhost:5050/api/adk-memory/costs
```

### Historical Data
```bash
curl "http://localhost:5050/api/adk-memory/history?hours=24"
```

### Session Metrics
```bash
curl http://localhost:5050/api/adk-memory/sessions
```

### Reliability Metrics
```bash
curl http://localhost:5050/api/adk-memory/reliability
```

### Diagnostic Information
```bash
curl http://localhost:5050/api/adk-memory/diagnostics
```

## Configuration

### Monitoring Configuration

```python
from dashboard.monitoring.adk_memory_monitor import adk_memory_monitor

# Adjust check interval
adk_memory_monitor.check_interval = 30  # 30 seconds

# Customize cost estimates
adk_memory_monitor.cost_per_rag_query = 0.001
adk_memory_monitor.cost_per_session_mb = 0.0001
```

### Logging Configuration

```python
from dashboard.monitoring.adk_memory_logger import ADKMemoryLogger

# Custom log directory
logger = ADKMemoryLogger(log_dir="custom/log/path")

# Log retention
logger.cleanup_old_logs(retention_days=30)
```

### Alert Thresholds

```python
# Customize alert thresholds in the monitor
# High latency threshold
HIGH_LATENCY_THRESHOLD = 500  # ms

# High error rate threshold
HIGH_ERROR_RATE_THRESHOLD = 0.05  # 5%

# High cost threshold
HIGH_COST_THRESHOLD = 100.0  # $100/day
```

## Testing

Run the comprehensive test suite:

```bash
python scripts/test_adk_memory_monitoring.py
```

This tests:
- ADK Memory Monitor functionality
- API endpoints and responses
- Logging and tracing
- Health check integration
- Dashboard component imports
- Environment configuration

## Troubleshooting

### Common Issues

1. **ADK Not Available**
   - Verify Google ADK installation
   - Check environment variables
   - Confirm authentication setup

2. **High Latency**
   - Check network connectivity
   - Verify RAG Corpus configuration
   - Monitor system resources

3. **High Error Rate**
   - Review error logs
   - Check authentication
   - Verify RAG Corpus availability

4. **Cost Spikes**
   - Analyze query patterns
   - Check for inefficient queries
   - Monitor session state sizes

### Diagnostic Commands

```bash
# Check system status
curl http://localhost:5050/api/adk-memory/diagnostics

# View recent errors
python -c "
from dashboard.monitoring.adk_memory_logger import adk_memory_logger
errors = adk_memory_logger.get_error_logs(hours=1)
for error in errors:
    print(f'{error[\"timestamp\"]}: {error[\"error_message\"]}')
"

# Generate troubleshooting report
python -c "
from dashboard.monitoring.adk_memory_logger import adk_memory_logger
report = adk_memory_logger.get_troubleshooting_report()
print(report)
"
```

## Best Practices

### Performance Optimization
- Use appropriate similarity thresholds
- Implement query caching
- Monitor and optimize session sizes
- Regular performance analysis

### Cost Management
- Set cost alerts and budgets
- Monitor query patterns
- Optimize similarity thresholds
- Use efficient caching strategies

### Reliability
- Monitor SLA compliance
- Set up proactive alerts
- Regular health checks
- Implement retry logic

### Security
- Secure API endpoints with authentication
- Protect sensitive configuration
- Regular security audits
- Monitor access patterns

## Integration

### With Existing Systems

The ADK memory monitoring integrates with:
- **Health Check System**: Automatic component registration
- **Alert Manager**: Unified alerting across all systems
- **Dashboard Framework**: Consistent UI and navigation
- **Logging Infrastructure**: Centralized log management

### Custom Integrations

Extend the system by:
- Adding custom metrics collectors
- Creating specialized dashboards
- Implementing custom alert conditions
- Building external integrations

## Support

### Documentation
- [ADK Memory Monitoring Guide](../../docs/monitoring/adk-memory-monitoring-guide.md)
- [Troubleshooting Guide](../../docs/troubleshooting/adk-memory-issues.md)
- [Google ADK Documentation](https://google.github.io/adk-docs/)

### Logs and Diagnostics
- Check logs in `logs/adk_memory/`
- Use diagnostic endpoints
- Review error patterns
- Generate troubleshooting reports

### Contact
For issues or questions:
1. Check the troubleshooting documentation
2. Review system logs and diagnostics
3. Use the test script to verify functionality
4. Contact the development team with detailed information

---

This monitoring system provides comprehensive visibility and control over ADK memory performance, enabling proactive management and optimization of the VANA system's memory infrastructure.


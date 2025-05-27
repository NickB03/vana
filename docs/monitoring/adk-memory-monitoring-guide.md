# ADK Memory Monitoring Guide

This guide provides comprehensive information about monitoring Google ADK memory performance, costs, and reliability in the VANA system.

## Overview

The ADK Memory Monitoring System provides:

- **Performance Monitoring**: Track query latency, error rates, and throughput
- **Cost Tracking**: Monitor ADK memory usage costs and projections
- **Session State Monitoring**: Track session persistence and state management
- **Reliability Metrics**: Monitor uptime, SLA compliance, and error patterns
- **Debugging Tools**: Comprehensive logging and troubleshooting utilities

## Quick Start

### Prerequisites

1. **Google ADK Installation**:
   ```bash
   pip install google-adk[vertexai]
   ```

2. **Environment Configuration**:
   ```bash
   export RAG_CORPUS_RESOURCE_NAME="projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
   export SIMILARITY_TOP_K=5
   export VECTOR_DISTANCE_THRESHOLD=0.7
   export GOOGLE_CLOUD_PROJECT="analystai-454200"
   export VERTEX_AI_REGION="us-central1"
   ```

### Starting the System

1. **Start the API Server**:
   ```bash
   cd dashboard
   python api/server.py
   ```

2. **Access the Dashboard**:
   ```bash
   streamlit run app.py
   ```

3. **Navigate to ADK Memory Section**:
   - Open the dashboard in your browser
   - Go to the "ADK Memory" tab

## Features

### Performance Metrics
- Query latency and throughput monitoring
- Error rate tracking and analysis
- Cache efficiency monitoring
- Memory usage optimization

### Cost Analysis
- Daily cost tracking across all ADK services
- Monthly projections and budget planning
- Cost per query analysis
- Usage optimization recommendations

### Session Monitoring
- Active session tracking
- Session persistence monitoring
- Memory usage per session
- Session lifecycle management

### Alerting
- Automatic alerts for performance issues
- Cost threshold notifications
- SLA compliance monitoring
- Custom alert configuration

## API Endpoints

- `GET /api/adk-memory/status` - System health status
- `GET /api/adk-memory/metrics` - Current performance metrics
- `GET /api/adk-memory/costs` - Cost metrics and projections
- `GET /api/adk-memory/history` - Historical data
- `GET /api/adk-memory/sessions` - Session state metrics
- `GET /api/adk-memory/reliability` - Reliability metrics
- `GET /api/adk-memory/diagnostics` - Diagnostic information

## Troubleshooting

For detailed troubleshooting information, see:
- [ADK Memory Issues Guide](../troubleshooting/adk-memory-issues.md)
- [System Diagnostics](../troubleshooting/adk-memory-issues.md#diagnostic-commands)

## Support

For issues or questions:
1. Check the troubleshooting documentation
2. Review system logs and diagnostics
3. Use the test script to verify functionality
4. Contact the development team with detailed information

---

This monitoring system provides comprehensive visibility into ADK memory performance, enabling proactive management and optimization of the VANA system's memory infrastructure.

# 📊 Monitoring Guide

This guide explains how to monitor the VANA system and interpret the metrics exposed by the dashboard.

VANA ships with a small monitoring backend located in [`dashboard/monitoring`](../../dashboard/monitoring/README.md). It provides health checks and metrics for the core services.

## Key Metrics

- **Health Status** — overall status from `/health`
- **Agent Performance** — response times and success rates
- **Tool Usage** — frequency of tool execution
- **Resource Utilization** — CPU and memory usage

## Dashboard Components

- **Health Checks** — periodic checks for each component
- **Alert Manager** — stores and exposes alert information
- **Metrics Endpoints** — JSON endpoints for current metrics
- **Streamlit Dashboard** — optional UI for real-time charts

Refer to the [dashboard monitoring README](../../dashboard/monitoring/README.md) for implementation details and advanced configuration.


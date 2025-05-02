# Monitoring Dashboard

This document describes the architecture, components, and integration of the VANA Monitoring Dashboard, reflecting the current backend (Flask API, alerting, health check) and frontend (React) implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Components](#backend-components)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The VANA Monitoring Dashboard provides real-time visibility into the health, performance, and status of all system components. It features:

- Health checks for all registered components
- Alerting for warnings and errors
- REST API for integration with the frontend
- Scenario-based testing and data generation
- Modern React-based web interface

---

## Architecture

- **Backend:** Flask API server (`dashboard/api/server.py`) exposes REST endpoints for alerts and health. Integrates with:
  - `dashboard/alerting/alert_manager.py` (alert management)
  - `dashboard/monitoring/health_check.py` (health checks)
  - `dashboard/testing/` (scenario-based test runner and data generator)
- **Frontend:** React app (`dashboard/frontend/`) displays health status, alerts, and system metrics, communicating with the backend via REST API.

---

## Backend Components

### Alert Manager

- File: `dashboard/alerting/alert_manager.py`
- Manages alert creation, storage, acknowledgment, and clearing.
- Alerts are persisted in `dashboard/alerting/alerts.json`.
- Supports notification stubs for future email/SMS integration.

### Health Check

- File: `dashboard/monitoring/health_check.py`
- Registers health check functions for any system component.
- Aggregates component health and generates alerts for WARNING/ERROR states.
- Provides current health status via API.

### API Server

- File: `dashboard/api/server.py`
- Exposes REST endpoints for alerts and health.
- Integrates with alert manager and health check modules.

---

## API Endpoints

| Endpoint                   | Method | Description                                 |
|----------------------------|--------|---------------------------------------------|
| `/api/alerts`              | GET    | List all active alerts                      |
| `/api/alerts/acknowledge`  | POST   | Acknowledge an alert by ID                  |
| `/api/alerts/clear`        | POST   | Clear an alert by ID                        |
| `/api/alerts/history`      | GET    | Get recent alert history                    |
| `/api/health`              | GET    | Get current health status for all components|

**Example: Get Health Status**
```bash
curl http://localhost:5050/api/health
```

**Example: Acknowledge an Alert**
```bash
curl -X POST http://localhost:5050/api/alerts/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"alert_id": "alert_1234567890"}'
```

---

## Frontend Integration

- The React frontend (`dashboard/frontend/`) polls the `/api/health` and `/api/alerts` endpoints to display real-time system status and alerts.
- Components:
  - `HealthStatus`: Shows overall and per-component health.
  - `Alerts`: Lists active alerts and provides controls to acknowledge/clear.
- To run the frontend:
  ```bash
  cd dashboard/frontend
  npm install
  npm start
  ```

---

## Testing

- Scenario-based data generators and test runner are in `dashboard/testing/`.
- To run backend tests:
  ```bash
  python dashboard/testing/run_dashboard_tests.py
  ```
- Test reports are saved in `dashboard/testing/reports/`.

---

## Troubleshooting

- Ensure both backend (Flask API) and frontend (React) servers are running.
- For API errors, check backend logs and alert JSON file.
- For frontend issues, check browser console and ensure API endpoints are reachable.

---

## Migration Notes

- This document supersedes previous references to `tools.monitoring.*` modules and Streamlit-based dashboards.
- All monitoring, alerting, and health check logic is now implemented in the `dashboard/` backend modules and exposed via REST API.

---

## See Also

- [dashboard.md](dashboard.md) — Main dashboard documentation and setup guide.
- [alert_manager.py](../dashboard/alerting/alert_manager.py) — Alert manager implementation.
- [health_check.py](../dashboard/monitoring/health_check.py) — Health check implementation.

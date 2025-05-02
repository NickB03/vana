# VANA Dashboard

The VANA Dashboard provides a modern, full-stack monitoring and visualization interface for the VANA agent system. It enables real-time monitoring of agent status, memory usage, system health, task execution, and alerting, with a clear separation between backend and frontend.

---

## Architecture Overview

- **Backend:** Flask API server (`dashboard/api/server.py`) exposes REST endpoints for alerts, health, and system data. It integrates with modular alerting (`dashboard/alerting/alert_manager.py`), health checks (`dashboard/monitoring/health_check.py`), and scenario-based testing (`dashboard/testing/`).
- **Frontend:** React application (`dashboard/frontend/`) provides a user-friendly web interface for real-time dashboard visualization and interaction.
- **Data Flow:** The React frontend communicates with the Flask backend via REST API endpoints.

---

## Directory Structure

```
dashboard/
  api/
    server.py
    ...
  alerting/
    alert_manager.py
  monitoring/
    health_check.py
  testing/
    data_generator.py
    run_dashboard_tests.py
  frontend/
    package.json
    public/
    src/
      App.js
      index.js
      components/
        Alerts.js
        HealthStatus.js
  README.md
  requirements.txt
```

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+ and npm

### Backend Setup

1. Install Python dependencies:
   ```bash
   pip install -r dashboard/requirements.txt
   ```
2. Start the Flask API server:
   ```bash
   python dashboard/api/server.py
   ```
   The API will run on `http://localhost:5050` by default.

### Frontend Setup

1. Install frontend dependencies:
   ```bash
   cd dashboard/frontend
   npm install
   ```
2. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will run on `http://localhost:3000` and proxy API requests to the backend.

---

## API Endpoints

- `GET /api/alerts` — List all active alerts
- `POST /api/alerts/acknowledge` — Acknowledge an alert by ID (`{"alert_id": "..."}`)
- `POST /api/alerts/clear` — Clear an alert by ID (`{"alert_id": "..."}`)
- `GET /api/alerts/history` — Get recent alert history
- `GET /api/health` — Get current health status for all registered components

See [monitoring-dashboard.md](monitoring-dashboard.md) for detailed API and data model documentation.

---

## Alerting & Monitoring

- Alerts are generated automatically for any health check WARNING or ERROR.
- Alerts are stored in `dashboard/alerting/alerts.json` and can be acknowledged or cleared via API.
- Health checks are extensible and can be registered for any system component.
- The backend supports scenario-based data generation and test execution.

---

## Frontend

- Built with React (`dashboard/frontend/`).
- Components:
  - `HealthStatus`: Displays system health and component status.
  - `Alerts`: Displays active alerts and allows acknowledgment/clearing.
- Communicates with backend via REST API.
- To build for production:
  ```bash
  npm run build
  ```

---

## Testing

- Scenario-based data generators support edge cases and stress tests (`dashboard/testing/data_generator.py`).
- Test runner (`dashboard/testing/run_dashboard_tests.py`) executes scenarios and saves structured reports in `dashboard/testing/reports/`.
- Scenarios include: `default`, `high_load`, `degraded_services`, `error_spike`.

---

## Development

- To add a new backend API or component, create a new module in the appropriate subdirectory and register it in the Flask server.
- To add a new frontend component, add it to `dashboard/frontend/src/components/` and update `App.js` as needed.

---

## Troubleshooting

- If the dashboard does not load, ensure both backend and frontend servers are running.
- For API errors, check backend logs and ensure all dependencies are installed.
- For frontend issues, check the browser console and ensure the React app is running.

---

## License

MIT License

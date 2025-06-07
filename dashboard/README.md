# VANA Dashboard Backend

This README documents the backend infrastructure for the VANA Dashboard, including alerting, health monitoring, testing, and CI/CD integration.

---

## Directory Structure

- `alerting/alert_manager.py` — Backend alerting system (alert creation, storage, management, notification stub)
- `monitoring/health_check.py` — Health check system with alert integration (generates alerts for WARNING/ERROR states)
- `api/server.py` — Flask API server exposing `/api/alerts` and `/api/health` endpoints
- `testing/data_generator.py` — Dedicated data generators for agent, memory, system, and task APIs (scenario-based mock data)
- `testing/run_dashboard_tests.py` — Test runner script (runs scenarios, measures performance, outputs structured reports)

---

## API Endpoints

### Alerts

- `GET /api/alerts` — List all active alerts
- `POST /api/alerts/acknowledge` — Acknowledge an alert by ID (`{"alert_id": "..."}`)
- `POST /api/alerts/clear` — Clear an alert by ID (`{"alert_id": "..."}`)

### Health

- `GET /api/health` — Get current health status for all registered components

```bash
# Install all backend and dashboard dependencies
poetry install
```

---

## Alerting & Monitoring

- Alerts are generated automatically for any health check WARNING or ERROR.
- Alerts are stored in `dashboard/alerting/alerts.json` and can be acknowledged or cleared via API.
- Health checks are extensible and can be registered for any system component.

```bash
python api/server.py
```

---

## Testing

- Scenario-based data generators support edge cases and stress tests.
- Test runner (`run_dashboard_tests.py`) executes scenarios and saves structured reports in `dashboard/testing/reports/`.
- Scenarios include: `default`, `high_load`, `degraded_services`, `error_spike`.

```bash
python testing/run_dashboard_tests.py
```

---

## CI/CD

- `.github/workflows/ci.yml` — Runs lint, tests, and uploads test reports on push/PR to `sprint3`.
- `.github/workflows/deploy.yml` — Placeholder for automated deployment steps (to be customized for your environment).

---

## Getting Started

1. **Install dependencies** using Poetry:

   ```
   poetry install
   ```

2. **Run the API server**:

   ```
   python api/server.py
   ```

3. **Run dashboard tests**:

   ```
   python testing/run_dashboard_tests.py
   ```

---

## Next Steps

- Integrate API endpoints with the dashboard frontend for real-time alert and health status display.
- Implement real notification delivery (email/SMS) in `AlertManager`.
- Expand test coverage and reporting.
- Customize deployment workflow for your environment.

---

## License

MIT License

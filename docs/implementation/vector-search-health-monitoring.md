# Vector Search Health Monitoring System

The Vector Search Health Monitoring System provides comprehensive monitoring, alerting, and visualization for the Vector Search integration in VANA. This document outlines the components, setup, and usage of the monitoring system.

## System Components

The monitoring system consists of the following components:

1. **Vector Search Health Checker** (`tools/vector_search/health_checker.py`)
   - Core health checking functionality
   - Performs comprehensive checks on Vector Search
   - Generates actionable recommendations

2. **Scheduled Health Monitor** (`scripts/scheduled_vector_search_monitor.py`)
   - Runs health checks on a schedule
   - Stores historical health data
   - Generates alerts for critical issues
   - Performs trend analysis

3. **Dashboard Integration** (`dashboard/monitoring/vector_search_monitor.py`)
   - Provides integration with the monitoring dashboard
   - Formats health data for visualization
   - Manages historical data for trend analysis

4. **Dashboard UI** (`dashboard/templates/vector_search_health.html`)
   - Visualizes health status and metrics
   - Displays historical trends
   - Shows actionable recommendations

5. **Dashboard Routes** (`dashboard/routes/vector_search_routes.py`)
   - Provides API endpoints for health data
   - Renders the dashboard UI

## Setup and Configuration

### Prerequisites

- Python 3.7+
- Flask (for dashboard)
- Schedule (for scheduled monitoring)
- Chart.js (included via CDN for dashboard)

### Installation

1. Ensure all required files are in place:
   ```
   tools/vector_search/health_checker.py
   scripts/scheduled_vector_search_monitor.py
   dashboard/monitoring/vector_search_monitor.py
   dashboard/templates/vector_search_health.html
   dashboard/routes/vector_search_routes.py
   ```

2. Install required Python packages:
   ```bash
   pip install flask schedule
   ```

3. Configure environment variables for Vector Search:
   ```
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   VECTOR_SEARCH_ENDPOINT_ID=your-endpoint-id
   DEPLOYED_INDEX_ID=vanasharedindex
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

## Usage

### Running Health Checks

#### Basic Health Check

```bash
python scripts/test_vector_search_health.py
```

#### Detailed Health Check

```bash
python scripts/test_vector_search_health.py --mode detailed --verbose
```

#### Continuous Monitoring

```bash
python scripts/test_vector_search_health.py --mode monitor --interval 60 --count 0
```

### Scheduled Monitoring

Start the scheduled monitoring service:

```bash
python scripts/scheduled_vector_search_monitor.py --interval 15 --alert-level error --alert-method both
```

Options:
- `--interval`: Monitoring interval in minutes (default: 15)
- `--no-store`: Don't store historical reports
- `--alert-level`: Minimum level to trigger alerts (ok, warn, error, critical)
- `--alert-method`: Alert method (log, file, both)
- `--history-dir`: Directory to store historical reports
- `--log-file`: Log file path

### Dashboard

To start the dashboard (assuming you have a Flask app set up):

```python
from flask import Flask
from dashboard.routes.vector_search_routes import register_routes

app = Flask(__name__)
register_routes(app)

if __name__ == '__main__':
    app.run(debug=True)
```

Then access the dashboard at:
- http://localhost:5000/vector-search/health

API endpoints:
- http://localhost:5000/vector-search/api/health
- http://localhost:5000/vector-search/api/run-check

## Health Check Details

The health checker performs the following checks:

1. **Environment Check**
   - Verifies required environment variables are set
   - Checks for missing configuration

2. **Authentication Check**
   - Verifies authentication with Google Cloud
   - Checks service account permissions

3. **Embedding Check**
   - Tests embedding generation functionality
   - Verifies embedding dimensions and format
   - Detects mock implementations

4. **Search Check**
   - Tests search functionality
   - Verifies result format and quality
   - Measures response time

## Alerts and Notifications

The monitoring system can generate alerts based on health check results:

- **Error Level**: Triggered when critical functionality is broken
- **Warning Level**: Triggered when non-critical issues are detected
- **Critical Level**: Triggered when multiple critical issues are detected

Alert methods:
- **Log**: Alerts are logged to the console/log file
- **File**: Alerts are saved to the alerts directory
- **Both**: Alerts are both logged and saved to files

## Historical Data Analysis

The monitoring system stores historical health data and provides analysis:

- **Status Distribution**: Breakdown of health status over time
- **Response Time Trends**: Changes in response time
- **Success Rate Trends**: Changes in check success rate
- **Health Percentage**: Percentage of "ok" status checks

## Dashboard Features

The dashboard provides the following features:

- **Real-time Status**: Current health status of Vector Search
- **Component Status**: Status of individual components
- **Metrics Visualization**: Charts for response time and success rate
- **Status Distribution**: Breakdown of status over time
- **Recommendations**: Actionable recommendations for issues
- **Trend Analysis**: Performance trends over time

## Troubleshooting

If you encounter issues with the monitoring system:

1. **Check Environment Variables**
   - Verify all required environment variables are set correctly
   - Ensure the service account key file exists and is accessible

2. **Check Permissions**
   - Verify the service account has appropriate permissions
   - Test authentication with `gcloud auth activate-service-account`

3. **Check Vector Search Endpoint**
   - Verify the endpoint exists and is accessible
   - Check that the deployed index exists

4. **Check Dashboard Integration**
   - Verify Flask is installed and configured correctly
   - Check that all template files are in the correct location

## Integration with Other Systems

The monitoring system can be integrated with other systems:

- **Alerting Systems**: Use the alert files or API to trigger external alerts
- **Monitoring Dashboards**: Use the API endpoints to integrate with existing dashboards
- **CI/CD Pipelines**: Run health checks as part of deployment validation

## Future Enhancements

Planned enhancements for the monitoring system:

1. **Email/Slack Notifications**: Direct notifications for critical issues
2. **Advanced Anomaly Detection**: ML-based detection of unusual patterns
3. **Predictive Maintenance**: Predict issues before they occur
4. **Custom Check Extensions**: Allow custom health checks to be added
5. **Multi-Environment Support**: Monitor multiple Vector Search environments

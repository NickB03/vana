# Monitoring System Setup

[Home](../index.md) > [Operations](index.md) > Monitoring System Setup

This guide provides detailed instructions for setting up and configuring the Vector Search Health Monitoring System.

## Overview

The Vector Search Health Monitoring System consists of several components:

1. **Vector Search Health Checker**: Core health checking functionality
2. **Scheduled Monitoring Service**: Runs health checks on a schedule
3. **Dashboard Application**: Provides a web interface for monitoring
4. **Authentication System**: Secures access to the dashboard

This guide will walk you through the setup and configuration of each component.

## Prerequisites

Before setting up the monitoring system, ensure you have:

- Python 3.7 or higher
- pip package manager
- Access to the Vector Search system
- Appropriate permissions for the service account
- Network access to the Vector Search endpoint

## Installation

### 1. Install Required Packages

Install the required Python packages:

```bash
pip install flask schedule requests google-cloud-aiplatform
```

### 2. Set Up Environment Variables

Create a `.env` file with the following environment variables:

```
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Vector Search Configuration
VECTOR_SEARCH_ENDPOINT_ID=your-endpoint-id
DEPLOYED_INDEX_ID=vanasharedindex

# Dashboard Configuration
DASHBOARD_SECRET_KEY=your-secret-key
DASHBOARD_AUTH_ENABLED=true
DASHBOARD_CREDENTIALS_FILE=/path/to/credentials.json
DASHBOARD_AUDIT_LOG_FILE=/path/to/audit.log
```

Load the environment variables:

```bash
export $(cat .env | xargs)
```

### 3. Create Directory Structure

Create the necessary directories:

```bash
mkdir -p health_history
mkdir -p alerts
mkdir -p analysis
mkdir -p logs/audit
```

## Setting Up the Health Checker

The Vector Search Health Checker is already implemented in `tools/vector_search/health_checker.py`. You can test it with:

```bash
python scripts/test_vector_search_health.py
```

This will run a health check and display the results.

## Setting Up the Scheduled Monitoring Service

### 1. Configure the Service

Edit the `scripts/scheduled_vector_search_monitor.py` file to customize the monitoring configuration:

- Adjust the monitoring interval
- Configure alert levels and methods
- Set up data retention policies

### 2. Create a Systemd Service

Create a systemd service file at `/etc/systemd/system/vector-search-monitor.service`:

```ini
[Unit]
Description=Vector Search Health Monitoring
After=network.target

[Service]
ExecStart=/usr/bin/python3 /path/to/scripts/scheduled_vector_search_monitor.py
Restart=always
User=vana-service
Group=vana-service
Environment=PYTHONUNBUFFERED=1
EnvironmentFile=/path/to/.env

[Install]
WantedBy=multi-user.target
```

### 3. Enable and Start the Service

Enable and start the systemd service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vector-search-monitor
sudo systemctl start vector-search-monitor
```

### 4. Verify the Service

Check the status of the service:

```bash
sudo systemctl status vector-search-monitor
```

## Setting Up the Dashboard

### 1. Configure the Dashboard

Edit the `dashboard/flask_app.py` file to customize the dashboard configuration:

- Adjust the host and port
- Configure authentication settings
- Set up logging

### 2. Create a Systemd Service

Create a systemd service file at `/etc/systemd/system/vector-search-dashboard.service`:

```ini
[Unit]
Description=Vector Search Health Dashboard
After=network.target

[Service]
ExecStart=/usr/bin/python3 /path/to/dashboard/flask_app.py
Restart=always
User=vana-service
Group=vana-service
Environment=PYTHONUNBUFFERED=1
EnvironmentFile=/path/to/.env

[Install]
WantedBy=multi-user.target
```

### 3. Enable and Start the Service

Enable and start the systemd service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vector-search-dashboard
sudo systemctl start vector-search-dashboard
```

### 4. Verify the Service

Check the status of the service:

```bash
sudo systemctl status vector-search-dashboard
```

## Setting Up Authentication

### 1. Create Credentials File

Create a credentials file at `/path/to/credentials.json`:

```json
{
  "admin": {
    "password_hash": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    "roles": ["admin"],
    "created_at": "2025-05-09T12:00:00.000Z"
  },
  "viewer": {
    "password_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "roles": ["viewer"],
    "created_at": "2025-05-09T12:00:00.000Z"
  }
}
```

The default password for both users is "admin". You should change these passwords immediately after setup.

### 2. Configure Authentication

Edit the `.env` file to configure authentication:

```
DASHBOARD_AUTH_ENABLED=true
DASHBOARD_CREDENTIALS_FILE=/path/to/credentials.json
DASHBOARD_AUDIT_LOG_FILE=/path/to/audit.log
DASHBOARD_TOKEN_EXPIRY=86400
```

## Configuration Options

### Health Checker Configuration

The Vector Search Health Checker supports the following configuration options:

- `history_size`: Number of health check results to keep in history (default: 10)

Example:

```python
checker = VectorSearchHealthChecker(history_size=20)
```

### Scheduled Monitoring Configuration

The scheduled monitoring service supports the following command-line options:

- `--interval`: Monitoring interval in minutes (default: 15)
- `--no-store`: Don't store historical reports
- `--alert-level`: Minimum level to trigger alerts (ok, warn, error, critical)
- `--alert-method`: Alert method (log, file, both)
- `--history-dir`: Directory to store historical reports
- `--log-file`: Log file path
- `--degraded-mode`: Start in degraded mode (limited functionality)
- `--adaptive-interval`: Use adaptive monitoring intervals
- `--retention-days`: Number of days to retain historical data

Example:

```bash
python scripts/scheduled_vector_search_monitor.py --interval 10 --alert-level warn --alert-method both --adaptive-interval --retention-days 60
```

### Dashboard Configuration

The dashboard application supports the following command-line options:

- `--host`: Host to listen on (default: 127.0.0.1)
- `--port`: Port to listen on (default: 5000)
- `--debug`: Enable debug mode
- `--no-auth`: Disable authentication

Example:

```bash
python dashboard/flask_app.py --host 0.0.0.0 --port 8080
```

## Backup and Recovery

### Backing Up Data

To back up the monitoring system data:

1. Stop the monitoring and dashboard services:

```bash
sudo systemctl stop vector-search-monitor
sudo systemctl stop vector-search-dashboard
```

2. Back up the data directories:

```bash
tar -czf vector-search-monitoring-backup.tar.gz health_history alerts analysis logs
```

3. Restart the services:

```bash
sudo systemctl start vector-search-monitor
sudo systemctl start vector-search-dashboard
```

### Restoring Data

To restore the monitoring system data:

1. Stop the monitoring and dashboard services:

```bash
sudo systemctl stop vector-search-monitor
sudo systemctl stop vector-search-dashboard
```

2. Extract the backup:

```bash
tar -xzf vector-search-monitoring-backup.tar.gz
```

3. Restart the services:

```bash
sudo systemctl start vector-search-monitor
sudo systemctl start vector-search-dashboard
```

## Performance Tuning

### Monitoring Interval

Adjust the monitoring interval based on your needs:

- **Lower interval** (e.g., 5 minutes): More frequent checks, higher resource usage
- **Higher interval** (e.g., 30 minutes): Less frequent checks, lower resource usage

### Data Retention

Adjust the data retention policy based on your needs:

- **Lower retention** (e.g., 7 days): Less disk space usage
- **Higher retention** (e.g., 90 days): More historical data, higher disk space usage

### Dashboard Performance

Improve dashboard performance:

- Use a production-ready WSGI server like Gunicorn
- Set up a reverse proxy with Nginx
- Enable caching for static assets
- Optimize database queries

## Troubleshooting

### Common Issues

#### Monitoring Service Not Starting

If the monitoring service fails to start:

1. Check the service logs:

```bash
sudo journalctl -u vector-search-monitor
```

2. Verify environment variables:

```bash
sudo systemctl show vector-search-monitor -p Environment
```

3. Check file permissions:

```bash
ls -la /path/to/scripts/scheduled_vector_search_monitor.py
```

#### Dashboard Not Accessible

If the dashboard is not accessible:

1. Check the service logs:

```bash
sudo journalctl -u vector-search-dashboard
```

2. Verify the service is running:

```bash
sudo systemctl status vector-search-dashboard
```

3. Check network configuration:

```bash
sudo netstat -tulpn | grep python
```

#### Authentication Issues

If you encounter authentication issues:

1. Check the credentials file:

```bash
cat /path/to/credentials.json
```

2. Verify environment variables:

```bash
echo $DASHBOARD_AUTH_ENABLED
echo $DASHBOARD_CREDENTIALS_FILE
```

3. Check audit logs:

```bash
cat /path/to/audit.log
```

## Security Considerations

### Network Security

- Use HTTPS for dashboard access
- Restrict access to the dashboard to trusted networks
- Use a firewall to protect the dashboard server

### Authentication Security

- Use strong passwords for dashboard users
- Change default passwords immediately
- Rotate passwords regularly
- Enable audit logging

### File Security

- Restrict access to credentials and configuration files
- Use proper file permissions
- Store sensitive files in secure locations

## Maintenance

### Regular Tasks

- Monitor disk space usage
- Review audit logs
- Rotate log files
- Update passwords
- Test backup and recovery procedures

### Upgrading

To upgrade the monitoring system:

1. Stop the services:

```bash
sudo systemctl stop vector-search-monitor
sudo systemctl stop vector-search-dashboard
```

2. Update the code:

```bash
git pull
```

3. Restart the services:

```bash
sudo systemctl start vector-search-monitor
sudo systemctl start vector-search-dashboard
```

## Support

If you encounter issues with the monitoring system:

1. Check the documentation
2. Review the logs
3. Contact the VANA support team

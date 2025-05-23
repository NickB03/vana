# Deploying VANA Services with Systemd

[Home](../../index.md) > [Guides](../index.md) > Deploying with Systemd

This guide provides instructions for deploying the VANA Vector Search monitoring script, dashboard API, and dashboard UI as systemd services on a Linux system. This setup allows the services to start automatically on boot and be managed using standard systemd commands.

## Prerequisites

*   A Linux system with systemd.
*   Python 3.9+ installed.
*   All project dependencies installed (see `requirements.txt` and the [Installation Guide](./installation-guide.md)).
*   The VANA project code cloned to a directory (e.g., `/Users/nick/Development/vana`).
*   A dedicated user account to run the services (e.g., `nick`).
*   Environment file (`.env`) configured with necessary API keys and settings (see [Environment Configuration](../../implementation/vector-search-environment.md)).

## Systemd Service Files

The following systemd service files are provided in the `config/systemd/` directory:

*   `vector-search-monitor.service`: Manages the Vector Search monitoring script.
*   `vector-search-dashboard.service`: Manages the Flask API for the dashboard.
*   `vector-search-ui.service`: Manages the Streamlit UI for the dashboard.

### 1. `vector-search-monitor.service`

```ini
[Unit]
Description=VANA Vector Search Monitoring Service
After=network.target

[Service]
User=nick
WorkingDirectory=/Users/nick/Development/vana
ExecStart=/usr/bin/python3 /Users/nick/Development/vana/scripts/monitor_vector_search.py
Restart=on-failure
StandardOutput=journal
StandardError=journal
EnvironmentFile=/Users/nick/Development/vana/.env

[Install]
WantedBy=multi-user.target
```

**Key Configuration:**
*   `User`: The user account under which the service will run. **Update this** if you use a different username.
*   `WorkingDirectory`: The root directory of the VANA project. **Update this** if your project is cloned elsewhere.
*   `ExecStart`: The command to start the monitoring script. Ensure the Python interpreter path is correct for your system.
*   `EnvironmentFile`: Path to the `.env` file containing environment variables.

### 2. `vector-search-dashboard.service`

```ini
[Unit]
Description=VANA Vector Search Dashboard API Service
After=network.target vector-search-monitor.service

[Service]
User=nick
WorkingDirectory=/Users/nick/Development/vana/dashboard
ExecStart=/Users/nick/Development/vana/venv/bin/gunicorn -w 4 -b 0.0.0.0:8001 flask_app:app
Restart=on-failure
StandardOutput=journal
StandardError=journal
EnvironmentFile=/Users/nick/Development/vana/.env

[Install]
WantedBy=multi-user.target
```

**Key Configuration:**
*   `User`, `WorkingDirectory`, `EnvironmentFile`: Similar to the monitor service. **Update these** as needed.
*   `ExecStart`: Command to start the Flask application using Gunicorn. Ensure the path to `gunicorn` (within your project's virtual environment) is correct. The `-w 4` flag specifies 4 worker processes, and `-b 0.0.0.0:8001` binds the API to port 8001 on all network interfaces.
*   `After`: Ensures this service starts after the network is up and the monitor service has started.

### 3. `vector-search-ui.service`

```ini
[Unit]
Description=VANA Vector Search Dashboard UI Service
After=network.target vector-search-dashboard.service

[Service]
User=nick
WorkingDirectory=/Users/nick/Development/vana/dashboard
ExecStart=/Users/nick/Development/vana/venv/bin/streamlit run streamlit_app.py --server.port 8501 --server.address 0.0.0.0
Restart=on-failure
StandardOutput=journal
StandardError=journal
EnvironmentFile=/Users/nick/Development/vana/.env

[Install]
WantedBy=multi-user.target
```

**Key Configuration:**
*   `User`, `WorkingDirectory`, `EnvironmentFile`: Similar to other services. **Update these** as needed.
*   `ExecStart`: Command to start the Streamlit application. Ensure the path to `streamlit` (within your project's virtual environment) is correct. `--server.port 8501` runs the UI on port 8501, and `--server.address 0.0.0.0` makes it accessible on all network interfaces.
*   `After`: Ensures this service starts after the network is up and the dashboard API service has started.

## Installation and Management

1.  **Copy Service Files:**
    Copy the service files from `config/systemd/` to the systemd directory on your server (usually `/etc/systemd/system/`).
    ```bash
    sudo cp /Users/nick/Development/vana/config/systemd/vector-search-monitor.service /etc/systemd/system/
    sudo cp /Users/nick/Development/vana/config/systemd/vector-search-dashboard.service /etc/systemd/system/
    sudo cp /Users/nick/Development/vana/config/systemd/vector-search-ui.service /etc/systemd/system/
    ```
    **Note:** Adjust the source paths if your project is located elsewhere.

2.  **Reload Systemd Daemon:**
    After copying the files, tell systemd to reload its configuration:
    ```bash
    sudo systemctl daemon-reload
    ```

3.  **Enable Services (to start on boot):**
    ```bash
    sudo systemctl enable vector-search-monitor.service
    sudo systemctl enable vector-search-dashboard.service
    sudo systemctl enable vector-search-ui.service
    ```

4.  **Start Services:**
    ```bash
    sudo systemctl start vector-search-monitor.service
    sudo systemctl start vector-search-dashboard.service
    sudo systemctl start vector-search-ui.service
    ```

5.  **Check Service Status:**
    ```bash
    sudo systemctl status vector-search-monitor.service
    sudo systemctl status vector-search-dashboard.service
    sudo systemctl status vector-search-ui.service
    ```

6.  **View Logs:**
    Logs for each service are managed by journald. You can view them using `journalctl`:
    ```bash
    sudo journalctl -u vector-search-monitor.service -f
    sudo journalctl -u vector-search-dashboard.service -f
    sudo journalctl -u vector-search-ui.service -f
    ```
    (The `-f` flag follows the logs in real-time.)

7.  **Stop Services:**
    ```bash
    sudo systemctl stop vector-search-ui.service
    sudo systemctl stop vector-search-dashboard.service
    sudo systemctl stop vector-search-monitor.service
    ```
    (Stop in reverse order of dependency if needed.)

8.  **Disable Services (to prevent start on boot):**
    ```bash
    sudo systemctl disable vector-search-ui.service
    sudo systemctl disable vector-search-dashboard.service
    sudo systemctl disable vector-search-monitor.service
    ```

## Troubleshooting

*   **Service Fails to Start:**
    *   Check the status (`sudo systemctl status <service-name>`) and logs (`sudo journalctl -u <service-name>`) for error messages.
    *   Verify that paths in the service files (WorkingDirectory, ExecStart, EnvironmentFile) are correct.
    *   Ensure the specified `User` has the necessary permissions to access the project files and execute the scripts/commands.
    *   Confirm that the Python virtual environment is correctly set up and activated if your `ExecStart` commands rely on it (as shown in the examples for the dashboard and UI services).
    *   Make sure the `.env` file exists at the specified `EnvironmentFile` path and contains all required variables.
*   **Port Conflicts:** If services fail to start due to port conflicts (e.g., port 8001 or 8501 already in use), modify the `ExecStart` commands in the respective service files to use different ports.
*   **Dependency Issues:** If a service depends on another (e.g., UI depends on API), ensure the dependent service is running correctly.
*   **Permission Issues:** If you encounter permission errors, check that the service user has appropriate access to all required directories and files.

## Security Considerations

When deploying VANA services with systemd, consider these security enhancements:

### 1. Service Hardening

Enhance the security of your systemd service files by adding the following directives to the `[Service]` section:

```ini
# Restrict service privileges
ProtectSystem=strict
ProtectHome=read-only
PrivateTmp=true
NoNewPrivileges=true
CapabilityBoundingSet=
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=true
```

These settings restrict what the service can access and modify on the system.

### 2. Environment File Security

The `.env` file contains sensitive information and should be properly secured:

```bash
# Create a dedicated directory for environment files
sudo mkdir -p /etc/vana
sudo cp /path/to/your/.env /etc/vana/vector-search.env

# Set restrictive permissions
sudo chown root:root /etc/vana/vector-search.env
sudo chmod 600 /etc/vana/vector-search.env

# Update the EnvironmentFile path in your service files
# EnvironmentFile=/etc/vana/vector-search.env
```

### 3. Dedicated Service User

Create a dedicated user for running the VANA services instead of using your personal account:

```bash
# Create a system user without login capabilities
sudo useradd -r -s /bin/false vana-service

# Update ownership of necessary files
sudo chown -R vana-service:vana-service /path/to/vana/data

# Update the User directive in your service files
# User=vana-service
```

### 4. Logging Configuration

Configure proper logging for production environments:

```bash
# Create a log directory
sudo mkdir -p /var/log/vana
sudo chown vana-service:vana-service /var/log/vana

# Add logging directives to the service files
# StandardOutput=append:/var/log/vana/vector-search-monitor.log
# StandardError=append:/var/log/vana/vector-search-monitor.error.log
```

### 5. Resource Limits

Add resource limits to prevent service abuse:

```ini
# Add to [Service] section
CPUQuota=50%
MemoryLimit=1G
TasksMax=100
LimitNOFILE=1024
```

### 6. Network Security

If your services need to be accessible only locally, bind them to localhost:

```bash
# Modify the ExecStart line in vector-search-dashboard.service
ExecStart=/path/to/venv/bin/gunicorn -w 4 -b 127.0.0.1:8001 flask_app:app
```

## Production Deployment Checklist

Before deploying to production, ensure you have:

1. **Updated Configuration:**
   - Modified `dashboard/config/demo.py` with secure values or created a dedicated production config
   - Set `FLASK_CONFIG=production` in your environment file

2. **Secured Credentials:**
   - Followed the [Credential Setup guide](credential-setup.md) for secure GCP credentials
   - Generated strong passwords and API keys
   - Set proper file permissions on all credential files

3. **Implemented HTTPS:**
   - Obtained valid SSL certificates
   - Configured HTTPS in your dashboard configuration
   - Updated service files to use HTTPS settings

4. **Set Up Monitoring:**
   - Configured log rotation
   - Set up monitoring for service status
   - Implemented alerts for service failures

5. **Tested Thoroughly:**
   - Verified all services start correctly
   - Tested authentication and API access
   - Confirmed proper dependency handling between services

This guide provides a foundation for deploying VANA services securely. Adapt these recommendations to your specific environment and security requirements.
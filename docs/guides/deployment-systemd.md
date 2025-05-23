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

This guide provides a basic setup. For production environments, consider additional security measures, resource limits, and more robust logging configurations within the systemd service files.
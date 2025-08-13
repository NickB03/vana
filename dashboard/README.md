# Vana Server Dashboard

A local web-based dashboard for managing your Vana frontend and backend servers.

## Features

- **Real-time Status Monitoring**: See if your servers are running with live status indicators
- **One-Click Controls**: Start, stop, and restart servers with a single click  
- **Process Information**: View PIDs and port information for running servers
- **Activity Logs**: Track recent server actions and events
- **Auto-refresh**: Status updates every 2 seconds automatically

## Quick Start

### Launch the Dashboard

```bash
cd dashboard
./launch.sh
```

Or directly with Python:

```bash
python3 dashboard/dashboard_server.py
```

Then open http://localhost:9999 in your browser.

## Server Controls

### Backend Server (Port 8000)
- **Start**: Launches the backend using `make dev-backend`
- **Stop**: Gracefully stops the backend server
- **Restart**: Stops and restarts the backend

### Frontend Server (Port 5173)  
- **Start**: Launches the frontend using `make dev-frontend`
- **Stop**: Gracefully stops the frontend server
- **Restart**: Stops and restarts the frontend

## Requirements

- Python 3.x
- psutil (optional, but recommended): `uv pip install psutil`

## Files

- `dashboard.html` - Frontend interface
- `dashboard_server.py` - Python server that hosts the dashboard and manages processes
- `launch.sh` - Convenience script to start the dashboard
- `README.md` - This file

## How It Works

The dashboard runs a lightweight Python HTTP server on port 9999 that:
1. Serves the dashboard HTML interface
2. Provides API endpoints for checking server status
3. Manages starting/stopping servers using the project's Makefile commands
4. Monitors ports 8000 (backend) and 5173 (frontend) for running processes

## Troubleshooting

If servers won't start:
- Check that ports 8000 and 5173 are not already in use
- Ensure you're in the project root when running commands
- Check the activity logs in the dashboard for error messages

If the dashboard won't start:
- Ensure port 9999 is available
- Check that Python 3 is installed: `python3 --version`
- Install psutil if you see warnings: `uv pip install psutil`
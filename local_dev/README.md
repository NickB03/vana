# VANA Local Development Environment

This directory contains scripts and configuration files for setting up a local development environment for VANA. The environment consists of a backend Flask API server and a frontend Streamlit server, each running in its own virtual environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Directory Structure](#directory-structure)
- [Setup](#setup)
- [Running the Environment](#running-the-environment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Python 3.9 or higher
- pip
- virtualenv or venv
- tmux (for running both servers simultaneously)

## Directory Structure

```
local_dev/
├── README.md                 # This file
├── run_local_dev.sh          # Script to run both servers
├── test_local_dev.py         # Script to test the environment
├── backend/                  # Backend server
│   ├── requirements.txt      # Backend dependencies
│   ├── run_backend.py        # Backend server script
│   └── setup.sh              # Backend setup script
└── frontend/                 # Frontend server
    ├── requirements.txt      # Frontend dependencies
    ├── run_frontend.py       # Frontend server script
    └── setup.sh              # Frontend setup script
```

## Setup

1. Make sure you have the prerequisites installed.

2. Run the setup scripts for the backend and frontend:

   ```bash
   cd backend && bash setup.sh
   cd ../frontend && bash setup.sh
   ```

   These scripts will:
   - Create virtual environments
   - Install dependencies
   - Create symbolic links to the main project files
   - Create `.env` files (if they don't exist)

3. Update the `.env` files with your credentials:

   ```bash
   # Backend .env file
   cd backend && nano .env
   
   # Frontend .env file
   cd ../frontend && nano .env
   ```

## Running the Environment

### Running Both Servers

The easiest way to run both servers is to use the `run_local_dev.sh` script:

```bash
bash run_local_dev.sh
```

This script will:
- Check if the environments are set up
- Start a tmux session with two panes
- Start the backend server in the left pane
- Start the frontend server in the right pane

You can customize the ports using command-line arguments:

```bash
bash run_local_dev.sh --backend-port 5000 --frontend-port 8501
```

### Running Servers Separately

If you prefer to run the servers separately, you can use the following commands:

```bash
# Start the backend server
cd backend
source .venv/bin/activate
python run_backend.py

# Start the frontend server
cd frontend
source .venv/bin/activate
python run_frontend.py
```

### Environment Variables

The following environment variables can be set in the `.env` files:

#### Backend

- `BACKEND_PORT`: Port for the backend server (default: 5000)
- `FLASK_DEBUG`: Whether to run Flask in debug mode (default: False)
- `GOOGLE_CLOUD_PROJECT`: Google Cloud project ID
- `GOOGLE_CLOUD_LOCATION`: Google Cloud location
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud credentials file
- `VECTOR_SEARCH_ENDPOINT_ID`: Vector Search endpoint ID
- `VECTOR_SEARCH_INDEX_ID`: Vector Search index ID
- `GOOGLE_SEARCH_API_KEY`: Google Custom Search API key
- `GOOGLE_SEARCH_ENGINE_ID`: Google Custom Search engine ID

#### Frontend

- `FRONTEND_PORT`: Port for the frontend server (default: 8501)
- `BACKEND_PORT`: Port for the backend server (default: 5000)
- `STREAMLIT_THEME_BASE`: Streamlit theme base (default: "light")
- `STREAMLIT_THEME_PRIMARY_COLOR`: Streamlit primary color (default: "#FF4B4B")

## Testing

You can test the environment using the `test_local_dev.py` script:

```bash
python test_local_dev.py
```

This script will:
- Test the backend health endpoint
- Test the agent tools endpoint
- Test the Vector Search health endpoint
- Test the Vector Search endpoint
- Test the Web Search endpoint
- Test the agent message endpoint
- Test the frontend server

You can customize the ports and wait time using command-line arguments:

```bash
python test_local_dev.py --backend-port 5000 --frontend-port 8501 --wait 10
```

## Troubleshooting

### Backend Issues

1. **Import Errors**

   If you see import errors, make sure the symbolic links are set up correctly:

   ```bash
   cd backend
   ln -sf ../../agent .
   ln -sf ../../tools .
   ln -sf ../../config .
   ln -sf ../../scripts .
   ln -sf ../../tests .
   ```

2. **Environment Variables**

   Make sure the `.env` file contains the necessary environment variables:

   ```bash
   cd backend
   cp ../../.env.example .env
   nano .env
   ```

3. **Dependencies**

   If you're missing dependencies, try reinstalling them:

   ```bash
   cd backend
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

### Frontend Issues

1. **Streamlit Not Found**

   If Streamlit is not found, make sure it's installed:

   ```bash
   cd frontend
   source .venv/bin/activate
   pip install streamlit
   ```

2. **Dashboard Not Found**

   If the dashboard is not found, make sure the symbolic link is set up correctly:

   ```bash
   cd frontend
   ln -sf ../../dashboard .
   ```

   If the dashboard doesn't exist, the script will create a simple test app.

3. **Connection to Backend**

   If the frontend can't connect to the backend, make sure the backend is running and the ports are correct:

   ```bash
   # Check if backend is running
   curl http://localhost:5000/api/health
   
   # Update frontend environment variables
   cd frontend
   nano .env
   # Add: BACKEND_PORT=5000
   ```

### General Issues

1. **Port Already in Use**

   If a port is already in use, you can change it:

   ```bash
   # For backend
   export BACKEND_PORT=5001
   
   # For frontend
   export FRONTEND_PORT=8502
   
   # Then run the servers
   bash run_local_dev.sh
   ```

2. **tmux Issues**

   If you're having issues with tmux, you can run the servers separately:

   ```bash
   # Start the backend server
   cd backend
   source .venv/bin/activate
   python run_backend.py
   
   # In another terminal, start the frontend server
   cd frontend
   source .venv/bin/activate
   python run_frontend.py
   ```

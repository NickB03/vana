#!/bin/bash

# Display startup banner
echo "=========================================="
echo "  Starting VANA Multi-Agent System"
echo "=========================================="

# Navigate to the project directory
cd "$(dirname "$0")"
echo "Working directory: $(pwd)"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3.9 or higher."
    read -p "Press Enter to exit..."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "Python version: $PYTHON_VERSION"

# Check if virtual environment exists, create if it doesn't
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Check if requirements are installed
echo "Checking requirements..."
pip install -r adk-setup/requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found. Please create a .env file with your configuration."
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if Vector Search is set up
echo "Checking Vector Search setup..."
if [ ! -f "secrets/$(grep GOOGLE_APPLICATION_CREDENTIALS .env | cut -d= -f2 | sed 's/\.\/secrets\///' | tr -d '\r')" ]; then
    echo "Warning: Service account key not found. Vector Search may not work properly."
    echo "Please follow the Vector Search setup instructions in next-steps.md."
    read -p "Press Enter to continue anyway or Ctrl+C to exit..."
fi

# Start the ADK web interface
echo "Starting ADK web interface..."
cd adk-setup
adk web

# Keep terminal open if the server exits
echo "ADK web interface has stopped."
read -p "Press Enter to exit..."

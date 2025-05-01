#!/bin/bash

# Run VANA Dashboard
# This script sets up the environment and runs the VANA dashboard

# Set up virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install requirements
echo "Installing dashboard requirements..."
pip install -r dashboard/requirements.txt

# Run the dashboard
echo "Starting VANA Dashboard..."
cd dashboard
streamlit run app.py

# Deactivate virtual environment on exit
deactivate

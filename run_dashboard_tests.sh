#!/bin/bash

# Run VANA Dashboard Tests
# This script sets up the environment and runs the VANA dashboard tests

# Set up virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install requirements
echo "Installing test requirements..."
pip install -r requirements.txt

# Start the dashboard in the background
echo "Starting VANA dashboard..."
streamlit run dashboard/app.py &
DASHBOARD_PID=$!

# Wait for the dashboard to start
echo "Waiting for dashboard to start..."
sleep 5

# Run the tests
echo "Running VANA dashboard tests..."
python -m tests.e2e.framework.test_runner --config tests/e2e/config/test_config.json --output tests/e2e/results/dashboard_test_results.json

# Stop the dashboard
echo "Stopping VANA dashboard..."
kill $DASHBOARD_PID

# Deactivate virtual environment on exit
deactivate

echo "Dashboard tests completed."

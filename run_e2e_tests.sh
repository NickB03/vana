#!/bin/bash

# Run VANA End-to-End Tests
# This script sets up the environment and runs the VANA end-to-end tests

# Set up virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install requirements
echo "Installing test requirements..."
pip install pytest requests

# Run the tests
echo "Running VANA end-to-end tests..."
python -m tests.e2e.framework.test_runner "$@"

# Deactivate virtual environment on exit
deactivate

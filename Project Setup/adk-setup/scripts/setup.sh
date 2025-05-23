#!/bin/bash

echo "Setting up VANA ADK Environment..."

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure GCP
gcloud config set project analystai-454200
gcloud auth application-default login
gcloud auth application-default set-quota-project analystai-454200

# Enable required APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable artifactregistry.googleapis.com

echo "Setup complete! Run 'adk web' to start development server."

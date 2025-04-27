# Environment Variable Setup for VANA

This document explains how to set up environment variables for the VANA project.

## Overview

VANA uses environment variables to store configuration settings and sensitive credentials. These variables can be stored in different locations, depending on your security requirements.

## Environment Variable Locations

In order of preference (most secure to least secure):

1. **`secrets/.env`** (Most Secure, Recommended)
   - This is the preferred location for storing sensitive credentials
   - This directory is explicitly ignored by Git
   - Use this for production deployments and when handling real API keys

2. **Project Root `.env`**
   - Store environment variables in the project root directory
   - This file is also ignored by Git
   - Good for development environments

3. **Component-specific `.env`** (e.g., `mcp-servers/n8n-mcp/.env`)
   - Local to specific components
   - Less preferred as it scatters configuration across the project
   - Useful for component-specific testing

## Required Environment Variables

### n8n and MCP Configuration

```
# n8n API Configuration
N8N_API_URL="http://localhost:5678/api/v1"
N8N_API_KEY="your_n8n_api_key_here"

# Webhook Authentication
N8N_WEBHOOK_USERNAME="your_webhook_username"
N8N_WEBHOOK_PASSWORD="your_webhook_password"

# MCP Configuration
N8N_WEBHOOK_URL="http://localhost:5678/webhook/save-memory"
```

### Ragie API Configuration

```
# Ragie API Configuration
RAGIE_API_KEY="your_ragie_api_key_here"
```

### Google Cloud Configuration

```
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT="analystai-454200"
GOOGLE_CLOUD_LOCATION="us-central1"

# Vector Search Configuration
VECTOR_SEARCH_INDEX_NAME="vana-shared-index"
VECTOR_SEARCH_DIMENSIONS="768"
```

## Setting Up Your Environment

1. Copy the appropriate example file:
   ```bash
   # For project-wide configuration
   cp .env.example .env
   
   # For MCP server configuration
   cp mcp-servers/n8n-mcp/.env.example mcp-servers/n8n-mcp/.env
   ```

2. Edit the file and fill in your actual credentials:
   ```bash
   # Edit with your favorite text editor
   nano .env
   ```

3. For maximum security, move sensitive credentials to `secrets/.env`:
   ```bash
   # Create the secrets directory if it doesn't exist
   mkdir -p secrets
   
   # Create and edit the secrets file
   nano secrets/.env
   ```

## How Environment Variables Are Loaded

The VANA components will look for environment variables in the following order:

1. `secrets/.env` (if it exists)
2. Project root `.env` (if it exists)
3. Component-specific `.env` (if it exists)

This allows you to override settings at different levels and keep sensitive credentials separate from other configuration.

## Security Best Practices

1. **Never commit `.env` files to version control**
2. **Use different API keys for development and production**
3. **Regularly rotate API keys and credentials**
4. **Limit access to the `secrets` directory**
5. **Use environment-specific `.env` files for different deployments**

## Troubleshooting

If you encounter issues with environment variables:

1. Check that the `.env` file exists in one of the supported locations
2. Verify that all required variables are set
3. Check for typos in variable names
4. Ensure the file permissions allow the application to read the file
5. Try running with the `DEBUG="true"` setting for more verbose output

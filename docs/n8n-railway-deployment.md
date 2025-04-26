# Deploying n8n on Railway

This guide provides step-by-step instructions for deploying n8n on Railway.app for the VANA memory integration.

## Prerequisites

- GitHub account
- Railway.app account
- Ragie API key

## Deployment Steps

### 1. Fork the n8n Repository

1. Go to the [n8n GitHub repository](https://github.com/n8n-io/n8n)
2. Click the "Fork" button in the top right corner
3. Select your GitHub account as the destination for the fork

### 2. Set Up Railway Project

1. Log in to [Railway.app](https://railway.app) with your GitHub account
2. Click "New Project" in the dashboard
3. Select "Deploy from GitHub repo"
4. Find and select your forked n8n repository
5. Configure the deployment settings:
   - Select the "Dockerfile" option
   - Set the Dockerfile path to `docker/images/n8n/Dockerfile`
   - Set the start command to `n8n start`

### 3. Add a PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" > "PostgreSQL"
3. Wait for the database to be provisioned

### 4. Configure Environment Variables

In your Railway project settings, add the following environment variables:

```
# Basic Authentication
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=your_username
N8N_BASIC_AUTH_PASSWORD=your_password

# Ragie API Key
RAGIE_API_KEY=your_ragie_api_key

# Database Configuration (Railway will provide these automatically)
DB_TYPE=postgresdb

# Additional Configuration
N8N_PORT=$PORT
N8N_PROTOCOL=https
NODE_ENV=production
GENERIC_TIMEZONE=UTC
N8N_VERSION=1.31.0
```

### 5. Connect Database to n8n

1. In your Railway project, go to the "Variables" tab
2. Click "Connect" next to your PostgreSQL database
3. This will automatically add the database connection variables to your n8n service

### 6. Deploy n8n

1. Click "Deploy" to start the deployment process
2. Wait for the deployment to complete (this may take a few minutes)
3. Once deployed, Railway will provide a URL for your n8n instance

### 7. Access n8n

1. Open the provided URL in your browser
2. Log in with the username and password you set in the environment variables
3. You should now have access to the n8n dashboard

## Configuring Webhooks

After deployment, you'll need to update the `WEBHOOK_URL` environment variable with the actual URL of your deployed n8n instance:

1. In your Railway project, go to the "Variables" tab
2. Add a new variable:
   - Key: `WEBHOOK_URL`
   - Value: The URL of your deployed n8n instance (e.g., `https://your-n8n-instance.railway.app`)

## Troubleshooting

### Deployment Fails

If the deployment fails, check the following:

1. Verify that the Dockerfile path is correct
2. Check the logs for any error messages
3. Ensure that all required environment variables are set

### Database Connection Issues

If n8n cannot connect to the database:

1. Verify that the database is properly connected to the n8n service
2. Check that the `DB_TYPE` is set to `postgresdb`
3. Ensure that Railway has automatically added the database connection variables

### Authentication Issues

If you cannot log in to n8n:

1. Verify that `N8N_BASIC_AUTH_ACTIVE` is set to `true`
2. Check that you're using the correct username and password
3. Ensure that the environment variables are properly set in Railway

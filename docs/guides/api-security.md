# API Security Guide

[Home](../../index.md) > [Guides](index.md) > API Security

## Overview

This guide explains the security mechanisms implemented for the VANA API endpoints, including authentication, authorization, and best practices for secure API usage.

## Authentication Methods

VANA supports two authentication methods for API access:

1. **Session-based Authentication**: Used primarily for web UI access
2. **API Key Authentication**: Recommended for programmatic access

### API Key Authentication

API key authentication is the recommended method for programmatic access to VANA APIs. It provides a secure way to authenticate API requests without requiring user credentials.

#### How to Use API Keys

To authenticate using an API key, include the key in the `X-API-Key` header of your HTTP request:

```http
GET /api/vector-search/health HTTP/1.1
Host: your-vana-instance.example.com
X-API-Key: your-api-key-here
Accept: application/json
```

Example using `curl`:

```bash
curl -H "X-API-Key: your-api-key-here" https://your-vana-instance.example.com/api/vector-search/health
```

Example using Python:

```python
import requests

url = "https://your-vana-instance.example.com/api/vector-search/health"
headers = {
    "X-API-Key": "your-api-key-here",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data)
```

#### Managing API Keys

API keys are managed through the VANA dashboard. Only administrators can create, view, and revoke API keys.

To create a new API key:

1. Log in to the VANA dashboard as an administrator
2. Navigate to Settings > API Keys
3. Click "Create New API Key"
4. Enter a name for the key and select the appropriate roles
5. Click "Create"
6. Copy the generated API key (it will only be shown once)

To revoke an API key:

1. Log in to the VANA dashboard as an administrator
2. Navigate to Settings > API Keys
3. Find the key you want to revoke
4. Click "Revoke"

## Authorization

VANA uses role-based access control (RBAC) to determine what actions users and API clients can perform. Each API endpoint requires specific roles for access.

### Available Roles

- **admin**: Full access to all endpoints, including configuration changes
- **viewer**: Read-only access to most endpoints
- **api**: Special role for API access, typically combined with other roles

### API Endpoint Permissions

| Endpoint | Required Roles | Description |
|----------|----------------|-------------|
| `/api/vector-search/health` | admin, viewer, api | Get Vector Search health data |
| `/api/vector-search/run-check` | admin | Run a Vector Search health check |
| `/api/agents` | admin, viewer, api | Get agent status information |
| `/api/agents/{agent}/activity` | admin, viewer, api | Get agent activity data |
| `/api/memory/usage` | admin, viewer, api | Get memory usage data |
| `/api/memory/history` | admin, viewer, api | Get historical memory metrics |
| `/api/memory/queries` | admin, viewer, api | Get recent memory queries |
| `/api/system/services` | admin, viewer, api | Get service status information |
| `/api/system/health` | admin, viewer, api | Get system health data |
| `/api/system/health/history` | admin, viewer, api | Get historical system health data |
| `/api/system/alerts` | admin, viewer, api | Get system alerts |
| `/api/tasks/summary` | admin, viewer, api | Get task execution summary |
| `/api/tasks` | admin, viewer, api | Get task details |
| `/api/tasks/timeline` | admin, viewer, api | Get task execution timeline |

## Error Handling

When authentication or authorization fails, the API returns appropriate HTTP status codes and error messages:

- **401 Unauthorized**: Authentication failed (invalid or missing API key)
- **403 Forbidden**: Authentication succeeded, but the user/client lacks the required permissions

Example error response:

```json
{
  "error": "Invalid API key"
}
```

## Security Best Practices

1. **Protect API Keys**: Store API keys securely and never expose them in client-side code or public repositories.

2. **Use HTTPS**: Always use HTTPS to encrypt API requests and responses.

3. **Principle of Least Privilege**: Assign the minimum necessary permissions to API keys.

4. **Rotate Keys Regularly**: Create new API keys and revoke old ones periodically.

5. **Monitor API Usage**: Review API access logs regularly to detect suspicious activity.

6. **Set Expiration Dates**: When creating API keys, consider setting an expiration date for sensitive operations.

## Audit Logging

All authentication and authorization events are logged in the audit log, including:

- API key validation attempts (successful and failed)
- API key creation and revocation
- Access attempts to protected endpoints

Administrators can review these logs to monitor API usage and detect potential security issues.

## Troubleshooting

If you encounter authentication or authorization issues:

1. Verify that your API key is valid and has not been revoked
2. Check that your API key has the required roles for the endpoint you're accessing
3. Ensure you're including the API key in the correct header format
4. Check the audit logs for specific error messages

For persistent issues, contact your VANA administrator for assistance.

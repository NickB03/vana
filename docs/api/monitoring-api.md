# Monitoring API

[Home](../index.md) > [API](index.md) > Monitoring API

This document describes the API endpoints for the Vector Search Health Monitoring System.

## Overview

The Monitoring API provides programmatic access to the Vector Search Health Monitoring System, allowing you to retrieve health status, metrics, and historical data, as well as run health checks and manage alerts.

## Authentication

All API endpoints require authentication. You can authenticate using one of the following methods:

1. **Session Authentication**:
   - Log in to the dashboard using the web interface
   - API calls will use your session cookie for authentication

2. **Token Authentication**:
   - Obtain a token by calling the `/auth/token` endpoint
   - Include the token in the `Authorization` header of your requests

## Endpoints

### Health Status

#### GET /vector-search/api/health

Get the current health status of the Vector Search system.

**Parameters**:
- `days` (optional): Number of days of historical data to include (default: 7)

**Response**:
```json
{
  "status": "ok",
  "last_updated": "2025-05-09T12:00:00.000Z",
  "current": {
    "result": {
      "timestamp": "2025-05-09T12:00:00.000Z",
      "status": "ok",
      "checks": {
        "environment": {
          "status": "ok",
          "details": {
            "missing_vars": []
          }
        },
        "authentication": {
          "status": "ok",
          "details": {
            "has_token": true
          }
        },
        "embedding": {
          "status": "ok",
          "details": {
            "dimensions": 768,
            "response_time": 0.456,
            "is_mock": false
          }
        },
        "search": {
          "status": "ok",
          "details": {
            "result_count": 5,
            "response_time": 0.123,
            "has_expected_fields": true
          }
        }
      },
      "metrics": {
        "response_time": 0.789,
        "success_rate": 100.0
      },
      "issues": []
    },
    "metrics": {
      "status": "ok",
      "last_check_time": "2025-05-09T12:00:00.000Z",
      "response_time": 0.789,
      "success_rate": 100.0,
      "checks": {
        "environment": "ok",
        "authentication": "ok",
        "embedding": "ok",
        "search": "ok"
      },
      "issues_count": 0,
      "history_count": 100,
      "trends": {
        "response_time": {
          "current": 0.789,
          "previous": 0.812,
          "change_percent": -2.83,
          "trend": "improving"
        },
        "success_rate": {
          "current": 100.0,
          "previous": 100.0,
          "change": 0.0,
          "trend": "stable"
        }
      }
    }
  },
  "historical": {
    "days": 7,
    "total_checks": 672,
    "status_counts": {
      "ok": 650,
      "warn": 15,
      "error": 7,
      "critical": 0,
      "unknown": 0
    },
    "timestamps": ["2025-05-09T11:00:00.000Z", "2025-05-09T10:00:00.000Z", "..."],
    "response_times": [0.789, 0.812, "..."],
    "success_rates": [100.0, 100.0, "..."],
    "health_percentage": 96.73
  },
  "recommendations": [
    {
      "priority": "medium",
      "category": "performance",
      "title": "Response time fluctuations",
      "action": "Monitor response time trends for potential performance degradation."
    }
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

### Run Health Check

#### GET /vector-search/api/run-check

Run a health check on the Vector Search system.

**Parameters**:
- None

**Response**:
```json
{
  "status": "success",
  "result": {
    "timestamp": "2025-05-09T12:00:00.000Z",
    "status": "ok",
    "checks": {
      "environment": {
        "status": "ok",
        "details": {
          "missing_vars": []
        }
      },
      "authentication": {
        "status": "ok",
        "details": {
          "has_token": true
        }
      },
      "embedding": {
        "status": "ok",
        "details": {
          "dimensions": 768,
          "response_time": 0.456,
          "is_mock": false
        }
      },
      "search": {
        "status": "ok",
        "details": {
          "result_count": 5,
          "response_time": 0.123,
          "has_expected_fields": true
        }
      }
    },
    "metrics": {
      "response_time": 0.789,
      "success_rate": 100.0
    },
    "issues": []
  },
  "timestamp": "2025-05-09T12:00:00.000Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error

### Authentication

#### POST /auth/token

Obtain an authentication token.

**Request**:
```json
{
  "username": "admin",
  "password": "password"
}
```

**Response**:
```json
{
  "token": "abcdef1234567890",
  "expires_at": "2025-05-10T12:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

#### POST /auth/revoke

Revoke an authentication token.

**Request**:
```json
{
  "token": "abcdef1234567890"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Token revoked"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Invalid token
- `500 Internal Server Error`: Server error

## Rate Limiting

The API is rate limited to prevent abuse. The rate limits are as follows:

- `/vector-search/api/health`: 60 requests per minute
- `/vector-search/api/run-check`: 10 requests per minute
- `/auth/token`: 10 requests per minute
- `/auth/revoke`: 10 requests per minute

If you exceed the rate limit, you will receive a `429 Too Many Requests` response.

## Error Handling

All API endpoints return standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

Error responses include a JSON body with details:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required",
    "details": "Please provide valid credentials"
  }
}
```

## Examples

### Get Health Status

```bash
curl -X GET "http://localhost:5000/vector-search/api/health" \
  -H "Authorization: Bearer abcdef1234567890"
```

### Run Health Check

```bash
curl -X GET "http://localhost:5000/vector-search/api/run-check" \
  -H "Authorization: Bearer abcdef1234567890"
```

### Get Authentication Token

```bash
curl -X POST "http://localhost:5000/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

### Revoke Authentication Token

```bash
curl -X POST "http://localhost:5000/auth/revoke" \
  -H "Content-Type: application/json" \
  -d '{"token": "abcdef1234567890"}'
```

## Client Libraries

### Python

```python
import requests

class MonitoringClient:
    def __init__(self, base_url, username, password):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = self._get_token(username, password)

    def _get_token(self, username, password):
        response = self.session.post(
            f"{self.base_url}/auth/token",
            json={"username": username, "password": password}
        )
        response.raise_for_status()
        return response.json()["token"]

    def get_health(self, days=7):
        response = self.session.get(
            f"{self.base_url}/vector-search/api/health",
            params={"days": days},
            headers={"Authorization": f"Bearer {self.token}"}
        )
        response.raise_for_status()
        return response.json()

    def run_health_check(self):
        response = self.session.get(
            f"{self.base_url}/vector-search/api/run-check",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        response.raise_for_status()
        return response.json()
```

## Versioning

The API is versioned using the URL path. The current version is v1, which is implied in the base URL. Future versions will be explicitly specified in the URL path, e.g., `/v2/vector-search/api/health`.

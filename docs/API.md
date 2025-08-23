# Vana API Documentation

## Overview

The Vana API is a comprehensive RESTful API built with FastAPI that provides authentication, real-time agent network monitoring, and research capabilities. The API is built on Google's Agent Development Kit (ADK) and includes full OAuth2/JWT authentication.

**Base URL**: `http://localhost:8000` (development)
**API Version**: 1.0.0
**Authentication**: Bearer JWT Token (required for most endpoints)
**Content-Type**: `application/json`

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Administration](#administration)
- [Agent Network & SSE](#agent-network--sse)
- [Research & Feedback](#research--feedback)
- [System](#system)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All authentication endpoints are OAuth2 compliant and use JWT tokens.

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "role_ids": [1]
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "is_active": true,
  "is_verified": false,
  "is_superuser": false,
  "google_cloud_identity": null,
  "last_login": null,
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:00:00Z",
  "roles": [
    {
      "id": 1,
      "name": "user",
      "description": "Standard user role",
      "is_active": true,
      "created_at": "2025-01-10T12:00:00Z",
      "permissions": []
    }
  ]
}
```

**Error Responses:**
- `400`: Password does not meet security requirements
- `409`: User with this email or username already exists
- `422`: Validation error

---

### POST /auth/login

OAuth2-compliant login endpoint supporting both form and JSON data.

**Content-Type Options:**
- `application/x-www-form-urlencoded` (OAuth2 standard)
- `application/json` (backward compatibility)

**Form Data Request:**
```
username=johndoe
password=SecurePass123!
grant_type=password
```

**JSON Request:**
```json
{
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Error Responses:**
- `400`: `invalid_request` - Missing or invalid request format
- `401`: `invalid_grant` - Invalid credentials or inactive user

---

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Error Responses:**
- `401`: Invalid refresh token

---

### POST /auth/logout

**Authentication Required**: ✅

Logout user by revoking refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response (200 OK):**
```json
{
  "message": "Successfully logged out"
}
```

---

### POST /auth/logout-all

**Authentication Required**: ✅

Logout user from all devices by revoking all refresh tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out from 3 devices"
}
```

---

### GET /auth/me

**Authentication Required**: ✅

Get current user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "is_active": true,
  "is_verified": true,
  "is_superuser": false,
  "google_cloud_identity": null,
  "last_login": "2025-01-10T11:30:00Z",
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:00:00Z",
  "roles": []
}
```

---

### PUT /auth/me

**Authentication Required**: ✅

Update current user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "email": "johnsmith@example.com"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "johnsmith@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Smith",
  "full_name": "John Smith",
  "is_active": true,
  "is_verified": true,
  "is_superuser": false,
  "google_cloud_identity": null,
  "last_login": "2025-01-10T11:30:00Z",
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:05:00Z",
  "roles": []
}
```

---

### POST /auth/change-password

**Authentication Required**: ✅

Change user password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewSecurePass456!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully. Please log in again."
}
```

**Error Responses:**
- `400`: Incorrect current password or new password doesn't meet requirements

---

### POST /auth/forgot-password

Request password reset token.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If the email exists, a password reset link has been sent."
}
```

---

### POST /auth/reset-password

Reset password using reset token.

**Request Body:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "new_password": "NewSecurePass789!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**
- `400`: Invalid or expired reset token, or password doesn't meet requirements

---

### POST /auth/google

Login or register using Google Cloud Identity.

**Request Body:**
```json
{
  "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
  "access_token": "ya29.a0AfH6SMC..."
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

**Error Responses:**
- `401`: Google authentication failed

---

## User Management

### GET /users/

**Authentication Required**: ✅ (Requires `users:read` permission)

List all users with pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `skip` (integer, default: 0): Number of users to skip
- `limit` (integer, default: 100): Maximum number of users to return

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "email": "user1@example.com",
    "username": "user1",
    "first_name": "User",
    "last_name": "One",
    "full_name": "User One",
    "is_active": true,
    "is_verified": true,
    "is_superuser": false,
    "google_cloud_identity": null,
    "last_login": "2025-01-10T11:30:00Z",
    "created_at": "2025-01-10T12:00:00Z",
    "updated_at": "2025-01-10T12:00:00Z",
    "roles": []
  }
]
```

---

### GET /users/{user_id}

**Authentication Required**: ✅ (Requires `users:read` permission)

Get user by ID.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `user_id` (integer): User ID

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "is_active": true,
  "is_verified": true,
  "is_superuser": false,
  "google_cloud_identity": null,
  "last_login": "2025-01-10T11:30:00Z",
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:00:00Z",
  "roles": []
}
```

**Error Responses:**
- `404`: User not found

---

### PUT /users/{user_id}

**Authentication Required**: ✅ (Requires `users:update` permission)

Update user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `user_id` (integer): User ID

**Request Body:**
```json
{
  "first_name": "Updated",
  "last_name": "Name",
  "role_ids": [1, 2]
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "first_name": "Updated",
  "last_name": "Name",
  "full_name": "Updated Name",
  "is_active": false,
  "is_verified": true,
  "is_superuser": false,
  "google_cloud_identity": null,
  "last_login": "2025-01-10T11:30:00Z",
  "created_at": "2025-01-10T12:00:00Z",
  "updated_at": "2025-01-10T12:10:00Z",
  "roles": []
}
```

---

### DELETE /users/{user_id}

**Authentication Required**: ✅ (Requires `users:delete` permission)

Delete user.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `user_id` (integer): User ID

**Response (200 OK):**
```json
{
  "message": "User deleted successfully"
}
```

**Error Responses:**
- `400`: Cannot delete yourself
- `403`: Cannot delete superuser (unless you're also a superuser)
- `404`: User not found

---

## Administration

### GET /admin/roles

**Authentication Required**: ✅ (Superuser only)

List all roles.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "user",
    "description": "Standard user role",
    "is_active": true,
    "created_at": "2025-01-10T12:00:00Z",
    "permissions": [
      {
        "id": 1,
        "name": "basic_access",
        "description": "Basic system access",
        "resource": "system",
        "action": "read",
        "created_at": "2025-01-10T12:00:00Z"
      }
    ]
  }
]
```

---

### POST /admin/roles

**Authentication Required**: ✅ (Superuser only)

Create new role.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "researcher",
  "description": "Research access role",
  "is_active": true,
  "permission_ids": [1, 2]
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "name": "researcher",
  "description": "Research access role",
  "is_active": true,
  "created_at": "2025-01-10T12:15:00Z",
  "permissions": []
}
```

---

### GET /admin/permissions

**Authentication Required**: ✅ (Superuser only)

List all permissions.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "basic_access",
    "description": "Basic system access",
    "resource": "system",
    "action": "read",
    "created_at": "2025-01-10T12:00:00Z"
  }
]
```

---

## Agent Network & SSE

### GET /agent_network_sse/{session_id}

**Authentication**: Optional (configurable via `REQUIRE_SSE_AUTH`)

Server-Sent Events endpoint for real-time agent network monitoring.

**Headers:**
```
Accept: text/event-stream
Authorization: Bearer <access_token>  # Optional depending on configuration
```

**Path Parameters:**
- `session_id` (string): Session ID to monitor

**Response (200 OK):**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"connection","status":"connected","sessionId":"abc123","timestamp":"2025-01-10T12:20:00Z","authenticated":true,"userId":1}

data: {"type":"agent_start","agentId":"agent_001","sessionId":"abc123","timestamp":"2025-01-10T12:20:05Z","metadata":{"name":"Research Agent","capabilities":["search","analysis"]}}

data: {"type":"heartbeat","timestamp":"2025-01-10T12:20:30Z"}

data: {"type":"agent_complete","agentId":"agent_001","sessionId":"abc123","timestamp":"2025-01-10T12:21:00Z","result":"success","output":"Research completed successfully"}

data: {"type":"connection","status":"disconnected","sessionId":"abc123","timestamp":"2025-01-10T12:22:00Z"}
```

**Event Types:**
- `connection`: Connection status changes
- `agent_start`: Agent begins processing
- `agent_complete`: Agent finishes processing
- `network_topology`: Network structure changes
- `performance_metrics`: Performance updates
- `heartbeat`: Keep-alive messages
- `error`: Error notifications

---

### GET /agent_network_history

**Authentication**: Optional (configurable via `REQUIRE_SSE_AUTH`)

Get recent agent network event history.

**Headers:**
```
Authorization: Bearer <access_token>  # Optional depending on configuration
```

**Query Parameters:**
- `limit` (integer, default: 50): Maximum number of events to return

**Response (200 OK):**
```json
{
  "events": [
    {
      "type": "agent_start",
      "agentId": "agent_001",
      "sessionId": "abc123",
      "timestamp": "2025-01-10T12:20:05Z",
      "metadata": {
        "name": "Research Agent",
        "capabilities": ["search", "analysis"]
      }
    },
    {
      "type": "agent_complete",
      "agentId": "agent_001",
      "sessionId": "abc123",
      "timestamp": "2025-01-10T12:21:00Z",
      "result": "success",
      "output": "Research completed successfully"
    }
  ],
  "authenticated": true,
  "user_id": 1,
  "timestamp": "2025-01-10T12:22:00Z"
}
```

---

## Research & Feedback

### POST /feedback

**Authentication Required**: ✅

Submit feedback for agent responses.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "score": 5,
  "invocation_id": "inv_12345",
  "text": "Excellent response! Very helpful and accurate."
}
```

**Response (200 OK):**
```json
{
  "status": "success"
}
```

**Error Responses:**
- `422`: Validation error (invalid score, missing fields, etc.)

---

## System

### GET /health

Health check endpoint for service validation.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T12:25:00.000Z",
  "service": "vana",
  "version": "1.0.0",
  "session_storage_enabled": true,
  "session_storage_uri": "sqlite:///tmp/vana_sessions.db",
  "session_storage_bucket": "analystai-454200-vana-session-storage"
}
```

---

## ADK Integration Endpoints

The following endpoints are provided by Google's Agent Development Kit (ADK) integration. These require authentication via JWT tokens.

### Sessions Management

#### POST /apps/app/users/{user_id}/sessions

**Authentication Required**: ✅

Create a new session for agent interactions.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `user_id` (string): User ID

**Request Body:**
```json
{
  "state": {
    "preferred_language": "English",
    "visit_count": 1,
    "context": "research_mode"
  }
}
```

**Response (200 OK):**
```json
{
  "id": "session_abc123",
  "user_id": "user_001",
  "state": {
    "preferred_language": "English",
    "visit_count": 1,
    "context": "research_mode"
  },
  "created_at": "2025-01-10T12:30:00Z"
}
```

#### GET /apps/app/users/{user_id}/sessions/{session_id}

**Authentication Required**: ✅

Get session details.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "session_abc123",
  "user_id": "user_001",
  "state": {
    "preferred_language": "English",
    "visit_count": 1,
    "context": "research_mode"
  },
  "created_at": "2025-01-10T12:30:00Z",
  "updated_at": "2025-01-10T12:35:00Z"
}
```

### Agent Interactions

#### POST /apps/app/users/{user_id}/sessions/{session_id}/invoke

**Authentication Required**: ✅

Invoke agent for processing.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "message": "Research the latest trends in AI development",
  "stream": true,
  "context": {
    "task_type": "research",
    "priority": "high"
  }
}
```

**Response (200 OK - Streaming):**
```json
{
  "response": "Starting research on AI development trends...",
  "status": "processing",
  "agent_id": "research_agent_001",
  "session_id": "session_abc123"
}
```

### File Management

#### POST /apps/app/files/upload

**Authentication Required**: ✅

Upload files for agent processing.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
file: <binary_data>
metadata: {"type": "document", "source": "user_upload"}
```

**Response (200 OK):**
```json
{
  "file_id": "file_789",
  "filename": "document.pdf",
  "size": 1024000,
  "type": "application/pdf",
  "uploaded_at": "2025-01-10T12:40:00Z"
}
```

---

## Error Responses

### Standard Error Format

All errors follow this structure:

```json
{
  "detail": "Error message",
  "error_code": "SPECIFIC_ERROR_CODE",
  "timestamp": "2025-01-10T12:30:00Z"
}
```

### Common HTTP Status Codes

- **400 Bad Request**: Invalid request format or parameters
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists
- **422 Unprocessable Entity**: Validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### OAuth2 Error Responses

Authentication errors follow OAuth2 standards:

```json
{
  "error": "invalid_grant",
  "error_description": "Invalid username or password"
}
```

**OAuth2 Error Codes:**
- `invalid_request`: Request is missing parameters or malformed
- `invalid_grant`: Invalid credentials
- `unsupported_grant_type`: Unsupported grant type
- `invalid_token`: Access token is invalid or expired

---

## Rate Limiting

Rate limits are applied per user/IP address:

- **Authentication endpoints**: 5 requests per minute
- **Registration**: 3 requests per hour
- **General API**: 100 requests per minute
- **SSE connections**: 10 concurrent connections per user

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641811200
```

When rate limit is exceeded:

**Response (429 Too Many Requests):**
```json
{
  "detail": "Rate limit exceeded. Try again later.",
  "retry_after": 60
}
```

---

## Security Headers

All responses include security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

---

## WebSocket Support

### ADK WebSocket Connection

**URL**: `ws://localhost:8000/ws/sessions/{session_id}`

**Authentication**: JWT token via query parameter or header

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/sessions/abc123?token=jwt_token');
```

**Message Format:**
```json
{
  "type": "agent_invoke",
  "data": {
    "message": "Hello, agent!",
    "context": {}
  }
}
```

---

## Example Usage

### Authentication Flow

1. **Register or Login:**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","password":"SecurePass123!"}'
```

2. **Use Access Token:**
```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

3. **Refresh Token:**
```bash
curl -X POST "http://localhost:8000/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"refresh_token_here"}'
```

### SSE Connection

```javascript
const eventSource = new EventSource(
  'http://localhost:8000/agent_network_sse/session_123',
  {
    headers: {
      'Authorization': 'Bearer ' + accessToken
    }
  }
);

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Agent event:', data);
};
```

### Research Workflow

```bash
# 1. Create session
curl -X POST "http://localhost:8000/apps/app/users/user123/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state":{"task":"research"}}'

# 2. Invoke agent
curl -X POST "http://localhost:8000/apps/app/users/user123/sessions/sess123/invoke" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Research AI trends","stream":true}'

# 3. Submit feedback
curl -X POST "http://localhost:8000/feedback" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":5,"invocation_id":"inv123","text":"Great research!"}'
```

---

## Environment Configuration

### Authentication Settings

```bash
# .env.local
AUTH_SECRET_KEY=your-secret-key-here
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_REFRESH_TOKEN_EXPIRE_DAYS=7
AUTH_REQUIRE_SSE_AUTH=true  # Set to false for demo mode
```

### API Keys

```bash
BRAVE_API_KEY=your-brave-search-key
GOOGLE_CLOUD_PROJECT=your-project-id
```

---

This API documentation covers all authentication-protected and public endpoints in the Vana system, including the new OAuth2-compliant authentication system, user management, administration features, real-time agent monitoring via SSE, and research capabilities.
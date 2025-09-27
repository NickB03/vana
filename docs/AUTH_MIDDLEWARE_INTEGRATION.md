# Authentication Middleware Integration Guide

## Overview

This guide demonstrates how to integrate the ADK-compliant authentication middleware into your Vana application server. The middleware provides seamless authentication while supporting ADK path structures.

## Quick Integration

### 1. Basic Server Setup

```python
# app/server.py
from fastapi import FastAPI
from app.middleware import ADKPathAuthMiddleware, SecurityHeadersMiddleware
from app.auth.middleware import CircuitBreakerMiddleware

app = FastAPI(title="Vana API", version="1.0.0")

# Add middleware in order (reverse order of execution)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(ADKPathAuthMiddleware)
app.add_middleware(CircuitBreakerMiddleware)
```

### 2. Enhanced Security Setup

```python
# app/server.py - Production Configuration
from fastapi import FastAPI
from app.middleware import (
    ADKPathAuthMiddleware,
    EnhancedAuthMiddleware,
    SecurityHeadersMiddleware
)
from app.auth.middleware import (
    CircuitBreakerMiddleware,
    RateLimitMiddleware,
    AuditLogMiddleware
)

app = FastAPI(title="Vana API", version="1.0.0")

# Security-first middleware stack
app.add_middleware(SecurityHeadersMiddleware, enable_hsts=True)
app.add_middleware(EnhancedAuthMiddleware, rate_limit_per_minute=60)
app.add_middleware(ADKPathAuthMiddleware)
app.add_middleware(AuditLogMiddleware, log_paths=["/api/", "/apps/"])
app.add_middleware(CircuitBreakerMiddleware)
app.add_middleware(RateLimitMiddleware, calls=100, period=60)
```

## ADK Path Structure Support

### Supported Path Patterns

The middleware automatically handles these ADK-compliant paths:

```python
# Standard ADK hierarchy
/apps/{app_name}/users/{user_id}/sessions/{session_id}/run
/apps/{app_name}/users/{user_id}/sessions/{session_id}/stream

# API endpoints with user context
/api/users/{user_id}/profile
/api/users/{user_id}/sessions
/api/users/{user_id}/documents

# Legacy compatibility
/users/{user_id}/data
```

### Path Validation Example

```python
from fastapi import Request, Depends
from app.auth.security import current_active_user_dep

@app.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}/run")
async def adk_run_endpoint(
    app_name: str,
    user_id: str,
    session_id: str,
    request: Request,
    current_user: User = current_active_user_dep
):
    # Middleware automatically validates:
    # 1. JWT token is valid
    # 2. current_user.id matches user_id from path
    # 3. User has access to the specified session

    # Access validated user context
    assert str(current_user.id) == user_id
    assert request.state.adk_user_id == user_id
    assert request.state.is_authenticated is True

    return {
        "app_name": app_name,
        "user_id": user_id,
        "session_id": session_id,
        "authenticated_user": current_user.email
    }
```

## Authentication Flow Examples

### 1. Standard API Endpoint

```python
from app.auth.security import current_active_user_dep

@app.get("/api/users/{user_id}/profile")
async def get_user_profile(
    user_id: str,
    current_user: User = current_active_user_dep
):
    # Middleware ensures current_user.id == user_id
    # Returns 403 if user tries to access another user's profile

    return {
        "id": current_user.id,
        "email": current_user.email,
        "profile": current_user.profile_data
    }
```

### 2. Optional Authentication

```python
from app.auth.security import get_current_user_optional

@app.get("/api/public/content")
async def public_content(
    request: Request,
    user: Optional[User] = Depends(get_current_user_optional)
):
    # Works for both authenticated and anonymous users
    base_content = get_public_content()

    if user:
        # Add personalized content for authenticated users
        base_content["personalized"] = get_user_content(user.id)
        base_content["user_context"] = {
            "id": user.id,
            "email": user.email
        }

    return base_content
```

### 3. SSE Endpoints with Configurable Auth

```python
from app.auth.security import current_user_for_sse_dep

@app.get("/api/users/{user_id}/stream")
async def user_event_stream(
    user_id: str,
    request: Request,
    user: Optional[User] = current_user_for_sse_dep
):
    # Behavior depends on REQUIRE_SSE_AUTH setting:
    # - Production: Requires authentication
    # - Development: Optional authentication

    async def event_generator():
        while True:
            if user and str(user.id) == user_id:
                # Personalized events for authenticated user
                yield f"data: {json.dumps({'user_event': 'authenticated'})}\n\n"
            else:
                # Public events for anonymous users
                yield f"data: {json.dumps({'public_event': 'anonymous'})}\n\n"

            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )
```

## Security Features

### 1. Automatic User Validation

```python
# The middleware automatically:
# 1. Extracts user_id from path: /users/123/data -> user_id = "123"
# 2. Validates JWT token and extracts user
# 3. Ensures authenticated user.id == path user_id
# 4. Returns 403 Forbidden if mismatch detected

@app.get("/api/users/{user_id}/sensitive-data")
async def get_sensitive_data(user_id: str, current_user: User = current_active_user_dep):
    # No manual validation needed - middleware handles it
    return {"data": "sensitive", "owner": current_user.id}
```

### 2. Enhanced Audit Logging

```python
# With EnhancedAuthMiddleware enabled:
@app.post("/api/users/{user_id}/documents")
async def create_document(
    user_id: str,
    document: DocumentCreate,
    current_user: User = current_active_user_dep
):
    # Automatically logged:
    # - User ID and email
    # - Request method and path
    # - Client IP and User-Agent
    # - Timestamp and rate limiting info

    return create_user_document(current_user.id, document)
```

### 3. Rate Limiting Per User

```python
# EnhancedAuthMiddleware provides per-user rate limiting
# Default: 60 requests per minute per authenticated user
# Customizable per endpoint or user role

app.add_middleware(
    EnhancedAuthMiddleware,
    rate_limit_per_minute=100  # Higher limit for premium users
)
```

## Configuration Options

### Development Environment

```python
# app/server.py - Development Setup
import os

if os.getenv("ENVIRONMENT") == "development":
    # Relaxed authentication for development
    app.add_middleware(ADKPathAuthMiddleware)

    # Development features:
    # - Optional authentication
    # - Detailed error messages
    # - Mock user support
    # - Permissive CORS
```

### Production Environment

```python
# app/server.py - Production Setup
if os.getenv("ENVIRONMENT") == "production":
    # Strict security for production
    app.add_middleware(SecurityHeadersMiddleware, enable_hsts=True)
    app.add_middleware(EnhancedAuthMiddleware, rate_limit_per_minute=60)
    app.add_middleware(ADKPathAuthMiddleware)
    app.add_middleware(CircuitBreakerMiddleware)

    # Production features:
    # - Mandatory authentication
    # - Rate limiting
    # - Circuit breaker protection
    # - Comprehensive audit logging
```

### Environment Variables

```bash
# Authentication Configuration
ENVIRONMENT=production              # production|development
REQUIRE_SSE_AUTH=true              # Require auth for SSE endpoints
JWT_SECRET_KEY=your-secret-key     # JWT signing key

# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=your-redirect-uri

# Security Configuration
ENABLE_RATE_LIMITING=true          # Enable rate limiting
RATE_LIMIT_PER_MINUTE=60          # Requests per minute per user
ENABLE_CIRCUIT_BREAKER=true       # Enable brute force protection
```

## Testing Integration

### Unit Tests

```python
# tests/test_auth_middleware.py
import pytest
from fastapi.testclient import TestClient
from app.server import app

client = TestClient(app)

def test_adk_path_extraction():
    """Test user ID extraction from ADK paths."""
    # Test with valid JWT token for user 123
    token = create_test_jwt(user_id=123)

    response = client.get(
        "/apps/myapp/users/123/sessions/session1/data",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200

def test_user_mismatch_forbidden():
    """Test that users cannot access other users' resources."""
    # JWT token for user 123
    token = create_test_jwt(user_id=123)

    # Try to access user 456's data
    response = client.get(
        "/apps/myapp/users/456/sessions/session1/data",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403
    assert "user ID mismatch" in response.json()["detail"]

def test_optional_authentication():
    """Test endpoints with optional authentication."""
    # Without token
    response = client.get("/api/public/content")
    assert response.status_code == 200
    assert "personalized" not in response.json()

    # With token
    token = create_test_jwt(user_id=123)
    response = client.get(
        "/api/public/content",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert "personalized" in response.json()
```

### Integration Tests

```python
# tests/test_auth_integration.py
def test_full_authentication_flow():
    """Test complete authentication flow with ADK paths."""
    # 1. Login and get token
    login_response = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "Test123!"
    })
    token = login_response.json()["tokens"]["access_token"]
    user_id = login_response.json()["user"]["id"]

    # 2. Access user-specific ADK endpoint
    response = client.post(
        f"/apps/testapp/users/{user_id}/sessions/session1/run",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "Hello"}
    )

    assert response.status_code == 200
    assert response.json()["user_id"] == str(user_id)
```

## Troubleshooting

### Common Issues

1. **403 Forbidden: User ID Mismatch**
   ```
   Solution: Ensure JWT token user ID matches path user ID
   Check: /users/{user_id} where user_id == authenticated_user.id
   ```

2. **401 Unauthorized: Missing Token**
   ```
   Solution: Add Authorization header: "Bearer <jwt_token>"
   Check: Endpoint requires authentication but no token provided
   ```

3. **429 Too Many Requests**
   ```
   Solution: Implement request throttling in client
   Check: Rate limit exceeded (default: 60 requests/minute)
   ```

### Debug Mode

```python
# Enable debug logging for middleware
import logging

logging.getLogger("app.middleware.auth_middleware").setLevel(logging.DEBUG)

# This will log:
# - User ID extraction from paths
# - Authentication validation results
# - Rate limiting decisions
# - Security violations
```

## Best Practices

### 1. Security

- Always use HTTPS in production
- Implement proper CORS policies
- Use strong JWT secret keys
- Enable all security middleware layers
- Monitor rate limiting and circuit breaker logs

### 2. Performance

- Use Redis for rate limiting in production
- Implement caching for user lookups
- Monitor middleware performance impact
- Use connection pooling for database operations

### 3. Monitoring

- Log all authentication failures
- Monitor rate limiting statistics
- Track circuit breaker activations
- Set up alerts for security violations

## Conclusion

The ADK-compliant authentication middleware provides robust security while maintaining compatibility with ADK path structures. It automatically handles user validation, supports optional authentication, and includes advanced security features beyond baseline ADK requirements.

For production deployment, ensure all security middleware components are enabled and properly configured with environment-specific settings.
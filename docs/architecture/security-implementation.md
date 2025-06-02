# Security Implementation

[Home](../index.md) > [Architecture](index.md) > Security Implementation

This document describes the security implementation for the Vector Search Health Monitoring System, including authentication, role-based access control, token-based session management, and audit logging.

## Overview

The security implementation provides a comprehensive security framework for the Vector Search Health Monitoring System, ensuring that only authorized users can access the dashboard and API endpoints, and that all security-related events are properly logged for audit purposes.

## Authentication System

The authentication system is implemented in `dashboard/auth/dashboard_auth.py` and provides the following features:

1. **Username/Password Authentication**:
   - Secure password storage using SHA-256 hashing
   - Protection against brute force attacks
   - Configurable password policies

2. **Token-Based Session Management**:
   - Secure token generation using `secrets.token_hex()`
   - Configurable token expiry (default: 24 hours)
   - Token revocation on logout
   - Token validation on each request

3. **Role-Based Access Control**:
   - Predefined roles: admin, viewer, api
   - Role-based access to dashboard and API endpoints
   - Role assignment and management

4. **Audit Logging**:
   - Comprehensive logging of security events
   - Tamper-evident logs with timestamps
   - IP address and user agent tracking
   - Log integrity verification

## Authentication Flow

The authentication flow is as follows:

1. **Login**:
   - User submits username and password
   - System validates credentials
   - On success, system generates a token and stores it in session
   - On failure, system logs the attempt and returns an error

2. **Session Management**:
   - Token is stored in session
   - Token is validated on each request
   - Token expires after configurable period
   - Token can be revoked on logout

3. **Access Control**:
   - System checks user role for each request
   - Access is granted or denied based on role
   - Unauthorized access attempts are logged

## Implementation Details

### Authentication Manager

The `DashboardAuth` class provides the core authentication functionality:

```python
class DashboardAuth:
    def __init__(
        self,
        credentials_file: str = DEFAULT_CREDENTIALS_FILE,
        audit_log_file: str = DEFAULT_AUDIT_LOG_FILE,
        token_expiry: int = 86400,  # 24 hours
        enable_audit: bool = True
    ):
        # Initialize authentication manager

    def authenticate(self, username: str, password: str) -> bool:
        # Authenticate user with username and password

    def generate_token(self, username: str) -> str:
        # Generate authentication token

    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        # Validate authentication token

    def revoke_token(self, token: str) -> bool:
        # Revoke authentication token

    def has_role(self, username: str, role: str) -> bool:
        # Check if user has a specific role

    def change_password(self, username: str, new_password: str) -> bool:
        # Change user's password
```

### Authentication Decorator

The `requires_auth` decorator provides a convenient way to secure routes:

```python
def requires_auth(roles: Optional[List[str]] = None):
    """
    Decorator for routes that require authentication

    Args:
        roles: List of required roles (if None, any authenticated user is allowed)
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            auth = current_app.config.get('AUTH_MANAGER')

            # Check if authentication is enabled
            if not auth:
                return f(*args, **kwargs)

            # Check if user is authenticated
            token = session.get('auth_token')
            if not token:
                return redirect(url_for('auth.login', next=request.url))

            # Validate token
            token_data = auth.validate_token(token)
            if not token_data:
                return redirect(url_for('auth.login', next=request.url))

            # Check roles if specified
            if roles:
                user_roles = token_data.get('roles', [])
                if not any(role in user_roles for role in roles):
                    return Response('Unauthorized', 403)

            # Authentication successful
            return f(*args, **kwargs)
        return decorated
    return decorator
```

### Credentials Storage

Credentials are stored in a JSON file with the following structure:

```json
{
  "admin": {
    "password_hash": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    "roles": ["admin"],
    "created_at": "2025-05-09T12:00:00.000Z"
  },
  "viewer": {
    "password_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "roles": ["viewer"],
    "created_at": "2025-05-09T12:00:00.000Z"
  }
}
```

### Audit Logging

Audit logs are stored in a file with the following format:

```json
{"timestamp": "2025-05-09T12:00:00.000Z", "event": "login", "username": "admin", "success": true, "ip": "127.0.0.1", "user_agent": "Mozilla/5.0", "details": {}}
{"timestamp": "2025-05-09T12:01:00.000Z", "event": "token_generated", "username": "admin", "success": true, "ip": "127.0.0.1", "user_agent": "Mozilla/5.0", "details": {}}
{"timestamp": "2025-05-09T12:30:00.000Z", "event": "login", "username": "unknown", "success": false, "ip": "192.168.1.1", "user_agent": "Mozilla/5.0", "details": {"reason": "user_not_found"}}
```

## Role-Based Access Control

The system defines the following roles:

1. **Admin**:
   - Full access to all dashboard features
   - Can run health checks
   - Can view and modify configuration
   - Can manage users

2. **Viewer**:
   - Read-only access to dashboard
   - Can view health status and metrics
   - Cannot run health checks
   - Cannot modify configuration

3. **API**:
   - Access to API endpoints only
   - Cannot access dashboard UI
   - Limited to specific API operations

Routes are secured using the `requires_auth` decorator:

```python
@vector_search_bp.route('/health')
@requires_auth(['admin', 'viewer'])
def health_dashboard():
    # Dashboard implementation

@vector_search_bp.route('/api/health')
@requires_auth(['admin', 'viewer', 'api'])
def health_api():
    # API implementation

@vector_search_bp.route('/api/run-check')
@requires_auth(['admin'])
def run_check_api():
    # Run health check implementation
```

## Token-Based Session Management

The system uses token-based session management:

1. **Token Generation**:
   - Tokens are generated using `secrets.token_hex(32)`
   - Tokens are stored in the `active_tokens` dictionary
   - Token data includes username, creation time, expiry time, and roles

2. **Token Validation**:
   - Tokens are validated on each request
   - Expired tokens are automatically removed
   - Invalid tokens result in redirection to login page

3. **Token Revocation**:
   - Tokens are revoked on logout
   - Revoked tokens are removed from the `active_tokens` dictionary

## Security Best Practices

The system implements the following security best practices:

1. **Secure Password Storage**:
   - Passwords are hashed using SHA-256
   - Password hashes are never exposed to clients
   - Default credentials are flagged for change

2. **Session Security**:
   - Sessions are signed to prevent tampering
   - Sessions have a limited lifetime
   - Sessions can be revoked

3. **Access Control**:
   - Principle of least privilege
   - Role-based access control
   - Explicit permission checks

4. **Audit Logging**:
   - Comprehensive logging of security events
   - Tamper-evident logs
   - Log integrity verification

5. **Error Handling**:
   - Secure error handling
   - No sensitive information in error messages
   - Graceful degradation on errors

## Configuration Options

The security system provides the following configuration options:

1. **Authentication**:
   - `DASHBOARD_AUTH_ENABLED`: Whether authentication is enabled
   - `DASHBOARD_CREDENTIALS_FILE`: Path to credentials file
   - `DASHBOARD_TOKEN_EXPIRY`: Token expiry time in seconds

2. **Audit Logging**:
   - `DASHBOARD_AUDIT_ENABLED`: Whether audit logging is enabled
   - `DASHBOARD_AUDIT_LOG_FILE`: Path to audit log file

3. **Session Security**:
   - `SECRET_KEY`: Secret key for session signing
   - `SESSION_TYPE`: Session type (filesystem)
   - `SESSION_PERMANENT`: Whether sessions are permanent
   - `SESSION_USE_SIGNER`: Whether to sign sessions
   - `PERMANENT_SESSION_LIFETIME`: Session lifetime in seconds

## Deployment Considerations

When deploying the security system, consider:

1. **Credentials File**:
   - Store in a secure location
   - Restrict file permissions
   - Back up regularly

2. **Audit Logs**:
   - Store in a secure location
   - Implement log rotation
   - Monitor for suspicious activity

3. **HTTPS**:
   - Use HTTPS for all dashboard access
   - Configure proper SSL/TLS settings
   - Use strong cipher suites

4. **Environment Variables**:
   - Use environment variables for sensitive configuration
   - Do not store sensitive information in code
   - Rotate secrets regularly

## Future Enhancements

Planned enhancements for the security system:

1. **Multi-Factor Authentication**:
   - Support for TOTP-based MFA
   - Integration with external identity providers

2. **Enhanced Password Policies**:
   - Password complexity requirements
   - Password expiry
   - Password history

3. **Advanced Audit Logging**:
   - Log aggregation and analysis
   - Anomaly detection
   - Real-time alerting

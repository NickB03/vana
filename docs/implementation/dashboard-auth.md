# Dashboard Authentication Implementation

[Home](../../index.md) > [Implementation](index.md) > Dashboard Authentication

## Overview

The VANA dashboard implements a comprehensive authentication and authorization system to secure both the web UI and API endpoints. This document details the implementation of this security system, focusing on the `DashboardAuth` class and related components.

## Key Components

### 1. DashboardAuth Class

The `DashboardAuth` class (`dashboard/auth/dashboard_auth.py`) is the core component responsible for authentication and authorization. It provides:

- User authentication with username/password
- API key authentication for programmatic access
- Token-based session management
- Role-based access control (RBAC)
- Audit logging for security events

### 2. Authentication Decorator

The `requires_auth` decorator is used to protect routes and API endpoints, ensuring that only authenticated users with appropriate roles can access them.

### 3. Authentication Routes

The `auth_routes.py` file implements the web UI routes for login, logout, and password management.

## Implementation Details

### DashboardAuth Class

#### Initialization

```python
def __init__(
    self,
    credentials_file: str = DEFAULT_CREDENTIALS_FILE,
    audit_log_file: str = DEFAULT_AUDIT_LOG_FILE,
    api_keys_file: str = DEFAULT_API_KEYS_FILE,
    token_expiry: int = 86400,  # 24 hours
    enable_audit: bool = True,
    credentials_data: Optional[Dict[str, Any]] = None
):
```

The constructor accepts several parameters:
- `credentials_file`: Path to the JSON file containing user credentials
- `audit_log_file`: Path to the audit log file
- `api_keys_file`: Path to the JSON file containing API keys
- `token_expiry`: Token expiration time in seconds
- `enable_audit`: Whether to enable audit logging
- `credentials_data`: Optional credentials data to use instead of loading from file

#### User Authentication

```python
def authenticate(self, username: str, password: str) -> bool:
```

This method authenticates a user with a username and password. It:
1. Checks if the user exists in the credentials
2. Hashes the provided password and compares it with the stored hash
3. Logs the authentication attempt in the audit log
4. Returns `True` if authentication is successful, `False` otherwise

#### Token Management

```python
def generate_token(self, username: str) -> str:
def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
def revoke_token(self, token: str) -> bool:
```

These methods handle token-based authentication for web sessions:
- `generate_token`: Creates a new token for an authenticated user
- `validate_token`: Validates a token and returns the associated data
- `revoke_token`: Invalidates a token (used during logout)

#### API Key Authentication

```python
def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
def create_api_key(self, name: str, roles: List[str], created_by: str, expires_in_days: Optional[int] = None) -> str:
def revoke_api_key(self, api_key: str) -> bool:
```

These methods handle API key authentication for programmatic access:
- `validate_api_key`: Validates an API key and returns the associated data
- `create_api_key`: Creates a new API key with specified roles
- `revoke_api_key`: Invalidates an API key

#### Role-Based Access Control

```python
def has_role(self, username: str, role: str) -> bool:
```

This method checks if a user has a specific role, enabling role-based access control.

#### Audit Logging

```python
def _audit_log(self, event: str, username: str, success: bool, details: Optional[Dict[str, Any]] = None) -> None:
```

This method logs security events to the audit log, including:
- Authentication attempts
- Token generation and validation
- API key validation
- Password changes

### Authentication Decorator

```python
def requires_auth(roles: Optional[List[str]] = None):
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            # Authentication logic
            return f(*args, **kwargs)
        return decorated
    return decorator
```

The `requires_auth` decorator protects routes and API endpoints by:
1. Checking for API key authentication via the `X-API-Key` header
2. If no API key, checking for session-based authentication
3. Validating that the authenticated user/API key has the required roles
4. Returning appropriate responses based on the authentication result

### Authentication Routes

The `auth_routes.py` file implements several routes:
- `/auth/login`: Handles user login and token generation
- `/auth/logout`: Handles user logout and token revocation
- `/auth/change-password`: Allows users to change their passwords

## Configuration

### Default Files

- `DEFAULT_CREDENTIALS_FILE = "dashboard/auth/credentials.json"`: User credentials
- `DEFAULT_AUDIT_LOG_FILE = "logs/audit/dashboard_auth.log"`: Audit log
- `DEFAULT_API_KEYS_FILE = "dashboard/auth/api_keys.json"`: API keys

### Credential Format

The credentials file uses the following JSON format:

```json
{
  "username": {
    "password_hash": "hashed_password",
    "roles": ["role1", "role2"],
    "created_at": "timestamp"
  }
}
```

### API Key Format

The API keys file uses the following JSON format:

```json
{
  "api_key": {
    "name": "Key Name",
    "roles": ["role1", "role2"],
    "created_at": "timestamp",
    "created_by": "username",
    "expires_at": "timestamp"  // Optional
  }
}
```

## Integration with Flask

The `DashboardAuth` instance is stored in the Flask application configuration:

```python
app.config['AUTH_MANAGER'] = auth_manager
```

This allows the `requires_auth` decorator to access the authentication manager from any route.

## Security Considerations

1. **Password Storage**: Passwords are stored as SHA-256 hashes, not in plaintext.
2. **Token Security**: Tokens are generated using `secrets.token_hex(32)` for cryptographic security.
3. **API Key Security**: API keys are also generated using `secrets.token_hex(32)`.
4. **Audit Logging**: All security events are logged for monitoring and forensics.
5. **Role-Based Access**: Different endpoints require different roles, following the principle of least privilege.

## Usage Examples

### Protecting a Route

```python
@app.route('/api/sensitive-data')
@requires_auth(['admin'])
def get_sensitive_data():
    # Only users with the 'admin' role can access this endpoint
    return jsonify({"data": "sensitive information"})
```

### Allowing Multiple Roles

```python
@app.route('/api/vector-search/health')
@requires_auth(['admin', 'viewer', 'api'])
def health_api():
    # Users with 'admin', 'viewer', or 'api' roles can access this endpoint
    return jsonify(get_health_data())
```

## Related Documentation

- [API Security Guide](../guides/api-security.md): User-facing documentation for API security
- [Running the Dashboard](../guides/running-dashboard.md): Information on starting and using the dashboard
- [Security Integration Guide](../guides/security-integration.md): General security principles in VANA

# 🔐 Authentication & Authorization Documentation

[![Auth System](https://img.shields.io/badge/auth-JWT%20%2B%20OAuth2-green)](https://tools.ietf.org/html/rfc6749)
[![Security](https://img.shields.io/badge/security-RBAC%20%2B%20CORS-blue)](#security-features)
[![Google Cloud](https://img.shields.io/badge/google--cloud-IAM%20integrated-orange)](https://cloud.google.com/iam)
[![FastAPI](https://img.shields.io/badge/FastAPI-authentication-red)](https://fastapi.tiangolo.com/)

Comprehensive authentication and authorization system for the Vana project, featuring JWT tokens, role-based access control (RBAC), Google Cloud IAM integration, and OAuth2 compliance.

## 📋 Table of Contents

- [🏗️ Architecture Overview](#️-architecture-overview)
- [🚀 Quick Start](#-quick-start)
- [🔑 Authentication Methods](#-authentication-methods)
- [👥 User Management](#-user-management)
- [🛡️ Authorization & RBAC](#️-authorization--rbac)
- [☁️ Google Cloud Integration](#️-google-cloud-integration)
- [⚙️ Configuration](#️-configuration)
- [🔧 Local Development Setup](#-local-development-setup)
- [🌐 Production Configuration](#-production-configuration)
- [🧪 Testing Authentication](#-testing-authentication)
- [🛡️ Security Features](#️-security-features)
- [📊 Token Management](#-token-management)
- [🚨 Troubleshooting](#-troubleshooting)
- [📚 API Reference](#-api-reference)

## 🏗️ Architecture Overview

The Vana authentication system is built on FastAPI with a comprehensive security architecture:

```mermaid
graph TB
    A[Client Application] --> B[FastAPI Server]
    B --> C[Authentication Middleware]
    C --> D[JWT Token Validation]
    D --> E[User Authorization]
    E --> F[Role-Based Access Control]
    
    G[User Registration] --> H[Password Hashing]
    H --> I[Database Storage]
    
    J[Google OAuth2] --> K[ID Token Verification]
    K --> L[User Creation/Login]
    
    M[Refresh Tokens] --> N[Token Rotation]
    N --> O[Session Management]
    
    P[Rate Limiting] --> Q[Security Headers]
    Q --> R[CORS Protection]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style F fill:#e8f5e8
    style L fill:#fff3e0
```

### Core Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **JWT Tokens** | Stateless authentication | HS256 algorithm |
| **Refresh Tokens** | Long-lived session management | Database-stored, rotating |
| **RBAC System** | Fine-grained permissions | Users → Roles → Permissions |
| **Google Cloud IAM** | External identity provider | OAuth2 + ID tokens |
| **Middleware Stack** | Security, rate limiting, CORS | Custom FastAPI middleware |
| **Password Security** | Secure password handling | bcrypt with configurable rounds |

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Vana project
cd /Users/nick/Development/vana
pip install -r requirements.txt

# Or use uv (recommended)
uv sync
```

### 2. Configure Environment

Create `.env.local` files:

```bash
# Root directory: /Users/nick/Development/vana/.env.local
BRAVE_API_KEY=your_brave_api_key
ALLOW_ORIGINS=http://localhost:5173,http://localhost:3000
GOOGLE_CLOUD_PROJECT=analystai-454200

# App directory: /Users/nick/Development/vana/app/.env.local
AUTH_SECRET_KEY=your_generated_secret_key
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_REFRESH_TOKEN_EXPIRE_DAYS=7
SESSION_DB_URI=sqlite:////tmp/vana_sessions.db
```

### 3. Initialize Authentication Database

```bash
make dev-backend  # This will automatically initialize the auth database
```

### 4. Test Authentication

```bash
# Register a user
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!",
    "first_name": "Test",
    "last_name": "User"
  }'

# Login with OAuth2 form data (recommended)
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=SecurePass123!&grant_type=password"

# Login with JSON (backward compatibility)
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "SecurePass123!"}'
```

## 🔑 Authentication Methods

### 1. Username/Email + Password Authentication

**Standard login flow:**

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    
    C->>S: POST /auth/login (credentials)
    S->>DB: Validate user credentials
    DB-->>S: User data
    S->>S: Generate JWT + Refresh token
    S->>DB: Store refresh token
    S-->>C: Access token + Refresh token
    
    Note over C,S: Subsequent requests
    C->>S: API request + JWT token
    S->>S: Validate JWT
    S-->>C: API response
```

**Supported formats:**
- **OAuth2 Form Data** (recommended): `application/x-www-form-urlencoded`
- **JSON Data** (legacy): `application/json`

### 2. Google Cloud Identity Authentication

**Google OAuth2 flow:**

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant G as Google
    participant S as Server
    participant DB as Database
    
    U->>C: Click "Login with Google"
    C->>G: Redirect to Google OAuth
    G-->>U: Google login page
    U->>G: Enter credentials
    G-->>C: ID token + Access token
    C->>S: POST /auth/google (tokens)
    S->>G: Verify ID token
    G-->>S: User info
    S->>DB: Create/update user
    S->>S: Generate JWT tokens
    S-->>C: Access + Refresh tokens
```

### 3. Refresh Token Flow

**Token refresh mechanism:**

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant DB as Database
    
    C->>S: POST /auth/refresh (refresh_token)
    S->>DB: Validate refresh token
    DB-->>S: Token data + User
    S->>DB: Revoke old refresh token
    S->>S: Generate new tokens
    S->>DB: Store new refresh token
    S-->>C: New access + refresh tokens
```

## 👥 User Management

### User Model Structure

```python
class User:
    id: int                           # Primary key
    email: str                        # Unique, indexed
    username: str                     # Unique, indexed
    first_name: Optional[str]
    last_name: Optional[str]
    hashed_password: str             # bcrypt hashed
    is_active: bool = True           # Account status
    is_superuser: bool = False       # Admin privileges
    is_verified: bool = False        # Email verification
    google_cloud_identity: Optional[str]  # Google sub ID
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    roles: List[Role]                # Many-to-many relationship
```

### User Registration

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (`!@#$%^&*()_+-=[]{}|;:,.<>?`)

```python
# Example registration
user_data = {
    "email": "user@example.com",
    "username": "username",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Doe"
}
```

### User Operations

| Operation | Endpoint | Method | Auth Required |
|-----------|----------|---------|---------------|
| Register | `/auth/register` | POST | ❌ |
| Login | `/auth/login` | POST | ❌ |
| Get current user | `/auth/me` | GET | ✅ |
| Update current user | `/auth/me` | PUT | ✅ |
| Change password | `/auth/change-password` | POST | ✅ |
| Forgot password | `/auth/forgot-password` | POST | ❌ |
| Reset password | `/auth/reset-password` | POST | ❌ |
| Logout | `/auth/logout` | POST | ✅ |
| Logout all devices | `/auth/logout-all` | POST | ✅ |

## 🛡️ Authorization & RBAC

### Role-Based Access Control Model

```mermaid
graph LR
    U[Users] --> R[Roles]
    R --> P[Permissions]
    
    U1[User 1] --> R1[Admin Role]
    U2[User 2] --> R2[User Role]
    U3[User 3] --> R2
    
    R1 --> P1[users:create]
    R1 --> P2[users:read]
    R1 --> P3[users:update]
    R1 --> P4[users:delete]
    R1 --> P5[agents:admin]
    
    R2 --> P2
    R2 --> P6[agents:read]
    
    style U1 fill:#ffcdd2
    style R1 fill:#f8bbd9
    style P1,P2,P3,P4,P5 fill:#c8e6c9
```

### Permission System

**Permission Structure:**
```python
class Permission:
    name: str        # e.g., "users:read"
    resource: str    # e.g., "users", "agents", "sessions"
    action: str      # e.g., "read", "write", "create", "delete"
    description: str
```

**Built-in Permissions:**
```python
PERMISSIONS = [
    "users:read",     # View user information
    "users:create",   # Create new users
    "users:update",   # Update user information
    "users:delete",   # Delete users
    "agents:read",    # View agent information
    "agents:create",  # Create agents
    "agents:update",  # Update agents
    "agents:delete",  # Delete agents
    "sessions:read",  # View sessions
    "sessions:create", # Create sessions
    "feedback:create", # Submit feedback
]
```

**Default Roles:**
- **user**: Basic permissions (`agents:read`, `sessions:create`, `feedback:create`)
- **admin**: Administrative permissions (all permissions)

### Authorization Decorators

```python
from app.auth.security import require_permissions, require_roles

# Require specific permissions
@app.get("/users/")
async def list_users(
    current_user: User = Depends(require_permissions(["users:read"]))
):
    pass

# Require specific roles
@app.get("/admin/dashboard")
async def admin_dashboard(
    current_user: User = Depends(require_roles(["admin"]))
):
    pass

# Superuser only
@app.delete("/system/reset")
async def system_reset(
    current_user: User = Depends(get_current_superuser)
):
    pass
```

## ☁️ Google Cloud Integration

### Google Cloud IAM Integration

The system integrates with Google Cloud IAM for enterprise authentication:

```mermaid
graph TB
    A[Google Cloud Project] --> B[IAM Policies]
    B --> C[Service Account]
    C --> D[Vana Application]
    
    E[Google User] --> F[OAuth2 Login]
    F --> G[ID Token Verification]
    G --> H[Local User Creation]
    H --> I[Role Mapping]
    
    J[IAM Roles] --> K[Local Roles]
    K --> L[Permissions]
    
    style A fill:#4285f4,color:#fff
    style E fill:#34a853,color:#fff
    style J fill:#ea4335,color:#fff
```

### Google Authentication Flow

1. **Client Integration:**
   ```javascript
   // Frontend Google Sign-In
   const credential = await google.accounts.id.prompt();
   
   // Send to backend
   const response = await fetch('/auth/google', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       id_token: credential.credential
     })
   });
   ```

2. **Backend Verification:**
   ```python
   # Verify Google ID token
   google_user = verify_google_identity(id_token)
   
   # Create or update local user
   user = create_or_update_user_from_google(google_user)
   
   # Generate application tokens
   access_token = create_access_token({"sub": str(user.id)})
   refresh_token = create_refresh_token(user.id, db)
   ```

### IAM Role Mapping

```python
# Map Google Cloud IAM roles to local roles
GOOGLE_ROLE_MAPPING = {
    "roles/owner": ["admin", "user"],
    "roles/editor": ["user"],
    "roles/viewer": ["viewer"],
    "roles/compute.admin": ["admin"],
    "roles/storage.admin": ["admin"],
}

# Sync user roles from Google Cloud
local_roles = map_google_roles_to_local(google_roles)
```

## ⚙️ Configuration

### Environment Variables

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_SECRET_KEY` | JWT signing secret | `generated_secret_key_32_chars` |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | `analystai-454200` |
| `SESSION_DB_URI` | Session database URI | `sqlite:////tmp/vana_sessions.db` |

#### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ALGORITHM` | `HS256` | JWT signing algorithm |
| `AUTH_ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token expiration |
| `AUTH_REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token expiration |
| `AUTH_PASSWORD_MIN_LENGTH` | `8` | Minimum password length |
| `AUTH_BCRYPT_ROUNDS` | `12` | bcrypt hashing rounds |
| `AUTH_LOGIN_RATE_LIMIT` | `5` | Login attempts per minute |
| `AUTH_ENABLE_REGISTRATION` | `True` | Allow new user registration |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `False` | Require email verification |
| `AUTH_REQUIRE_SSE_AUTH` | `True` | Require auth for SSE endpoints |

### Authentication Settings Class

```python
class AuthSettings(BaseSettings):
    """Authentication configuration with validation."""
    
    secret_key: str = Field(default_factory=lambda: os.urandom(32).hex())
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    password_min_length: int = 8
    bcrypt_rounds: int = 12
    enable_registration: bool = True
    require_email_verification: bool = False
    
    model_config = ConfigDict(
        env_file=".env.local",
        env_prefix="AUTH_",
        extra="ignore"
    )
```

## 🔧 Local Development Setup

### 1. Environment Configuration

Create configuration files:

```bash
# Root .env.local
cat > .env.local << EOF
BRAVE_API_KEY=your_brave_api_key
ALLOW_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
GOOGLE_CLOUD_PROJECT=analystai-454200
EOF

# App .env.local
cat > app/.env.local << EOF
AUTH_SECRET_KEY=$(python -c "import os; print(os.urandom(32).hex())")
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=30
AUTH_REFRESH_TOKEN_EXPIRE_DAYS=7
SESSION_DB_URI=sqlite:////tmp/vana_sessions.db
GOOGLE_CLOUD_PROJECT=analystai-454200
ALLOW_ORIGINS=http://localhost:5173,http://localhost:3000
AUTH_REQUIRE_SSE_AUTH=false
EOF
```

### 2. Database Setup

The authentication database is automatically initialized:

```bash
# Start the backend (auto-initializes database)
make dev-backend

# Or manually initialize
python -c "from app.auth.database import init_auth_db; init_auth_db()"
```

### 3. Create Test Users

```python
# Create admin user
python -c """
from app.auth.database import get_auth_db
from app.auth.models import User, Role
from app.auth.security import get_password_hash

db = next(get_auth_db())

# Create admin user
admin_user = User(
    email='admin@localhost',
    username='admin',
    first_name='Admin',
    last_name='User',
    hashed_password=get_password_hash('AdminPass123!'),
    is_active=True,
    is_superuser=True,
    is_verified=True
)

# Assign admin role
admin_role = db.query(Role).filter(Role.name == 'admin').first()
if admin_role:
    admin_user.roles.append(admin_role)

db.add(admin_user)
db.commit()
print('Admin user created: admin@localhost / AdminPass123!')
"""
```

### 4. Test Authentication Flow

```bash
# Test script
cat > test_auth.sh << 'EOF'
#!/bin/bash

BASE_URL="http://localhost:8000"

echo "Testing user registration..."
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser", 
    "password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User"
  }' | jq .

echo -e "\nTesting login..."
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=TestPass123!&grant_type=password")

TOKEN=$(echo $RESPONSE | jq -r .access_token)
echo "Access token: ${TOKEN:0:20}..."

echo -e "\nTesting authenticated endpoint..."
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\nAuthentication test complete!"
EOF

chmod +x test_auth.sh
./test_auth.sh
```

## 🌐 Production Configuration

### 1. Environment Variables

```bash
# Production .env (use secrets management)
AUTH_SECRET_KEY=strong_production_secret_key_64_chars_minimum
AUTH_ACCESS_TOKEN_EXPIRE_MINUTES=15
AUTH_REFRESH_TOKEN_EXPIRE_DAYS=30
AUTH_BCRYPT_ROUNDS=14
AUTH_ENABLE_REGISTRATION=false
AUTH_REQUIRE_EMAIL_VERIFICATION=true
AUTH_REQUIRE_SSE_AUTH=true

# Database
SESSION_DB_URI=postgresql://user:pass@localhost:5432/vana_sessions

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-production-project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# CORS (restrict origins)
ALLOW_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Rate limiting (more restrictive)
AUTH_LOGIN_RATE_LIMIT=3
AUTH_REGISTRATION_RATE_LIMIT=1
```

### 2. Database Configuration

```python
# Use production database
AUTH_DATABASE_URL = "postgresql://user:password@host:5432/database"

# Connection pooling
engine = create_engine(
    AUTH_DATABASE_URL,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

### 3. Security Headers

Production security middleware configuration:

```python
class ProductionSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Production security headers
        response.headers.update({
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none';",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
        })
        
        return response
```

### 4. Monitoring & Logging

```python
# Production logging configuration
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "detailed": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        },
    },
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/vana/auth.log",
            "maxBytes": 10485760,
            "backupCount": 5,
            "formatter": "detailed",
        },
    },
    "loggers": {
        "app.auth": {
            "handlers": ["file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
```

## 🧪 Testing Authentication

### Unit Tests

Run authentication unit tests:

```bash
# Run all authentication tests
pytest tests/unit/test_auth.py -v

# Run specific test classes
pytest tests/unit/test_auth.py::TestPasswordSecurity -v
pytest tests/unit/test_auth.py::TestJWTTokens -v
pytest tests/unit/test_auth.py::TestUserAuthentication -v

# Run with coverage
pytest tests/unit/test_auth.py --cov=app.auth --cov-report=html
```

### Integration Tests

```bash
# Run API integration tests
pytest tests/integration/test_auth_api.py -v

# Test specific endpoints
pytest tests/integration/test_auth_api.py::TestUserRegistration -v
pytest tests/integration/test_auth_api.py::TestUserLogin -v
pytest tests/integration/test_auth_api.py::TestOAuth2Compliance -v
```

### Manual Testing

```bash
# Test registration
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manual@test.com",
    "username": "manualtest",
    "password": "ManualTest123!",
    "first_name": "Manual",
    "last_name": "Test"
  }'

# Test OAuth2 login
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=manualtest&password=ManualTest123!&grant_type=password"

# Test token refresh
curl -X POST "http://localhost:8000/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "your_refresh_token"}'

# Test protected endpoint
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer your_access_token"
```

### Load Testing

```bash
# Install load testing tools
pip install locust

# Create load test
cat > auth_load_test.py << 'EOF'
from locust import HttpUser, task, between

class AuthUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Register user
        response = self.client.post("/auth/register", json={
            "email": f"user{self.environment.runner.user_count}@test.com",
            "username": f"user{self.environment.runner.user_count}",
            "password": "LoadTest123!",
            "first_name": "Load",
            "last_name": "Test"
        })
        
        # Login and get token
        response = self.client.post("/auth/login", data={
            "username": f"user{self.environment.runner.user_count}",
            "password": "LoadTest123!",
            "grant_type": "password"
        }, headers={"Content-Type": "application/x-www-form-urlencoded"})
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
        
    @task(3)
    def get_user_info(self):
        self.client.get("/auth/me", headers={
            "Authorization": f"Bearer {self.token}"
        })
    
    @task(1) 
    def refresh_token(self):
        # Simulate token refresh
        pass
EOF

# Run load test
locust -f auth_load_test.py --host=http://localhost:8000
```

## 🛡️ Security Features

### Password Security

```python
# Password validation rules
PASSWORD_RULES = {
    "min_length": 8,
    "require_uppercase": True,
    "require_lowercase": True, 
    "require_digits": True,
    "require_special_chars": True,
    "special_chars": "!@#$%^&*()_+-=[]{}|;:,.<>?",
    "bcrypt_rounds": 12  # Configurable for performance
}

# Password strength validation
def validate_password_strength(password: str) -> bool:
    """Validate password meets security requirements."""
    checks = [
        len(password) >= 8,
        any(c.isupper() for c in password),
        any(c.islower() for c in password),
        any(c.isdigit() for c in password),
        any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    ]
    return all(checks)
```

### JWT Token Security

```python
# JWT configuration
JWT_CONFIG = {
    "algorithm": "HS256",
    "access_token_expire": timedelta(minutes=30),
    "refresh_token_expire": timedelta(days=7),
    "issuer": "vana-auth-system",
    "audience": "vana-api",
}

# Token validation
def validate_jwt_token(token: str) -> Dict[str, Any]:
    """Validate JWT token and return payload."""
    try:
        payload = jwt.decode(
            token, 
            JWT_SECRET_KEY, 
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_CONFIG["issuer"],
            audience=JWT_CONFIG["audience"]
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Rate Limiting

```python
# Rate limiting configuration
RATE_LIMITS = {
    "/auth/login": "5/minute",      # 5 login attempts per minute
    "/auth/register": "3/hour",     # 3 registrations per hour  
    "/auth/refresh": "10/minute",   # 10 token refreshes per minute
    "/auth/forgot-password": "2/hour"  # 2 password resets per hour
}

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware with configurable limits."""
    
    def __init__(self, app, limits: Dict[str, str]):
        super().__init__(app)
        self.limits = self.parse_limits(limits)
        self.clients = defaultdict(list)
```

### CORS Configuration

```python
# CORS settings
CORS_CONFIG = {
    "allowed_origins": [
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # React dev server
        "https://yourdomain.com", # Production domain
    ],
    "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allowed_headers": [
        "Authorization",
        "Content-Type", 
        "Accept",
        "X-Requested-With"
    ],
    "allow_credentials": True,
    "max_age": 86400  # 24 hours
}
```

### Security Headers

```python
# Security headers for all responses
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY", 
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; frame-ancestors 'none';",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
}
```

## 📊 Token Management

### JWT Token Lifecycle

```mermaid
graph TB
    A[User Login] --> B[Generate Access Token]
    B --> C[Generate Refresh Token]
    C --> D[Store Refresh Token in DB]
    D --> E[Return Both Tokens]
    
    F[Token Expires] --> G[Use Refresh Token]
    G --> H[Validate Refresh Token]
    H --> I[Revoke Old Refresh Token]
    I --> J[Generate New Tokens]
    J --> K[Store New Refresh Token]
    K --> L[Return New Tokens]
    
    M[Logout] --> N[Revoke Refresh Token]
    M --> O[Blacklist Access Token]
    
    style A fill:#e8f5e8
    style E fill:#e1f5fe
    style L fill:#e1f5fe
    style N,O fill:#ffebee
```

### Token Storage Strategy

| Token Type | Storage Location | Expiration | Rotation |
|------------|------------------|------------|----------|
| **Access Token** | Memory/localStorage | 30 minutes | No |
| **Refresh Token** | Database + httpOnly cookie | 7 days | Yes |

### Refresh Token Management

```python
class RefreshTokenManager:
    """Manage refresh token lifecycle."""
    
    def create_refresh_token(self, user_id: int, device_info: str = None) -> str:
        """Create and store refresh token."""
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        # Clean up old tokens (keep only latest 5)
        self.cleanup_old_tokens(user_id, keep=4)
        
        # Store new token
        refresh_token = RefreshToken(
            token=token,
            user_id=user_id,
            expires_at=expires_at,
            device_info=device_info,
            ip_address=self.get_client_ip()
        )
        self.db.add(refresh_token)
        self.db.commit()
        
        return token
    
    def rotate_refresh_token(self, old_token: str) -> Tuple[str, str]:
        """Rotate refresh token and generate new access token."""
        # Verify old token
        user = self.verify_refresh_token(old_token)
        if not user:
            raise InvalidTokenError("Invalid refresh token")
        
        # Revoke old token
        self.revoke_refresh_token(old_token)
        
        # Create new tokens
        access_token = create_access_token({"sub": str(user.id)})
        refresh_token = self.create_refresh_token(user.id)
        
        return access_token, refresh_token
```

### Token Security Best Practices

1. **Access Tokens:**
   - Short-lived (30 minutes)
   - Stored in memory
   - Include minimal claims
   - Use for API authentication

2. **Refresh Tokens:**
   - Long-lived (7 days)  
   - Stored in database
   - Rotate on use
   - Limit per user (5 tokens max)
   - Include device tracking

3. **Token Blacklisting:**
   ```python
   class TokenBlacklist:
       """Blacklist compromised tokens."""
       
       def __init__(self, redis_client):
           self.redis = redis_client
       
       def blacklist_token(self, token: str, expires_at: datetime):
           """Add token to blacklist."""
           ttl = int((expires_at - datetime.now(timezone.utc)).total_seconds())
           self.redis.setex(f"blacklist:{token}", ttl, "1")
       
       def is_blacklisted(self, token: str) -> bool:
           """Check if token is blacklisted."""
           return bool(self.redis.get(f"blacklist:{token}"))
   ```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Invalid credentials" on login

**Symptoms:**
- Login returns 401 Unauthorized
- Error: "invalid_grant"

**Solutions:**
```bash
# Check user exists
python -c "
from app.auth.database import get_auth_db
from app.auth.models import User
db = next(get_auth_db())
user = db.query(User).filter(User.username == 'your_username').first()
print(f'User found: {user is not None}')
if user:
    print(f'Active: {user.is_active}')
"

# Reset password
python -c "
from app.auth.database import get_auth_db  
from app.auth.models import User
from app.auth.security import get_password_hash
db = next(get_auth_db())
user = db.query(User).filter(User.username == 'your_username').first()
if user:
    user.hashed_password = get_password_hash('NewPassword123!')
    db.commit()
    print('Password reset successful')
"
```

#### 2. "Token expired" errors

**Symptoms:**
- Protected endpoints return 401
- Error: "Token has expired"

**Solutions:**
```javascript
// Frontend token refresh logic
async function refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        // Redirect to login
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await fetch('/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            return data.access_token;
        }
    } catch (error) {
        console.error('Token refresh failed:', error);
        // Redirect to login
        window.location.href = '/login';
    }
}

// Axios interceptor for automatic token refresh
axios.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401) {
            const newToken = await refreshToken();
            if (newToken) {
                error.config.headers.Authorization = `Bearer ${newToken}`;
                return axios.request(error.config);
            }
        }
        return Promise.reject(error);
    }
);
```

#### 3. CORS issues

**Symptoms:**
- Browser console shows CORS errors
- OPTIONS requests failing

**Solutions:**
```python
# Check CORS configuration in .env.local
ALLOW_ORIGINS=http://localhost:5173,http://localhost:3000

# Debug CORS middleware
@app.middleware("http")
async def debug_cors(request: Request, call_next):
    origin = request.headers.get("origin")
    print(f"Request origin: {origin}")
    response = await call_next(request)
    print(f"CORS headers: {dict(response.headers)}")
    return response
```

#### 4. Google OAuth issues

**Symptoms:**
- Google login fails
- "Invalid Google ID token" error

**Solutions:**
```bash
# Check Google Cloud configuration
echo "Project ID: $GOOGLE_CLOUD_PROJECT"
echo "Credentials: $GOOGLE_APPLICATION_CREDENTIALS"

# Test Google token verification
python -c "
from app.auth.google_cloud import verify_google_identity
try:
    result = verify_google_identity('your_id_token')
    print('Token verification successful:', result)
except Exception as e:
    print('Token verification failed:', e)
"
```

#### 5. Database connection issues

**Symptoms:**
- "No such table" errors
- Database connection failures

**Solutions:**
```bash
# Recreate auth database
python -c "
from app.auth.database import init_auth_db
from app.auth.models import Base
init_auth_db()
print('Database initialized')
"

# Check database file permissions
ls -la /tmp/vana_sessions.db

# Test database connection
python -c "
from app.auth.database import get_auth_db
from app.auth.models import User
db = next(get_auth_db())
count = db.query(User).count()
print(f'User count: {count}')
"
```

### Debug Mode

Enable debug logging:

```python
# Add to app configuration
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("app.auth")

# Add debug middleware
@app.middleware("http")
async def debug_auth(request: Request, call_next):
    auth_header = request.headers.get("authorization", "")
    logger.debug(f"Auth header: {auth_header[:50]}...")
    
    response = await call_next(request)
    
    logger.debug(f"Response status: {response.status_code}")
    return response
```

### Health Check Endpoint

```python
@app.get("/auth/health")
async def auth_health_check():
    """Check authentication system health."""
    try:
        # Test database connection
        db = next(get_auth_db())
        user_count = db.query(User).count()
        
        # Test JWT signing
        test_token = create_access_token({"sub": "health_check"})
        
        return {
            "status": "healthy",
            "database": "connected",
            "user_count": user_count,
            "jwt_signing": "operational",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Authentication system unhealthy: {str(e)}"
        )
```

## 📚 API Reference

### Authentication Endpoints

#### POST `/auth/register`
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com", 
  "username": "username",
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "is_active": true,
  "is_superuser": false,
  "is_verified": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "roles": []
}
```

#### POST `/auth/login`
Authenticate user and return tokens.

**OAuth2 Form Request:**
```
Content-Type: application/x-www-form-urlencoded

username=testuser&password=SecurePass123!&grant_type=password
```

**JSON Request (legacy):**
```json
{
  "username": "testuser",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "abc123def456...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### POST `/auth/refresh`
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "abc123def456..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "new_refresh_token...", 
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### GET `/auth/me`
Get current user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "username", 
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "is_active": true,
  "is_superuser": false,
  "is_verified": true,
  "last_login": "2024-01-01T12:00:00Z",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "roles": [
    {
      "id": 1,
      "name": "user",
      "description": "Standard user role",
      "permissions": [
        {
          "id": 1,
          "name": "agents:read", 
          "resource": "agents",
          "action": "read"
        }
      ]
    }
  ]
}
```

#### POST `/auth/logout`
Logout user by revoking refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "refresh_token": "abc123def456..."
}
```

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

### User Management Endpoints

#### GET `/users/`
List all users (requires `users:read` permission).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `skip` (int, default: 0): Number of records to skip
- `limit` (int, default: 100): Maximum number of records

**Response (200):**
```json
[
  {
    "id": 1,
    "email": "user1@example.com",
    "username": "user1",
    "full_name": "User One",
    "is_active": true,
    "roles": [...]
  },
  {
    "id": 2, 
    "email": "user2@example.com",
    "username": "user2",
    "full_name": "User Two", 
    "is_active": true,
    "roles": [...]
  }
]
```

#### GET `/users/{user_id}`
Get user by ID (requires `users:read` permission).

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "username",
  "full_name": "John Doe", 
  "is_active": true,
  "roles": [...]
}
```

### Admin Endpoints

#### GET `/admin/roles`
List all roles (superuser only).

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "user",
    "description": "Standard user role",
    "is_active": true,
    "permissions": [...]
  },
  {
    "id": 2,
    "name": "admin", 
    "description": "Administrator role",
    "is_active": true,
    "permissions": [...]
  }
]
```

#### POST `/admin/roles`
Create new role (superuser only).

**Request:**
```json
{
  "name": "moderator",
  "description": "Moderator role",
  "is_active": true,
  "permission_ids": [1, 2, 3]
}
```

**Response (201):**
```json
{
  "id": 3,
  "name": "moderator", 
  "description": "Moderator role",
  "is_active": true,
  "permissions": [...]
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "detail": "Password does not meet security requirements"
}
```

#### 401 Unauthorized (OAuth2 compliant)
```json
{
  "detail": "invalid_grant"
}
```

#### 403 Forbidden
```json
{
  "detail": "Not enough permissions"
}
```

#### 409 Conflict
```json
{
  "detail": "User with this email already exists"
}
```

#### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

#### 429 Too Many Requests
```json
{
  "detail": "Rate limit exceeded. Please try again later.",
  "retry_after": 60
}
```

---

## 📞 Support & Resources

- **Project Repository**: [https://github.com/NickB03/vana](https://github.com/NickB03/vana)
- **FastAPI Documentation**: [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)
- **OAuth2 Specification**: [https://tools.ietf.org/html/rfc6749](https://tools.ietf.org/html/rfc6749)
- **JWT.io**: [https://jwt.io/](https://jwt.io/)
- **Google Cloud IAM**: [https://cloud.google.com/iam/docs](https://cloud.google.com/iam/docs)

**Authentication System Version**: v1.0.0  
**Last Updated**: January 2025  
**Maintainer**: Vana Development Team

---

*This documentation covers the comprehensive authentication and authorization system for the Vana project. For additional support or feature requests, please open an issue in the project repository.*
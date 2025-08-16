"""Authentication middleware for FastAPI."""

import time
from collections import defaultdict

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware for authentication endpoints."""

    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.clients: dict[str, list] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        # Only apply rate limiting to auth endpoints
        if not request.url.path.startswith("/auth/"):
            return await call_next(request)

        client_ip = self.get_client_ip(request)
        now = time.time()

        # Clean old entries
        self.clients[client_ip] = [
            timestamp for timestamp in self.clients[client_ip]
            if now - timestamp < self.period
        ]

        # Check rate limit
        if len(self.clients[client_ip]) >= self.calls:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after": self.period
                }
            )

        # Add current request
        self.clients[client_ip].append(now)

        return await call_next(request)

    def get_client_ip(self, request: Request) -> str:
        """Get client IP address from request."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        return request.client.host if request.client else "unknown"


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy for API endpoints
        if request.url.path.startswith("/auth/") or request.url.path.startswith("/api/"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; "
                "frame-ancestors 'none'; "
                "form-action 'none'; "
                "base-uri 'none'"
            )

        return response


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """Authentication middleware to handle JWT tokens."""

    def __init__(self, app, excluded_paths: list | None = None):
        super().__init__(app)
        self.excluded_paths = excluded_paths or [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/auth/login",
            "/auth/register",
            "/auth/refresh",
            "/auth/forgot-password",
            "/auth/reset-password",
        ]

    async def dispatch(self, request: Request, call_next):
        # Skip authentication for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)

        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Check for Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Authorization header required"},
                headers={"WWW-Authenticate": "Bearer"}
            )

        try:
            # Add user to request state if authentication succeeds
            # The actual user validation is done in the dependency injection
            request.state.authenticated = True
            return await call_next(request)
        except Exception:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid authentication credentials"},
                headers={"WWW-Authenticate": "Bearer"}
            )


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Audit logging middleware for security-sensitive operations."""

    def __init__(self, app, log_paths: list | None = None):
        super().__init__(app)
        self.log_paths = log_paths or [
            "/auth/",
            "/admin/",
            "/users/"
        ]

    async def dispatch(self, request: Request, call_next):
        # Only log specific paths
        should_log = any(request.url.path.startswith(path) for path in self.log_paths)

        if not should_log:
            return await call_next(request)

        start_time = time.time()
        client_ip = self.get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "Unknown")

        # Get user info if available
        user_info = "anonymous"
        try:
            # This is a simplified approach - in production you'd want to
            # extract user info from the JWT token in the Authorization header
            if hasattr(request.state, "user"):
                user_info = f"user:{request.state.user.id}"
        except:
            pass

        response = await call_next(request)

        duration = time.time() - start_time

        # Log the request (in production, send to your logging system)
        log_data = {
            "timestamp": time.time(),
            "method": request.method,
            "path": str(request.url.path),
            "query_params": str(request.query_params),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "user": user_info,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2)
        }

        # In production, you would send this to your logging system
        # For now, we'll just store it in request state
        if not hasattr(request.state, "audit_logs"):
            request.state.audit_logs = []
        request.state.audit_logs.append(log_data)

        return response

    def get_client_ip(self, request: Request) -> str:
        """Get client IP address from request."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        return request.client.host if request.client else "unknown"


class CORSMiddleware(BaseHTTPMiddleware):
    """Custom CORS middleware with security considerations."""

    def __init__(self, app, allowed_origins: list | None = None,
                 allowed_methods: list | None = None,
                 allowed_headers: list | None = None):
        super().__init__(app)
        self.allowed_origins = allowed_origins or ["http://localhost:5173"]
        self.allowed_methods = allowed_methods or ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        self.allowed_headers = allowed_headers or [
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Requested-With"
        ]

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("Origin")

        # Handle preflight requests
        if request.method == "OPTIONS":
            response = JSONResponse(content={})
        else:
            response = await call_next(request)

        # Add CORS headers if origin is allowed
        if origin and (origin in self.allowed_origins or "*" in self.allowed_origins):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allowed_methods)
            response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allowed_headers)
            response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours

        return response

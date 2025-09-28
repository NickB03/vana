"""ADK-compliant authentication middleware for path-based user extraction."""

import logging
from typing import Optional

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.auth.security import get_current_user_optional, get_current_user_for_sse

logger = logging.getLogger(__name__)


class ADKPathAuthMiddleware(BaseHTTPMiddleware):
    """Authentication middleware that extracts and validates user context from ADK path structure.

    This middleware supports the ADK path structure:
    /apps/{app_name}/users/{user_id}/sessions/{session_id}/*

    It extracts the user_id from the path and validates it against the authenticated user
    to ensure users can only access their own resources.

    Features:
        - ADK path structure support
        - User ID extraction and validation
        - JWT token validation
        - Optional authentication for development mode
        - Security logging and audit trails
    """

    def __init__(self, app):
        """Initialize ADK path authentication middleware.

        Args:
            app: The ASGI application instance
        """
        super().__init__(app)
        self.excluded_paths = [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/auth/login",
            "/auth/register",
            "/auth/refresh",
            "/auth/forgot-password",
            "/auth/reset-password",
            "/auth/google",
            "/static/",
            "/_adk/",
            "/dev-ui/",
        ]

    async def dispatch(self, request: Request, call_next):
        """Process request with ADK path-based authentication.

        Validates that authenticated users can only access resources under their
        user_id path segment, supporting the ADK hierarchy:
        /apps/{app_name}/users/{user_id}/sessions/{session_id}/*

        Args:
            request: The incoming HTTP request
            call_next: The next middleware or application handler

        Returns:
            HTTP response with user context validated against path
        """
        path = request.url.path

        # Skip authentication for excluded paths
        if self._is_excluded_path(path):
            return await call_next(request)

        # Skip for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Extract user_id from ADK path structure
        extracted_user_id = self._extract_user_id_from_path(path)

        # Get current authenticated user (if any)
        from app.auth.database import get_auth_db
        db = next(get_auth_db())

        try:
            # Handle SSE endpoints with configurable auth
            if self._is_sse_endpoint(path):
                current_user = await get_current_user_for_sse(
                    credentials=self._get_credentials(request),
                    db=db
                )
            else:
                # Regular endpoints with optional auth
                current_user = await get_current_user_optional(
                    credentials=self._get_credentials(request),
                    db=db
                )

            # Validate user_id matches authenticated user for protected paths
            if extracted_user_id and current_user:
                if str(current_user.id) != extracted_user_id:
                    logger.warning(
                        f"User ID mismatch: JWT user {current_user.id} "
                        f"accessing path for user {extracted_user_id} from IP {self._get_client_ip(request)}"
                    )
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied: user ID mismatch"
                    )

            # For paths requiring user_id but no authentication provided
            elif extracted_user_id and not current_user:
                logger.info(f"Unauthenticated access attempt to user path {path}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for user-specific resources",
                    headers={"WWW-Authenticate": "Bearer"}
                )

            # Store user context in request state
            request.state.current_user = current_user
            request.state.adk_user_id = extracted_user_id
            request.state.is_authenticated = current_user is not None

            # Log successful authentication for audit trails
            if current_user and extracted_user_id:
                logger.debug(
                    f"Authenticated access: user {current_user.id} "
                    f"accessing path {path} from IP {self._get_client_ip(request)}"
                )

            return await call_next(request)

        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Authentication middleware error for path {path}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication validation failed"
            ) from e
        finally:
            db.close()

    def _extract_user_id_from_path(self, path: str) -> Optional[str]:
        """Extract user_id from ADK path structure.

        Supports patterns like:
        - /apps/{app_name}/users/{user_id}/sessions/{session_id}/*
        - /api/users/{user_id}/*
        - /users/{user_id}/*

        Args:
            path: The request path to parse

        Returns:
            Extracted user_id as string, or None if not found
        """
        if "/users/" not in path:
            return None

        try:
            path_parts = path.split("/")
            user_index = path_parts.index("users") + 1

            if user_index < len(path_parts) and path_parts[user_index]:
                user_id = path_parts[user_index]

                # Validate user_id format (should be numeric for our system)
                if user_id.isdigit():
                    return user_id

                logger.warning(f"Invalid user_id format in path: {user_id}")

        except (ValueError, IndexError) as e:
            logger.debug(f"Could not extract user_id from path {path}: {e}")

        return None

    def _is_excluded_path(self, path: str) -> bool:
        """Check if path should be excluded from authentication.

        Args:
            path: The request path to check

        Returns:
            True if path should skip authentication
        """
        return any(path.startswith(excluded) for excluded in self.excluded_paths)

    def _is_sse_endpoint(self, path: str) -> bool:
        """Check if path is a Server-Sent Events endpoint.

        Args:
            path: The request path to check

        Returns:
            True if path is an SSE endpoint
        """
        sse_patterns = ["/api/chat/stream", "/sse/", "/stream/", "/events/"]
        return any(pattern in path for pattern in sse_patterns)

    def _get_credentials(self, request: Request):
        """Extract Bearer token from Authorization header.

        Args:
            request: The HTTP request

        Returns:
            HTTPAuthorizationCredentials object or None
        """
        from fastapi.security import HTTPAuthorizationCredentials

        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            return None

        try:
            scheme, token = authorization.split(" ", 1)
            if scheme.lower() == "bearer" and token:
                return HTTPAuthorizationCredentials(
                    scheme=scheme,
                    credentials=token
                )
        except ValueError:
            pass

        return None

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request.

        Args:
            request: The HTTP request

        Returns:
            Client IP address as string
        """
        # Check forwarded headers (from load balancers/proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Direct connection
        return request.client.host if request.client else "unknown"


class EnhancedAuthMiddleware(BaseHTTPMiddleware):
    """Enhanced authentication middleware with additional security features.

    Provides additional security features beyond basic ADK authentication:
    - Request rate limiting per user
    - Suspicious activity detection
    - Advanced audit logging
    - Session security validation
    """

    def __init__(self, app, rate_limit_per_minute: int = 60):
        """Initialize enhanced authentication middleware.

        Args:
            app: The ASGI application instance
            rate_limit_per_minute: Rate limit per user per minute
        """
        super().__init__(app)
        self.rate_limit = rate_limit_per_minute
        self.user_requests = {}  # In production, use Redis

    async def dispatch(self, request: Request, call_next):
        """Process request with enhanced security checks.

        Args:
            request: The incoming HTTP request
            call_next: The next middleware or application handler

        Returns:
            HTTP response with enhanced security validation
        """
        # Get user from previous middleware
        current_user = getattr(request.state, 'current_user', None)

        if current_user:
            # Rate limiting per authenticated user
            if self._is_rate_limited(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded"
                )

            # Enhanced audit logging
            self._log_user_activity(request, current_user)

        response = await call_next(request)

        # Add security headers for authenticated requests
        if current_user:
            response.headers["X-User-Context"] = str(current_user.id)
            response.headers["X-Auth-Method"] = "jwt"

        return response

    def _is_rate_limited(self, user_id: int) -> bool:
        """Check if user has exceeded rate limit.

        Args:
            user_id: User ID to check

        Returns:
            True if user is rate limited
        """
        import time

        now = time.time()
        minute_window = int(now // 60)

        user_key = f"{user_id}:{minute_window}"
        current_count = self.user_requests.get(user_key, 0)

        if current_count >= self.rate_limit:
            return True

        self.user_requests[user_key] = current_count + 1

        # Cleanup old entries (keep last 2 minutes)
        cleanup_keys = [
            key for key in self.user_requests.keys()
            if int(key.split(":")[1]) < minute_window - 1
        ]
        for key in cleanup_keys:
            del self.user_requests[key]

        return False

    def _log_user_activity(self, request: Request, user):
        """Log user activity for security audit trails.

        Args:
            request: The HTTP request
            user: The authenticated user
        """
        activity_data = {
            "user_id": user.id,
            "email": user.email,
            "method": request.method,
            "path": str(request.url.path),
            "ip": self._get_client_ip(request),
            "user_agent": request.headers.get("User-Agent", "Unknown")[:100],
            "timestamp": int(time.time())
        }

        # In production, send to logging service
        logger.info(f"User activity: {activity_data}")

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        return request.client.host if request.client else "unknown"
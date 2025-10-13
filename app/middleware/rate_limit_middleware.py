"""
Rate Limiting Middleware for DoS Protection

Implements per-IP rate limiting with configurable limits per endpoint.
Uses in-memory storage with automatic cleanup of old entries.

Security Benefits:
- Prevents brute force attacks on authentication
- Protects against DoS via validation-heavy endpoints
- Prevents credential stuffing
- Limits resource exhaustion
"""

import time
from collections import defaultdict, deque
from typing import Dict, Deque, Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from starlette.responses import JSONResponse
import threading


class RateLimiter:
    """
    Token bucket rate limiter with per-IP tracking.

    How it works:
    - Each IP gets a token bucket
    - Tokens regenerate over time
    - Request consumes one token
    - No tokens = rate limit exceeded
    """

    def __init__(self, requests: int, window_seconds: int):
        """
        Initialize rate limiter.

        Args:
            requests: Maximum requests allowed in time window
            window_seconds: Time window in seconds
        """
        self.max_requests = requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, Deque[float]] = defaultdict(deque)
        self.lock = threading.Lock()

    def is_allowed(self, client_ip: str) -> Tuple[bool, int]:
        """
        Check if request is allowed for given IP.

        Args:
            client_ip: Client IP address

        Returns:
            Tuple of (is_allowed: bool, retry_after: int)
        """
        with self.lock:
            now = time.time()
            window_start = now - self.window_seconds

            # Get or create request queue for this IP
            request_times = self.requests[client_ip]

            # Remove requests outside the time window
            while request_times and request_times[0] < window_start:
                request_times.popleft()

            # Check if under limit
            if len(request_times) < self.max_requests:
                request_times.append(now)
                return True, 0

            # Calculate retry-after (time until oldest request expires)
            oldest_request = request_times[0]
            retry_after = int(oldest_request + self.window_seconds - now) + 1

            return False, retry_after

    def cleanup_old_ips(self, max_age_seconds: int = 3600):
        """Remove IP entries with no recent requests."""
        with self.lock:
            now = time.time()
            cutoff = now - max_age_seconds

            ips_to_remove = [
                ip for ip, times in self.requests.items()
                if not times or times[-1] < cutoff
            ]

            for ip in ips_to_remove:
                del self.requests[ip]


# Per-endpoint rate limiters with different limits
RATE_LIMITERS = {
    # Authentication endpoints - strict limits
    "/api/auth/login": RateLimiter(requests=5, window_seconds=60),
    "/api/auth/register": RateLimiter(requests=3, window_seconds=3600),
    "/auth/forgot-password": RateLimiter(requests=3, window_seconds=3600),

    # API endpoints - moderate limits
    "/api/sessions": RateLimiter(requests=60, window_seconds=60),
    "/api/messages": RateLimiter(requests=60, window_seconds=60),

    # Default for all other endpoints
    "default": RateLimiter(requests=100, window_seconds=60),
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware with per-endpoint configuration.

    How it works:
    1. Extract client IP from request
    2. Check rate limit for the endpoint
    3. Allow or block based on current usage
    4. Return 429 with Retry-After header if blocked
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        # Start cleanup task
        self._start_cleanup_task()

    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = self._get_client_ip(request)

        # Get rate limiter for this endpoint
        rate_limiter = self._get_rate_limiter(request.url.path)

        # Check rate limit
        is_allowed, retry_after = rate_limiter.is_allowed(client_ip)

        if not is_allowed:
            # Return 429 response directly with rate limit headers
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(rate_limiter.max_requests),
                "X-RateLimit-Window": str(rate_limiter.window_seconds)
            }
            return JSONResponse(
                status_code=429,
                content={
                    "detail": {
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Please try again in {retry_after} seconds.",
                        "retry_after": retry_after
                    }
                },
                headers=headers
            )

        # Request allowed, proceed
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(rate_limiter.max_requests)
        response.headers["X-RateLimit-Window"] = str(rate_limiter.window_seconds)

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxies."""
        # Check X-Forwarded-For header (for proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take first IP (original client)
            return forwarded.split(",")[0].strip()

        # Fallback to direct connection
        return request.client.host if request.client else "unknown"

    def _get_rate_limiter(self, path: str) -> RateLimiter:
        """Get rate limiter for specific path or default."""
        # Check exact path match
        if path in RATE_LIMITERS:
            return RATE_LIMITERS[path]

        # Check prefix match (e.g., /api/auth/*)
        for pattern, limiter in RATE_LIMITERS.items():
            if pattern != "default" and path.startswith(pattern):
                return limiter

        # Use default rate limiter
        return RATE_LIMITERS["default"]

    def _start_cleanup_task(self):
        """Start background task to clean up old IP entries."""
        import asyncio

        async def cleanup_loop():
            while True:
                await asyncio.sleep(300)  # Run every 5 minutes
                for limiter in RATE_LIMITERS.values():
                    limiter.cleanup_old_ips()

        # Note: This is a simplified version. In production, use a proper
        # background task manager like APScheduler or Celery.
        try:
            asyncio.create_task(cleanup_loop())
        except RuntimeError:
            # No event loop in test environment, skip cleanup
            pass

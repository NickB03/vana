"""
Rate Limiting Security Module for VANA
Provides rate limiting to prevent abuse and ensure fair resource usage
"""

import hashlib
import json
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from functools import wraps
from typing import Any, Callable, Dict, Optional, Tuple

# Using in-memory rate limiting for development - Redis dependency removed
from lib.logging_config import get_logger

logger = get_logger("vana.security.rate_limiter")


class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded"""

    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after


class RateLimiter:
    """Thread-safe rate limiter with multiple algorithms"""

    def __init__(
        self, requests_per_minute: int = 60, requests_per_hour: int = 1000, burst_size: int = 10, use_redis: bool = False
    ):
        """
        Initialize rate limiter

        Args:
            requests_per_minute: Max requests per minute
            requests_per_hour: Max requests per hour
            burst_size: Max burst requests allowed
            use_redis: Use Redis for distributed rate limiting (default: False for Phase 1)
        """
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self.burst_size = burst_size
        self.use_redis = use_redis

        # Local storage for rate limiting
        self._request_history = defaultdict(deque)
        self._token_buckets = defaultdict(lambda: {"tokens": burst_size, "last_refill": time.time()})
        self._lock = threading.Lock()

        # Redis cache for distributed rate limiting
        if self.use_redis:
            self._redis = None  # Redis disabled
            logger.info("Using Redis for distributed rate limiting")
        else:
            self._redis = None
            logger.info("Using in-memory rate limiting")

    def check_rate_limit(self, identifier: str, resource: str = "default", cost: int = 1) -> Tuple[bool, Optional[int]]:
        """
        Check if request is within rate limits

        Args:
            identifier: Unique identifier (user_id, IP, etc.)
            resource: Resource being accessed
            cost: Cost of this request (default 1)

        Returns:
            Tuple of (allowed, retry_after_seconds)
        """
        if self.use_redis:
            return self._check_redis_rate_limit(identifier, resource, cost)
        else:
            return self._check_local_rate_limit(identifier, resource, cost)

    def _check_local_rate_limit(self, identifier: str, resource: str, cost: int) -> Tuple[bool, Optional[int]]:
        """Check rate limit using local storage"""
        with self._lock:
            key = f"{identifier}:{resource}"
            current_time = time.time()

            # Token bucket algorithm for burst handling
            bucket = self._token_buckets[key]

            # Refill tokens based on time passed
            time_passed = current_time - bucket["last_refill"]
            tokens_to_add = time_passed * (self.requests_per_minute / 60.0)

            bucket["tokens"] = min(self.burst_size, bucket["tokens"] + tokens_to_add)
            bucket["last_refill"] = current_time

            # Check if enough tokens available
            if bucket["tokens"] >= cost:
                bucket["tokens"] -= cost

                # Also check sliding window for minute/hour limits
                history = self._request_history[key]

                # Remove old entries
                minute_ago = current_time - 60
                hour_ago = current_time - 3600

                while history and history[0] < hour_ago:
                    history.popleft()

                # Count requests in windows
                minute_count = sum(1 for t in history if t > minute_ago)
                hour_count = len(history)

                # Check limits
                if minute_count >= self.requests_per_minute:
                    retry_after = 60 - (current_time - minute_ago)
                    return False, int(retry_after)

                if hour_count >= self.requests_per_hour:
                    retry_after = 3600 - (current_time - hour_ago)
                    return False, int(retry_after)

                # Add current request to history
                history.append(current_time)

                return True, None
            else:
                # Calculate when tokens will be available
                tokens_needed = cost - bucket["tokens"]
                seconds_until_refill = tokens_needed / (self.requests_per_minute / 60.0)
                return False, int(seconds_until_refill)

    def _check_redis_rate_limit(self, identifier: str, resource: str, cost: int) -> Tuple[bool, Optional[int]]:
        """Check rate limit using Redis"""
        try:
            current_time = int(time.time())

            # Keys for different time windows
            minute_key = f"rate_limit:{identifier}:{resource}:minute:{current_time // 60}"
            hour_key = f"rate_limit:{identifier}:{resource}:hour:{current_time // 3600}"
            token_key = f"rate_limit:{identifier}:{resource}:tokens"

            # Check minute limit
            minute_count = self._redis.get("rate_limiter", minute_key)
            if minute_count:
                minute_count = int(minute_count)
                if minute_count >= self.requests_per_minute:
                    retry_after = 60 - (current_time % 60)
                    return False, retry_after

            # Check hour limit
            hour_count = self._redis.get("rate_limiter", hour_key)
            if hour_count:
                hour_count = int(hour_count)
                if hour_count >= self.requests_per_hour:
                    retry_after = 3600 - (current_time % 3600)
                    return False, retry_after

            # Update counters (would use Redis pipeline in production)
            new_minute_count = (minute_count or 0) + cost
            new_hour_count = (hour_count or 0) + cost

            self._redis.set("rate_limiter", minute_key, new_minute_count, ttl=60)
            self._redis.set("rate_limiter", hour_key, new_hour_count, ttl=3600)

            return True, None

        except Exception as e:
            logger.error(f"Redis rate limit error: {e}, falling back to local")
            return self._check_local_rate_limit(identifier, resource, cost)

    def reset_limits(self, identifier: str, resource: str = "default"):
        """Reset rate limits for an identifier"""
        key = f"{identifier}:{resource}"

        with self._lock:
            if key in self._request_history:
                del self._request_history[key]
            if key in self._token_buckets:
                self._token_buckets[key] = {"tokens": self.burst_size, "last_refill": time.time()}

        if self.use_redis:
            # Clear Redis keys
            current_time = int(time.time())
            minute_key = f"rate_limit:{identifier}:{resource}:minute:{current_time // 60}"
            hour_key = f"rate_limit:{identifier}:{resource}:hour:{current_time // 3600}"

            self._redis.delete("rate_limiter", minute_key)
            self._redis.delete("rate_limiter", hour_key)

    def get_remaining_quota(self, identifier: str, resource: str = "default") -> Dict[str, int]:
        """Get remaining quota for an identifier"""
        key = f"{identifier}:{resource}"
        current_time = time.time()

        with self._lock:
            # Get token bucket info
            bucket = self._token_buckets.get(key, {"tokens": self.burst_size})

            # Get request history
            history = self._request_history.get(key, deque())

            minute_ago = current_time - 60
            hour_ago = current_time - 3600

            minute_count = sum(1 for t in history if t > minute_ago)
            hour_count = sum(1 for t in history if t > hour_ago)

            return {
                "tokens_available": int(bucket.get("tokens", 0)),
                "requests_per_minute_remaining": max(0, self.requests_per_minute - minute_count),
                "requests_per_hour_remaining": max(0, self.requests_per_hour - hour_count),
            }


class SpecialistRateLimiter(RateLimiter):
    """Specialized rate limiter for different specialist types"""

    # Different limits for different specialists
    SPECIALIST_LIMITS = {
        "security": {
            "requests_per_minute": 30,  # Security scans are intensive
            "requests_per_hour": 500,
            "burst_size": 5,
        },
        "data_science": {
            "requests_per_minute": 20,  # Data analysis is compute-heavy
            "requests_per_hour": 300,
            "burst_size": 3,
        },
        "architecture": {"requests_per_minute": 40, "requests_per_hour": 600, "burst_size": 8},
        "devops": {
            "requests_per_minute": 25,  # Deployment operations need care
            "requests_per_hour": 400,
            "burst_size": 5,
        },
        "qa": {"requests_per_minute": 50, "requests_per_hour": 800, "burst_size": 10},
        "ui": {"requests_per_minute": 60, "requests_per_hour": 1000, "burst_size": 15},
    }

    def __init__(self, specialist_type: str, custom_limits: Optional[Dict[str, int]] = None):
        """Initialize specialist-specific rate limiter"""
        limits = self.SPECIALIST_LIMITS.get(
            specialist_type, {"requests_per_minute": 40, "requests_per_hour": 600, "burst_size": 10}
        )

        if custom_limits:
            limits.update(custom_limits)

        super().__init__(
            requests_per_minute=limits["requests_per_minute"],
            requests_per_hour=limits["requests_per_hour"],
            burst_size=limits["burst_size"],
        )

        self.specialist_type = specialist_type
        logger.info(f"Initialized rate limiter for {specialist_type} specialist")


# Rate limiting decorator
def rate_limit(
    requests_per_minute: int = 60,
    requests_per_hour: int = 1000,
    burst_size: int = 10,
    key_func: Optional[Callable] = None,
    resource: str = "default",
):
    """
    Decorator for rate limiting functions

    Args:
        requests_per_minute: Max requests per minute
        requests_per_hour: Max requests per hour
        burst_size: Burst capacity
        key_func: Function to extract identifier from arguments
        resource: Resource name
    """
    limiter = RateLimiter(requests_per_minute, requests_per_hour, burst_size)

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Extract identifier
            if key_func:
                identifier = key_func(*args, **kwargs)
            else:
                # Default: use first argument as identifier
                identifier = str(args[0]) if args else "anonymous"

            # Check rate limit
            allowed, retry_after = limiter.check_rate_limit(identifier, resource)

            if not allowed:
                raise RateLimitExceeded(f"Rate limit exceeded for {identifier}", retry_after=retry_after)

            # Execute function
            return func(*args, **kwargs)

        # Attach limiter for introspection
        wrapper.rate_limiter = limiter
        return wrapper

    return decorator


# Global rate limiters
_global_limiter = None
_specialist_limiters = {}


def get_global_limiter() -> RateLimiter:
    """Get global rate limiter"""
    global _global_limiter
    if _global_limiter is None:
        _global_limiter = RateLimiter(requests_per_minute=100, requests_per_hour=2000, burst_size=20)
    return _global_limiter


def get_specialist_limiter(specialist_type: str) -> SpecialistRateLimiter:
    """Get specialist-specific rate limiter"""
    global _specialist_limiters
    if specialist_type not in _specialist_limiters:
        _specialist_limiters[specialist_type] = SpecialistRateLimiter(specialist_type)
    return _specialist_limiters[specialist_type]


def check_rate_limit(identifier: str, resource: str = "default") -> None:
    """
    Check global rate limit

    Args:
        identifier: User/client identifier
        resource: Resource being accessed

    Raises:
        RateLimitExceeded: If rate limit exceeded
    """
    limiter = get_global_limiter()
    allowed, retry_after = limiter.check_rate_limit(identifier, resource)

    if not allowed:
        raise RateLimitExceeded(f"Rate limit exceeded for {identifier}", retry_after=retry_after)


# Export public API
__all__ = [
    "RateLimitExceeded",
    "RateLimiter",
    "SpecialistRateLimiter",
    "rate_limit",
    "get_global_limiter",
    "get_specialist_limiter",
    "check_rate_limit",
]

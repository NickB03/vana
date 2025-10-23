"""
Rate limiting utilities for API requests.

This module provides rate limiting to prevent overwhelming external APIs
with too many concurrent requests.
"""

import asyncio
import time
from collections import deque
from datetime import datetime
from typing import Any, Awaitable, Callable, Optional, Type
from types import TracebackType
import logging

logger = logging.getLogger(__name__)


class AsyncRateLimiter:
    """
    Asynchronous rate limiter with token bucket algorithm.

    Ensures requests don't exceed a specified rate limit while allowing
    bursts up to the bucket capacity.
    """

    def __init__(
        self,
        max_requests: int = 10,
        time_window: float = 60.0,
        max_concurrent: int = 3
    ):
        """
        Initialize rate limiter.

        Args:
            max_requests: Maximum requests allowed in time_window
            time_window: Time window in seconds
            max_concurrent: Maximum concurrent requests
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.max_concurrent = max_concurrent

        # Token bucket for rate limiting
        self.tokens = max_requests
        self.last_refill = time.time()
        self.refill_rate = max_requests / time_window

        # Semaphore for concurrent request limiting
        self.semaphore = asyncio.Semaphore(max_concurrent)

        # Request history for monitoring
        self.request_times: deque[float] = deque(maxlen=max_requests * 2)

        # Lock for thread safety
        self.lock = asyncio.Lock()

        logger.info(
            f"Rate limiter initialized: {max_requests} req/{time_window}s, "
            f"max concurrent: {max_concurrent}"
        )

    def _refill_tokens(self) -> None:
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self.last_refill

        # Add tokens based on refill rate
        tokens_to_add = elapsed * self.refill_rate
        self.tokens = min(self.max_requests, self.tokens + tokens_to_add)
        self.last_refill = now

    async def acquire(self, timeout: Optional[float] = None) -> bool:
        """
        Acquire permission to make a request.

        Args:
            timeout: Maximum time to wait in seconds (None = wait forever)

        Returns:
            True if acquired, False if timeout
        """
        start_time = time.time()

        while True:
            async with self.lock:
                self._refill_tokens()

                if self.tokens >= 1.0:
                    self.tokens -= 1.0
                    self.request_times.append(time.time())
                    logger.debug(f"Token acquired. Remaining: {self.tokens:.2f}")
                    return True

            # Check timeout
            if timeout is not None:
                elapsed = time.time() - start_time
                if elapsed >= timeout:
                    logger.warning(f"Rate limiter timeout after {elapsed:.2f}s")
                    return False

            # Wait before retrying
            await asyncio.sleep(0.1)

    async def __aenter__(self) -> "AsyncRateLimiter":
        """Context manager entry - acquire token and semaphore.

        CRITICAL FIX: Removed timeout on semaphore.acquire() to prevent deadlock.
        If a timeout is needed, it should be handled by the caller's task cancellation,
        not by asyncio.wait_for() which can cause semaphore leaks.
        """
        logger.info(
            f"Rate limiter entry: tokens={self.tokens:.2f}, "
            f"semaphore_slots={self.semaphore._value}/{self.max_concurrent}"
        )

        # First acquire rate limit token
        acquired = await self.acquire(timeout=30.0)
        if not acquired:
            raise TimeoutError("Rate limiter timeout - too many requests")

        # Then acquire concurrency semaphore WITHOUT timeout
        # CRITICAL FIX: Use try/finally to guarantee token release on any failure
        try:
            # Let the caller's task cancellation handle timeouts naturally
            await self.semaphore.acquire()
            logger.debug(
                f"Semaphore acquired. Available slots: {self.semaphore._value}"
            )
        except asyncio.CancelledError:
            # Task was cancelled - release the rate limit token
            async with self.lock:
                self.tokens = min(self.max_requests, self.tokens + 1.0)
            logger.warning("Semaphore acquisition cancelled, token released")
            raise
        except Exception as e:
            # Any other exception - release token to prevent resource leaks
            async with self.lock:
                self.tokens = min(self.max_requests, self.tokens + 1.0)
            logger.error(f"Semaphore acquisition failed: {e}", exc_info=True)
            raise

        return self

    async def __aexit__(
        self,
        exc_type: Optional[Type[BaseException]],
        exc_val: Optional[BaseException],
        exc_tb: Optional[TracebackType]
    ) -> None:
        """Context manager exit - release semaphore."""
        try:
            self.semaphore.release()
            logger.debug(
                f"Semaphore released. Available slots: {self.semaphore._value}"
            )
            logger.info(
                f"Rate limiter exit: tokens={self.tokens:.2f}, "
                f"semaphore_slots={self.semaphore._value}/{self.max_concurrent}"
            )
        except ValueError as e:
            # Semaphore.release() raises ValueError if called too many times
            logger.error(f"Error releasing semaphore (already released?): {e}")
        except Exception as e:
            logger.error(f"Unexpected error releasing semaphore: {e}", exc_info=True)

    async def get_stats(self) -> dict[str, Any]:
        """Get current rate limiter statistics."""
        async with self.lock:
            self._refill_tokens()

            now = time.time()
            recent_requests = sum(
                1 for t in self.request_times
                if now - t < self.time_window
            )

            concurrent_slots_available = self.semaphore._value
            concurrent_slots_in_use = self.max_concurrent - concurrent_slots_available

            return {
                "available_tokens": self.tokens,
                "max_tokens": self.max_requests,
                "time_window": self.time_window,
                "recent_requests": recent_requests,
                "concurrent_slots_available": concurrent_slots_available,
                "concurrent_slots_in_use": concurrent_slots_in_use,
                "max_concurrent": self.max_concurrent,
                "is_semaphore_full": concurrent_slots_available == 0,
                "semaphore_utilization_percent": (concurrent_slots_in_use / self.max_concurrent) * 100,
            }


class ExponentialBackoff:
    """
    Exponential backoff for retry logic.

    Increases wait time exponentially with each retry, useful for
    handling temporary API rate limits (429 errors).
    """

    def __init__(
        self,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        """
        Initialize exponential backoff.

        Args:
            base_delay: Initial delay in seconds
            max_delay: Maximum delay in seconds
            exponential_base: Multiplier for each retry
            jitter: Add random jitter to prevent thundering herd
        """
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.attempt = 0

    def get_delay(self) -> float:
        """Calculate delay for current attempt."""
        import random

        # Calculate exponential delay
        delay = min(
            self.base_delay * (self.exponential_base ** self.attempt),
            self.max_delay
        )

        # Add jitter (0-25% of delay)
        if self.jitter:
            jitter_amount = random.uniform(0, delay * 0.25)
            delay += jitter_amount

        return delay

    async def wait(self) -> None:
        """Wait for the calculated delay."""
        delay = self.get_delay()
        logger.info(f"Backoff attempt {self.attempt + 1}: waiting {delay:.2f}s")
        await asyncio.sleep(delay)
        self.attempt += 1

    def reset(self) -> None:
        """Reset attempt counter."""
        self.attempt = 0


# Global rate limiter instance for Gemini API
#
# Conservative settings optimized for Gemini Free Tier (portfolio project):
# - max_requests: 8 requests per minute (buffer under 15 RPM free tier limit)
# - time_window: 60 seconds (1 minute)
# - max_concurrent: 2 concurrent requests (safe for free tier demos)
#
# Gemini Free Tier Limits (2024/2025):
# - Gemini 1.5 Flash: 15 RPM, 1M tokens/min, 1500 requests/day
# - Gemini 1.5 Pro: 2 RPM, 32K tokens/day
#
# These conservative limits ensure:
# - Reliable portfolio demo performance
# - No 503 "model overloaded" errors during presentations
# - Headroom for API quota variations
#
# To adjust for paid tiers:
# - Standard tier: Increase to max_requests=30, max_concurrent=5
# - Enterprise: Consult API documentation for limits
gemini_rate_limiter = AsyncRateLimiter(
    max_requests=8,     # Conservative: 8 RPM (leaves buffer under 15 RPM limit)
    time_window=60.0,
    max_concurrent=2    # Safe for free tier - prevents overwhelming API
)


class DailyQuotaTracker:
    """
    Daily quota tracker for API requests (portfolio free-tier protection).

    Tracks daily request count and automatically resets at midnight.
    Useful for preventing exhaustion of Gemini free tier daily limits
    (1500 requests/day for Flash, lower for Pro).
    """

    def __init__(self, max_daily_requests: int = 1000):
        """
        Initialize daily quota tracker.

        Args:
            max_daily_requests: Maximum requests allowed per day (default: 1000)
                               Conservative default leaves headroom under 1500/day limit
        """
        self.max_requests = max_daily_requests
        self.request_count = 0
        self.reset_date = datetime.now().date()
        logger.info(
            f"Daily quota tracker initialized: {max_daily_requests} requests/day"
        )

    def check_quota(self) -> bool:
        """
        Check if under daily quota.

        Returns:
            True if under quota, False if exceeded

        Side effects:
            Resets counter if new day detected
        """
        # Reset counter at midnight
        current_date = datetime.now().date()
        if current_date > self.reset_date:
            logger.info(
                f"Daily quota reset: {self.request_count} requests used yesterday"
            )
            self.request_count = 0
            self.reset_date = current_date

        is_under_quota = self.request_count < self.max_requests
        if not is_under_quota:
            logger.warning(
                f"Daily quota exceeded: {self.request_count}/{self.max_requests}"
            )
        return is_under_quota

    def increment(self) -> None:
        """Increment request counter."""
        self.request_count += 1
        if self.request_count % 100 == 0:  # Log every 100 requests
            logger.info(
                f"Daily quota usage: {self.request_count}/{self.max_requests} "
                f"({(self.request_count / self.max_requests * 100):.1f}%)"
            )

    def get_remaining(self) -> int:
        """Get remaining requests for today."""
        self.check_quota()  # Ensure reset if needed
        return max(0, self.max_requests - self.request_count)

    def get_stats(self) -> dict[str, Any]:
        """Get current quota statistics."""
        self.check_quota()  # Ensure reset if needed
        return {
            "max_daily_requests": self.max_requests,
            "requests_used": self.request_count,
            "requests_remaining": self.get_remaining(),
            "utilization_percent": (self.request_count / self.max_requests) * 100,
            "reset_date": self.reset_date.isoformat(),
        }


# Global daily quota tracker instance
# Conservative limit of 1000 requests/day (leaves headroom under 1500/day Gemini Flash limit)
daily_quota = DailyQuotaTracker(max_daily_requests=1000)


async def with_retry(
    func: Callable[..., Awaitable[Any]],
    *args,
    max_retries: int = 3,
    backoff: Optional[ExponentialBackoff] = None,
    **kwargs
) -> Any:
    """
    Execute function with exponential backoff retry on rate limit errors.

    Args:
        func: Async function to execute
        args: Positional arguments for func
        max_retries: Maximum number of retry attempts
        backoff: ExponentialBackoff instance (creates default if None)
        kwargs: Keyword arguments for func

    Returns:
        Result from func

    Raises:
        Last exception if all retries exhausted
    """
    if backoff is None:
        backoff = ExponentialBackoff()

    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            error_str = str(e).lower()

            # Check if this is a rate limit error
            is_rate_limit = ("429" in error_str or "too many requests" in error_str
                           or "rate limit" in error_str)
            if is_rate_limit:
                if attempt < max_retries:
                    logger.warning(
                        f"Rate limit hit (attempt {attempt + 1}/{max_retries + 1}): {e}"
                    )
                    await backoff.wait()
                    continue

            # Non-rate-limit error or last attempt - raise immediately
            raise

    # All retries exhausted
    raise last_exception

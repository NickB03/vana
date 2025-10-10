"""
Rate limiting utilities for API requests.

This module provides rate limiting to prevent overwhelming external APIs
with too many concurrent requests.
"""

import asyncio
import time
from collections import deque
from typing import Any, Callable, Optional
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
        self.request_times: deque = deque(maxlen=max_requests * 2)

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

    async def __aenter__(self):
        """Context manager entry - acquire token and semaphore."""
        # First acquire rate limit token
        acquired = await self.acquire(timeout=30.0)
        if not acquired:
            raise TimeoutError("Rate limiter timeout - too many requests")

        # Then acquire concurrency semaphore
        await self.semaphore.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - release semaphore."""
        self.semaphore.release()

    async def get_stats(self) -> dict[str, Any]:
        """Get current rate limiter statistics."""
        async with self.lock:
            self._refill_tokens()

            now = time.time()
            recent_requests = sum(
                1 for t in self.request_times
                if now - t < self.time_window
            )

            return {
                "available_tokens": self.tokens,
                "max_tokens": self.max_requests,
                "time_window": self.time_window,
                "recent_requests": recent_requests,
                "concurrent_slots_available": self.semaphore._value,
                "max_concurrent": self.max_concurrent,
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
# Conservative settings to prevent overwhelming the API with rapid requests:
# - max_requests: 10 requests per time window
# - time_window: 60 seconds (1 minute)
# - max_concurrent: 3 concurrent requests maximum
#
# These limits prevent 429 "Too Many Requests" errors which occur when
# too many requests arrive too quickly, not due to quota exhaustion.
#
# To adjust limits based on your API tier:
# - Free tier: Keep at 10 req/60s
# - Paid tier: Increase to 20-30 req/60s
# - Enterprise: Consult API documentation for limits
gemini_rate_limiter = AsyncRateLimiter(
    max_requests=10,
    time_window=60.0,
    max_concurrent=3
)


async def with_retry(
    func: Callable,
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

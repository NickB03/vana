#!/usr/bin/env python3
"""
Circuit Breaker Pattern Implementation

This module provides a circuit breaker implementation for resilient service calls.
It helps prevent cascading failures and allows systems to fail gracefully.
"""

import functools
import logging
import time
from enum import Enum
from typing import Any, Callable, Dict, Optional, TypeVar, cast

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Type variables for function signatures
T = TypeVar("T")
F = TypeVar("F", bound=Callable[..., Any])


class CircuitState(Enum):
    """Circuit breaker states"""

    CLOSED = "closed"  # Normal operation, requests pass through
    OPEN = "open"  # Failing state, requests are blocked
    HALF_OPEN = "half_open"  # Testing state, limited requests pass through


class CircuitBreaker:
    """
    Circuit Breaker implementation for resilient service calls

    The circuit breaker prevents cascading failures by stopping requests
    to failing services and allowing them time to recover.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        fallback_function: Optional[Callable[..., Any]] = None,
        name: str = "default",
    ):
        """
        Initialize the circuit breaker

        Args:
            failure_threshold: Number of failures before opening the circuit
            recovery_timeout: Seconds to wait before trying to recover
            fallback_function: Function to call when circuit is open
            name: Name of this circuit breaker for logging
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.fallback_function = fallback_function
        self.name = name

        # State tracking
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        self.last_success_time = time.time()

        logger.info(
            f"Circuit breaker '{name}' initialized with threshold={failure_threshold}, timeout={recovery_timeout}s"
        )

    def __call__(self, func: F) -> F:
        """
        Decorator to wrap a function with circuit breaker protection

        Args:
            func: Function to wrap

        Returns:
            Wrapped function
        """

        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return self.call(func, *args, **kwargs)

        return cast(F, wrapper)

    def call(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """
        Call a function with circuit breaker protection

        Args:
            func: Function to call
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Function result or fallback result

        Raises:
            Exception: If circuit is open and no fallback is provided
        """
        # Check if circuit is open
        if self.state == CircuitState.OPEN:
            if self._should_attempt_recovery():
                logger.info(f"Circuit '{self.name}' attempting recovery (half-open)")
                self.state = CircuitState.HALF_OPEN
            else:
                logger.warning(f"Circuit '{self.name}' is OPEN - request rejected")
                return self._handle_open_circuit(func, *args, **kwargs)

        # Attempt to call the function
        try:
            result = func(*args, **kwargs)
            self._handle_success()
            return result
        except Exception as e:
            return self._handle_failure(e, func, *args, **kwargs)

    def _handle_success(self) -> None:
        """Handle a successful call"""
        self.failure_count = 0
        self.last_success_time = time.time()

        # If in half-open state, close the circuit
        if self.state == CircuitState.HALF_OPEN:
            logger.info(f"Circuit '{self.name}' recovered - closing circuit")
            self.state = CircuitState.CLOSED

    def _handle_failure(self, exception: Exception, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """
        Handle a failed call

        Args:
            exception: The exception that was raised
            func: The function that failed
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Fallback result if available

        Raises:
            Exception: If no fallback is provided
        """
        self.failure_count += 1
        self.last_failure_time = time.time()

        logger.warning(f"Circuit '{self.name}' recorded failure: {str(exception)}")

        # Check if we should open the circuit
        if self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
            logger.error(f"Circuit '{self.name}' threshold reached - opening circuit")
            self.state = CircuitState.OPEN

        # If in half-open state, reopen the circuit
        if self.state == CircuitState.HALF_OPEN:
            logger.warning(f"Circuit '{self.name}' failed during recovery - reopening circuit")
            self.state = CircuitState.OPEN

        return self._handle_open_circuit(func, *args, **kwargs)

    def _should_attempt_recovery(self) -> bool:
        """Check if enough time has passed to attempt recovery"""
        return time.time() - self.last_failure_time >= self.recovery_timeout

    def _handle_open_circuit(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """
        Handle a call when the circuit is open

        Args:
            func: The function that would have been called
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Fallback result if available

        Raises:
            Exception: If no fallback is provided
        """
        if self.fallback_function:
            logger.info(f"Circuit '{self.name}' using fallback function")
            return self.fallback_function(*args, **kwargs)
        else:
            raise CircuitOpenError(f"Circuit '{self.name}' is open and no fallback provided")

    def reset(self) -> None:
        """Reset the circuit breaker to closed state"""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        self.last_success_time = time.time()
        logger.info(f"Circuit '{self.name}' manually reset to CLOSED state")

    def get_state(self) -> Dict[str, Any]:
        """
        Get the current state of the circuit breaker

        Returns:
            Dictionary with state information
        """
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "failure_threshold": self.failure_threshold,
            "last_failure_time": self.last_failure_time,
            "last_success_time": self.last_success_time,
            "recovery_timeout": self.recovery_timeout,
            "has_fallback": self.fallback_function is not None,
        }


class CircuitOpenError(Exception):
    """Exception raised when a circuit is open and no fallback is provided"""



# Example usage
if __name__ == "__main__":
    # Example function with circuit breaker
    @CircuitBreaker(failure_threshold=3, recovery_timeout=5, name="example")
    def example_function(succeed: bool = True) -> str:
        if not succeed:
            raise ValueError("Simulated failure")
        return "Success!"

    # Example with manual circuit breaker
    cb = CircuitBreaker(
        failure_threshold=2,
        recovery_timeout=3,
        fallback_function=lambda *args, **kwargs: "Fallback result",
        name="manual-example",
    )

    def test_function(succeed: bool = True) -> str:
        if not succeed:
            raise ValueError("Simulated failure")
        return "Success!"

    # Test the circuit breaker
    for i in range(10):
        try:
            # Alternate between success and failure
            result = cb.call(test_function, i % 2 == 0)
            logger.info(f"Call {i}: {result}")
        except Exception as e:
            logger.error(f"Call {i}: Error - {e}")

        # Wait a bit between calls
        time.sleep(1)

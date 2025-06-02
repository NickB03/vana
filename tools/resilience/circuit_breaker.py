"""
Circuit Breaker for VANA

This module implements the circuit breaker pattern for external service dependencies.
It provides protection against cascading failures and allows for graceful degradation.
"""

import enum
import functools
import logging
import threading
import time
from collections.abc import Callable
from typing import Any, Optional, TypeVar

# Set up logging
logger = logging.getLogger(__name__)

# Type variable for function return type
T = TypeVar("T")


class CircuitState(enum.Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation, requests are allowed
    OPEN = "open"  # Circuit is open, requests are not allowed
    HALF_OPEN = "half_open"  # Testing if the service is back online


class CircuitBreaker:
    """
    Circuit Breaker for external service dependencies.

    This class implements the circuit breaker pattern to protect against
    cascading failures when external services are unavailable.
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        reset_timeout: float = 60.0,
        half_open_max_calls: int = 1,
    ):
        """
        Initialize the circuit breaker.

        Args:
            name: Name of the circuit breaker
            failure_threshold: Number of failures before opening the circuit
            reset_timeout: Time in seconds before attempting to close the circuit
            half_open_max_calls: Maximum number of calls allowed in half-open state
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self.half_open_max_calls = half_open_max_calls

        # Circuit state
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        self.half_open_calls = 0

        # Lock for thread safety
        self.lock = threading.RLock()

        # Listeners for state changes
        self.state_change_listeners = []

        logger.info(f"Circuit breaker '{name}' initialized")

    def add_state_change_listener(
        self, listener: Callable[[str, CircuitState, CircuitState], None]
    ) -> None:
        """
        Add a listener for state changes.

        Args:
            listener: Function to call when the state changes
        """
        self.state_change_listeners.append(listener)

    def _notify_state_change(
        self, old_state: CircuitState, new_state: CircuitState
    ) -> None:
        """
        Notify listeners of a state change.

        Args:
            old_state: Previous state
            new_state: New state
        """
        for listener in self.state_change_listeners:
            try:
                listener(self.name, old_state, new_state)
            except Exception as e:
                logger.error(
                    f"Error in circuit breaker state change listener: {str(e)}"
                )

    def allow_request(self) -> bool:
        """
        Check if a request is allowed.

        Returns:
            True if the request is allowed, False otherwise
        """
        with self.lock:
            if self.state == CircuitState.CLOSED:
                return True

            if self.state == CircuitState.OPEN:
                # Check if it's time to try again
                current_time = time.time()
                if current_time - self.last_failure_time >= self.reset_timeout:
                    old_state = self.state
                    self.state = CircuitState.HALF_OPEN
                    self.half_open_calls = 0
                    logger.info(
                        f"Circuit breaker '{self.name}' transitioning from OPEN to HALF_OPEN"
                    )
                    self._notify_state_change(old_state, self.state)
                    return True
                return False

            if self.state == CircuitState.HALF_OPEN:
                # Allow a limited number of calls in half-open state
                if self.half_open_calls < self.half_open_max_calls:
                    self.half_open_calls += 1
                    return True
                return False

            return False

    def on_success(self) -> None:
        """Record a successful call."""
        with self.lock:
            if self.state == CircuitState.HALF_OPEN:
                # If successful in half-open state, close the circuit
                old_state = self.state
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.half_open_calls = 0
                logger.info(
                    f"Circuit breaker '{self.name}' transitioning from HALF_OPEN to CLOSED"
                )
                self._notify_state_change(old_state, self.state)
            elif self.state == CircuitState.CLOSED:
                # Reset failure count on success
                self.failure_count = 0

    def on_failure(self) -> None:
        """Record a failed call."""
        with self.lock:
            current_time = time.time()
            self.last_failure_time = current_time

            if self.state == CircuitState.HALF_OPEN:
                # If failed in half-open state, open the circuit again
                old_state = self.state
                self.state = CircuitState.OPEN
                logger.warning(
                    f"Circuit breaker '{self.name}' transitioning from HALF_OPEN to OPEN"
                )
                self._notify_state_change(old_state, self.state)
            elif self.state == CircuitState.CLOSED:
                # Increment failure count
                self.failure_count += 1

                # If failure threshold reached, open the circuit
                if self.failure_count >= self.failure_threshold:
                    old_state = self.state
                    self.state = CircuitState.OPEN
                    logger.warning(
                        f"Circuit breaker '{self.name}' transitioning from CLOSED to OPEN after {self.failure_count} failures"
                    )
                    self._notify_state_change(old_state, self.state)

    def get_state(self) -> dict[str, Any]:
        """
        Get the current state of the circuit breaker.

        Returns:
            Dictionary with circuit breaker state information
        """
        with self.lock:
            return {
                "name": self.name,
                "state": self.state.value,
                "failure_count": self.failure_count,
                "failure_threshold": self.failure_threshold,
                "last_failure_time": self.last_failure_time,
                "reset_timeout": self.reset_timeout,
                "half_open_calls": self.half_open_calls,
                "half_open_max_calls": self.half_open_max_calls,
            }

    def reset(self) -> None:
        """Reset the circuit breaker to closed state."""
        with self.lock:
            old_state = self.state
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.half_open_calls = 0
            logger.info(f"Circuit breaker '{self.name}' manually reset to CLOSED")
            self._notify_state_change(old_state, self.state)

    def __call__(self, func: Callable[..., T]) -> Callable[..., T]:
        """
        Decorator for protecting a function with a circuit breaker.

        Args:
            func: Function to protect

        Returns:
            Protected function
        """

        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            if not self.allow_request():
                logger.warning(
                    f"Circuit breaker '{self.name}' is OPEN, request rejected"
                )
                raise CircuitBreakerOpenError(f"Circuit breaker '{self.name}' is open")

            try:
                result = func(*args, **kwargs)
                self.on_success()
                return result
            except Exception:
                self.on_failure()
                raise

        return wrapper


class CircuitBreakerOpenError(Exception):
    """Exception raised when a circuit breaker is open."""

    pass


class CircuitBreakerRegistry:
    """
    Registry for circuit breakers.

    This class provides a central registry for circuit breakers in the application.
    """

    def __init__(self):
        """Initialize the circuit breaker registry."""
        self.circuit_breakers = {}
        self.lock = threading.RLock()

        # Default state change listener
        self.add_state_change_listener(self._log_state_change)

        logger.info("Circuit breaker registry initialized")

    def get_or_create(
        self,
        name: str,
        failure_threshold: int = 5,
        reset_timeout: float = 60.0,
        half_open_max_calls: int = 1,
    ) -> CircuitBreaker:
        """
        Get or create a circuit breaker.

        Args:
            name: Name of the circuit breaker
            failure_threshold: Number of failures before opening the circuit
            reset_timeout: Time in seconds before attempting to close the circuit
            half_open_max_calls: Maximum number of calls allowed in half-open state

        Returns:
            Circuit breaker instance
        """
        with self.lock:
            if name not in self.circuit_breakers:
                circuit_breaker = CircuitBreaker(
                    name=name,
                    failure_threshold=failure_threshold,
                    reset_timeout=reset_timeout,
                    half_open_max_calls=half_open_max_calls,
                )

                # Add state change listeners
                for listener in self.state_change_listeners:
                    circuit_breaker.add_state_change_listener(listener)

                self.circuit_breakers[name] = circuit_breaker
                logger.info(f"Created circuit breaker '{name}'")

            return self.circuit_breakers[name]

    def get(self, name: str) -> Optional[CircuitBreaker]:
        """
        Get a circuit breaker by name.

        Args:
            name: Name of the circuit breaker

        Returns:
            Circuit breaker instance or None if not found
        """
        return self.circuit_breakers.get(name)

    def get_all(self) -> dict[str, CircuitBreaker]:
        """
        Get all circuit breakers.

        Returns:
            Dictionary of circuit breakers
        """
        return self.circuit_breakers.copy()

    def get_states(self) -> dict[str, dict[str, Any]]:
        """
        Get the states of all circuit breakers.

        Returns:
            Dictionary of circuit breaker states
        """
        return {name: cb.get_state() for name, cb in self.circuit_breakers.items()}

    def reset_all(self) -> None:
        """Reset all circuit breakers."""
        for circuit_breaker in self.circuit_breakers.values():
            circuit_breaker.reset()

    def reset(self, name: str) -> bool:
        """
        Reset a specific circuit breaker.

        Args:
            name: Name of the circuit breaker

        Returns:
            True if the circuit breaker was reset, False if not found
        """
        circuit_breaker = self.get(name)
        if circuit_breaker:
            circuit_breaker.reset()
            return True
        return False

    # State change listener management
    state_change_listeners = []

    @classmethod
    def add_state_change_listener(
        cls, listener: Callable[[str, CircuitState, CircuitState], None]
    ) -> None:
        """
        Add a listener for state changes in all circuit breakers.

        Args:
            listener: Function to call when a circuit breaker state changes
        """
        cls.state_change_listeners.append(listener)

    @classmethod
    def _log_state_change(
        cls, name: str, old_state: CircuitState, new_state: CircuitState
    ) -> None:
        """
        Log circuit breaker state changes.

        Args:
            name: Name of the circuit breaker
            old_state: Previous state
            new_state: New state
        """
        logger.info(
            f"Circuit breaker '{name}' state changed from {old_state.value} to {new_state.value}"
        )


# Create a global registry
registry = CircuitBreakerRegistry()


def circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    reset_timeout: float = 60.0,
    half_open_max_calls: int = 1,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator for protecting a function with a circuit breaker.

    Args:
        name: Name of the circuit breaker
        failure_threshold: Number of failures before opening the circuit
        reset_timeout: Time in seconds before attempting to close the circuit
        half_open_max_calls: Maximum number of calls allowed in half-open state

    Returns:
        Decorator function
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        circuit_breaker = registry.get_or_create(
            name=name,
            failure_threshold=failure_threshold,
            reset_timeout=reset_timeout,
            half_open_max_calls=half_open_max_calls,
        )
        return circuit_breaker(func)

    return decorator

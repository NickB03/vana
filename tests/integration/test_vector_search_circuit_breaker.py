"""
Integration tests for Vector Search Circuit Breaker.

This module contains tests to verify that the Circuit Breaker pattern works correctly
with the Vector Search client, including failure detection, recovery, and fallback mechanisms.
"""

import logging
import os
import sys
import time

import pytest

# Add the project root to the Python path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the fixtures

# Import the actual implementations
from tools.monitoring.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerState,
    CircuitOpenError,
)


class TestVectorSearchCircuitBreaker:
    """Test suite for Vector Search Circuit Breaker integration."""

    def test_circuit_breaker_initialization(self):
        """Test that the circuit breaker can be initialized correctly."""
        # Create a circuit breaker with custom parameters
        circuit_breaker = CircuitBreaker(
            failure_threshold=3, recovery_timeout=5, name="test-circuit-breaker"
        )

        # Verify initial state
        assert circuit_breaker.state == CircuitBreakerState.CLOSED
        assert circuit_breaker.failure_count == 0
        assert circuit_breaker.name == "test-circuit-breaker"
        assert circuit_breaker.failure_threshold == 3
        assert circuit_breaker.recovery_timeout == 5

    def test_circuit_opens_on_failures(self, mock_vector_search_client):
        """Test that the circuit opens after a threshold of failures."""
        # Create a circuit breaker with a low threshold
        circuit_breaker = CircuitBreaker(
            failure_threshold=2, recovery_timeout=60, name="vector-search-test"
        )

        # Create a function that will fail
        def failing_function():
            mock_vector_search_client.is_available_flag = False
            if not mock_vector_search_client.is_available():
                raise ConnectionError("Simulated connection error")
            return True

        # First failure
        with pytest.raises(ConnectionError):
            circuit_breaker.call(failing_function)

        # Circuit should still be closed
        assert circuit_breaker.state == CircuitBreakerState.CLOSED
        assert circuit_breaker.failure_count == 1

        # Second failure - should open the circuit
        with pytest.raises(ConnectionError):
            circuit_breaker.call(failing_function)

        # Circuit should now be open
        assert circuit_breaker.state == CircuitBreakerState.OPEN
        assert circuit_breaker.failure_count >= circuit_breaker.failure_threshold

        # Further calls should raise CircuitOpenError
        with pytest.raises(CircuitOpenError):
            circuit_breaker.call(failing_function)

    def test_circuit_recovery_after_timeout(self):
        """Test that the circuit attempts recovery after timeout period."""
        # Create a circuit breaker with a very short recovery timeout
        circuit_breaker = CircuitBreaker(
            failure_threshold=1,
            recovery_timeout=0.1,  # 100ms for quick testing
            name="quick-recovery-test",
        )

        # Create a function that will fail initially but succeed later
        success_after_recovery = [False]

        def test_function():
            if not success_after_recovery[0]:
                raise ConnectionError("Simulated connection error")
            return "Success"

        # Fail once to open the circuit
        with pytest.raises(ConnectionError):
            circuit_breaker.call(test_function)

        # Circuit should be open
        assert circuit_breaker.state == CircuitBreakerState.OPEN

        # Wait for recovery timeout
        time.sleep(0.2)  # Slightly longer than recovery_timeout

        # Set up for success on next attempt
        success_after_recovery[0] = True

        # Next call should succeed and close the circuit
        result = circuit_breaker.call(test_function)
        assert result == "Success"

        # Circuit should be closed again
        assert circuit_breaker.state == CircuitBreakerState.CLOSED

    def test_circuit_half_open_state(self):
        """Test the half-open state behavior."""
        # Create a circuit breaker
        circuit_breaker = CircuitBreaker(
            failure_threshold=1,
            recovery_timeout=0.1,  # 100ms for quick testing
            name="half-open-test",
        )

        # Create a function that will fail
        def failing_function():
            raise ConnectionError("Simulated connection error")

        # Fail once to open the circuit
        with pytest.raises(ConnectionError):
            circuit_breaker.call(failing_function)

        # Circuit should be open
        assert circuit_breaker.state == CircuitBreakerState.OPEN

        # Wait for recovery timeout
        time.sleep(0.2)  # Slightly longer than recovery_timeout

        # Next call should attempt recovery (half-open state)
        # But since the function still fails, it should reopen the circuit
        with pytest.raises(ConnectionError):
            circuit_breaker.call(failing_function)

        # Circuit should be open again
        assert circuit_breaker.state == CircuitBreakerState.OPEN

    def test_fallback_functionality(self):
        """Test that fallback function is called when circuit is open."""

        # Create a fallback function
        def fallback_function(*args, **kwargs):
            return "Fallback result"

        # Create a circuit breaker with fallback
        circuit_breaker = CircuitBreaker(
            failure_threshold=1,
            recovery_timeout=60,
            fallback_function=fallback_function,
            name="fallback-test",
        )

        # Create a function that will fail
        def failing_function():
            raise ConnectionError("Simulated connection error")

        # Fail once to open the circuit
        with pytest.raises(ConnectionError):
            circuit_breaker.call(failing_function)

        # Circuit should be open
        assert circuit_breaker.state == CircuitBreakerState.OPEN

        # Next call should use the fallback
        result = circuit_breaker.call(failing_function)
        assert result == "Fallback result"

    def test_circuit_with_vector_search_client(self, mock_vector_search_client):
        """Test circuit breaker integration with Vector Search client."""
        # Create a circuit breaker
        circuit_breaker = CircuitBreaker(
            failure_threshold=2, recovery_timeout=60, name="vector-search-circuit"
        )

        # Configure mock client for success initially
        mock_vector_search_client.is_available_flag = True
        mock_vector_search_client.search_success = True

        # Create a wrapper function for search
        def search_function(query):
            return mock_vector_search_client.search(query)

        # First call should succeed
        results = circuit_breaker.call(search_function, "test query")
        assert len(results) > 0

        # Configure mock client for failure
        mock_vector_search_client.search_success = False

        # Next calls should fail and eventually open the circuit
        with pytest.raises(Exception):
            circuit_breaker.call(search_function, "test query")

        with pytest.raises(Exception):
            circuit_breaker.call(search_function, "test query")

        # Circuit should be open
        assert circuit_breaker.state == CircuitBreakerState.OPEN

        # Further calls should raise CircuitOpenError
        with pytest.raises(CircuitOpenError):
            circuit_breaker.call(search_function, "test query")

    def test_circuit_breaker_as_decorator(self, mock_vector_search_client):
        """Test using circuit breaker as a decorator."""
        # Create a circuit breaker
        circuit_breaker = CircuitBreaker(
            failure_threshold=2, recovery_timeout=60, name="decorator-test"
        )

        # Create a decorated function
        @circuit_breaker
        def search_with_circuit_breaker(query):
            if not mock_vector_search_client.search_success:
                raise ConnectionError("Simulated search failure")
            return mock_vector_search_client.search(query)

        # Configure mock client for success initially
        mock_vector_search_client.search_success = True

        # First call should succeed
        results = search_with_circuit_breaker("test query")
        assert len(results) > 0

        # Configure mock client for failure
        mock_vector_search_client.search_success = False

        # Next calls should fail and eventually open the circuit
        with pytest.raises(ConnectionError):
            search_with_circuit_breaker("test query")

        with pytest.raises(ConnectionError):
            search_with_circuit_breaker("test query")

        # Further calls should raise CircuitOpenError
        with pytest.raises(CircuitOpenError):
            search_with_circuit_breaker("test query")

    def test_circuit_reset_on_success(self):
        """Test that the circuit resets failure count after success."""
        # Create a circuit breaker
        circuit_breaker = CircuitBreaker(
            failure_threshold=3, recovery_timeout=60, name="reset-test"
        )

        # Create a function that will fail based on a flag
        should_fail = [True]

        def test_function():
            if should_fail[0]:
                raise ConnectionError("Simulated connection error")
            return "Success"

        # First call should fail
        with pytest.raises(ConnectionError):
            circuit_breaker.call(test_function)

        # Circuit should have one failure
        assert circuit_breaker.failure_count == 1

        # Next call should succeed
        should_fail[0] = False
        result = circuit_breaker.call(test_function)
        assert result == "Success"

        # Failure count should be reset
        assert circuit_breaker.failure_count == 0


if __name__ == "__main__":
    # Run the tests if this file is executed directly
    pytest.main(["-xvs", __file__])

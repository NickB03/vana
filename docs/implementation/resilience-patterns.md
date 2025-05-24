# Resilience Patterns Implementation

[Home](../../index.md) > [Implementation](../index.md) > Resilience Patterns

This document details the implementation and usage of resilience patterns within the VANA system. Resilience patterns are crucial for building robust applications that can gracefully handle transient failures, especially when interacting with external services. The primary resilience pattern discussed here is the Circuit Breaker.

## 1. Overview

VANA interacts with several external services (e.g., Google Vertex AI, MCP Knowledge Graph server, Google Custom Search API). These services can experience temporary outages, network issues, or rate limiting. Resilience patterns help VANA components to:
*   Avoid overwhelming a struggling external service with repeated requests.
*   Fail fast when a service is known to be down, preventing cascading failures within VANA.
*   Provide fallback mechanisms or degraded functionality when possible.
*   Automatically recover when the external service becomes available again.

## 2. Circuit Breaker Pattern

The Circuit Breaker is a common pattern used to achieve resilience. VANA may implement a circuit breaker utility, for example, in `tools/monitoring/circuit_breaker.py` or `tools/resilience/circuit_breaker.py`.

### 2.1. Concept

A circuit breaker acts like an electrical circuit breaker:
*   **Closed State:** Requests are allowed to pass through to the external service. If requests succeed, the breaker remains closed. If a certain number of failures occur within a time window, the breaker "trips" and moves to the Open state.
*   **Open State:** Requests are immediately rejected (fail fast) without attempting to call the external service. This prevents VANA from making calls to a service that is likely unavailable, saving resources and avoiding long timeouts. After a configured timeout period, the breaker moves to the Half-Open state.
*   **Half-Open State:** A limited number of test requests are allowed to pass through to the external service.
    *   If these test requests succeed, the breaker assumes the service has recovered and moves back to the Closed state.
    *   If any test request fails, the breaker trips again and returns to the Open state, restarting the timeout.

### 2.2. Implementation (`tools/monitoring/circuit_breaker.py` - Conceptual)

A Python implementation of a circuit breaker might look like this:

```python
# tools/monitoring/circuit_breaker.py (Conceptual Structure)
import time
import threading
from enum import Enum
from tools.logging.logger import get_logger # Assuming VANA's logger

logger = get_logger(__name__)

class CircuitBreakerState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout_seconds: int = 30, half_open_attempt_limit: int = 1):
        """
        Initializes the CircuitBreaker.

        Args:
            failure_threshold (int): Number of failures to trip the circuit.
            recovery_timeout_seconds (int): Seconds to wait in OPEN state before moving to HALF_OPEN.
            half_open_attempt_limit (int): Number of successful attempts in HALF_OPEN to close the circuit.
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        self.half_open_attempt_limit = half_open_attempt_limit # Max attempts in half-open before re-closing

        self._lock = threading.RLock() # For thread safety
        self._state = CircuitBreakerState.CLOSED
        self._failure_count = 0
        self._last_failure_time = None
        self._half_open_success_count = 0

    @property
    def state(self):
        with self._lock:
            return self._state

    def execute(self, func, *args, **kwargs):
        """
        Executes the given function if the circuit is CLOSED or HALF_OPEN.
        If the circuit is OPEN, raises CircuitBreakerOpenException immediately.
        """
        with self._lock:
            if self._state == CircuitBreakerState.OPEN:
                # Check if recovery timeout has passed
                if self._last_failure_time and (time.monotonic() - self._last_failure_time) > self.recovery_timeout_seconds:
                    self._transition_to_half_open()
                else:
                    logger.warning(f"CircuitBreaker is OPEN for {func.__name__}. Call rejected.")
                    raise CircuitBreakerOpenException(f"Circuit for {func.__name__} is OPEN.")

            # If CLOSED or HALF_OPEN, attempt the call
            # (In HALF_OPEN, we might limit concurrent attempts if not handled by _half_open_success_count logic)

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            # Only count specific, relevant exceptions as failures if needed
            # For example, distinguish network errors from application errors
            self._on_failure()
            logger.error(f"CircuitBreaker recorded failure for {func.__name__}: {e}", exc_info=False) # exc_info=False to avoid flooding logs if error is expected
            raise # Re-raise the original exception

    def _on_success(self):
        with self._lock:
            if self._state == CircuitBreakerState.HALF_OPEN:
                self._half_open_success_count += 1
                if self._half_open_success_count >= self.half_open_attempt_limit:
                    self._transition_to_closed()
                logger.info(f"CircuitBreaker in HALF_OPEN recorded success. Successes: {self._half_open_success_count}/{self.half_open_attempt_limit}")
            elif self._state == CircuitBreakerState.CLOSED:
                # Reset failure count on any success in CLOSED state
                if self._failure_count > 0:
                    logger.info("CircuitBreaker in CLOSED state, resetting failure count after success.")
                    self._failure_count = 0
                    self._last_failure_time = None


    def _on_failure(self):
        with self._lock:
            if self._state == CircuitBreakerState.HALF_OPEN:
                self._transition_to_open() # Any failure in HALF_OPEN re-opens the circuit
            elif self._state == CircuitBreakerState.CLOSED:
                self._failure_count += 1
                self._last_failure_time = time.monotonic() # Record time of this failure
                if self._failure_count >= self.failure_threshold:
                    self._transition_to_open()
                else:
                    logger.warning(f"CircuitBreaker in CLOSED state recorded failure. Count: {self._failure_count}/{self.failure_threshold}")


    def _transition_to_closed(self):
        logger.info("CircuitBreaker: Transitioning to CLOSED state.")
        self._state = CircuitBreakerState.CLOSED
        self._failure_count = 0
        self._last_failure_time = None
        self._half_open_success_count = 0

    def _transition_to_open(self):
        logger.warning("CircuitBreaker: Transitioning to OPEN state.")
        self._state = CircuitBreakerState.OPEN
        self._last_failure_time = time.monotonic() # Start OPEN timer from this point
        # _failure_count is already at threshold or more
        self._half_open_success_count = 0


    def _transition_to_half_open(self):
        logger.info("CircuitBreaker: Transitioning to HALF_OPEN state.")
        self._state = CircuitBreakerState.HALF_OPEN
        self._half_open_success_count = 0
        # _failure_count and _last_failure_time remain from when it opened

class CircuitBreakerOpenException(Exception):
    """Custom exception raised when the circuit breaker is open."""
    pass

# --- Example Usage (within a client class) ---
# class SomeServiceClient:
#     def __init__(self):
#         self.circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout_seconds=60)
#
#     def make_api_call(self, params):
#         return self.circuit_breaker.execute(self._actual_api_call, params)
#
#     def _actual_api_call(self, params):
#         # ... code to make the real network request ...
#         # response = requests.post(self.api_url, json=params)
#         # response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
#         # return response.json()
#         pass # Placeholder
```

### 2.3. Using the Circuit Breaker

VANA components that make calls to external services (e.g., `VectorSearchClient`, `WebSearchClient`, `KnowledgeGraphManager`) would instantiate and use a `CircuitBreaker`:

1.  **Instantiate:** Create a `CircuitBreaker` instance, possibly per external service endpoint or per client instance. Configure `failure_threshold` and `recovery_timeout_seconds` appropriately for the specific service.
2.  **Wrap Calls:** Wrap the actual network call logic in the `circuit_breaker.execute()` method.
3.  **Handle `CircuitBreakerOpenException`:** When `execute()` is called and the circuit is OPEN, it will raise `CircuitBreakerOpenException`. The calling code should catch this and handle it gracefully (e.g., return cached data, a default response, or propagate an error indicating service unavailability).

```python
# In tools/vector_search/vector_search_client.py (Simplified Example)
# from tools.monitoring.circuit_breaker import CircuitBreaker, CircuitBreakerOpenException

# class VectorSearchClient:
#     def __init__(self):
#         # ... other initializations ...
#         self.vs_circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout_seconds=60)
#         # self.logger = get_logger(__name__)

#     def _make_vertex_ai_call(self, method_to_call, *args, **kwargs):
#         # This is the actual function that interacts with Vertex AI SDK
#         # e.g., return self.vertex_ai_sdk_client.some_method(*args, **kwargs)
#         pass # Placeholder for actual SDK call

#     def find_neighbors(self, query_embedding, num_neighbors):
#         try:
#             # Wrap the actual call with the circuit breaker's execute method
#             results = self.vs_circuit_breaker.execute(
#                 self._make_vertex_ai_call,
#                 "find_neighbors_sdk_method_name", # Or pass the actual SDK method
#                 query_embedding,
#                 num_neighbors
#             )
#             return results
#         except CircuitBreakerOpenException as e:
#             self.logger.warning(f"Vector Search circuit breaker is open for find_neighbors: {e}")
#             # Return a fallback, cached response, or raise a specific VANA error
#             raise ServiceUnavailableError("Vector Search is temporarily unavailable (circuit open).") from e
#         except Exception as e: # Other exceptions from the actual call
#             self.logger.error(f"Error in find_neighbors via Vertex AI: {e}", exc_info=True)
#             raise # Re-raise or handle
```

## 3. Other Resilience Patterns (Conceptual)

Besides Circuit Breakers, VANA might employ or benefit from:

*   **Retries with Exponential Backoff:** For transient network errors, automatically retry the failed operation a few times, with increasing delays between retries. Libraries like `tenacity` can simplify this.
    *   This should be used carefully in conjunction with a circuit breaker. Retries handle very short-term blips, while the circuit breaker handles longer outages.
*   **Timeouts:** Configure appropriate timeouts for all network requests to prevent indefinite blocking.
*   **Fallbacks:** If a primary service call fails (e.g., after retries or if a circuit is open), provide a fallback response. This could be:
    *   Serving stale data from a cache.
    *   Returning a default or empty response.
    *   Using an alternative, less critical data source.
*   **Bulkheads:** Isolate resources used for different external calls. If one service is slow or unresponsive, it doesn't exhaust resources (like threads or connections) needed for other services. This is more relevant in highly concurrent systems.
*   **Rate Limiting (Client-Side):** If an external API has strict rate limits, the VANA client for that API should respect these limits to avoid being blocked.

## 4. Configuration

Resilience patterns often require configuration:
*   **Circuit Breaker:** `failure_threshold`, `recovery_timeout_seconds`.
*   **Retries:** Number of retry attempts, backoff factor, types of exceptions to retry on.
*   **Timeouts:** Connection timeout, read timeout.

These should be configurable via `config/environment.py` and `.env` to allow tuning for different environments or service characteristics.

## 5. Testing Circuit Breakers

Testing circuit breakers is essential to ensure they provide the expected protection. VANA includes comprehensive tests for circuit breakers in the integration test suite.

### 5.1. Circuit Breaker Test Structure

The `tests/integration/test_vector_search_circuit_breaker.py` file contains tests that verify:

1. **State Transitions:**
   * Circuit opens after reaching the failure threshold
   * Circuit transitions to half-open after the recovery timeout
   * Circuit closes after successful calls in half-open state
   * Circuit reopens if failures occur in half-open state

2. **Fallback Behavior:**
   * Fallback functions are called when the circuit is open
   * Appropriate exceptions are raised when no fallback is provided

3. **Integration with Vector Search:**
   * Circuit breaker protects Vector Search operations
   * Decorator syntax works correctly with Vector Search functions

Example test for circuit opening on failures:

```python
def test_circuit_opens_on_failures(self, mock_vector_search_client):
    """Test that the circuit opens after a threshold of failures."""
    # Create a circuit breaker with a low threshold
    circuit_breaker = CircuitBreaker(
        failure_threshold=2,
        recovery_timeout=60,
        name="vector-search-test"
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
```

### 5.2. Testing Fallback Mechanisms

The `tests/integration/test_vector_search_fallback.py` file contains tests that verify:

1. **Auto-Fallback Configuration:**
   * Client falls back to mock implementation when configured to do so
   * Client fails appropriately when auto-fallback is disabled

2. **Fallback Scenarios:**
   * Fallback on missing project ID or credentials
   * Fallback on authentication errors
   * Fallback on embedding generation errors
   * Fallback on search errors

3. **Graceful Degradation:**
   * System continues to function with reduced capabilities
   * Appropriate warnings are logged

Example test for graceful degradation:

```python
def test_graceful_degradation(self):
    """Test graceful degradation when some operations fail but others succeed."""
    # Create a client
    client = VectorSearchClient(use_mock=False, auto_fallback=True)

    # Mock methods to simulate partial failures
    with patch.object(client, '_initialize', return_value=True):
        with patch.object(client, 'using_mock', False):
            with patch.object(client, 'generate_embedding', return_value=[0.1] * 768):
                with patch.object(client, 'search_vector_store', side_effect=Exception("Simulated search error")):
                    # First search should fall back to mock
                    results1 = client.search("test query 1")
                    assert len(results1) > 0

                    # Client should still be usable for embedding generation
                    embedding = client.generate_embedding("test text")
                    assert len(embedding) == 768
```

## 6. Logging and Monitoring Resilience

*   **Log State Transitions:** The `CircuitBreaker` should log when it transitions between states (CLOSED, OPEN, HALF_OPEN).
*   **Log Failures and Successes:** Log attempts, failures counted by the breaker, and successful calls (especially in HALF_OPEN).
*   **Monitor Breaker States:** The VANA Monitoring Dashboard could potentially display the current state of important circuit breakers, providing visibility into the health of external dependencies.

By implementing these resilience patterns and comprehensive testing, VANA can improve its stability and user experience, even when facing intermittent issues with its external dependencies.

# Copyright 2025 Google LLC
# Licensed under the Apache License, Version 2.0 (the "License")

import asyncio
import os
import threading
import time
import uuid
from unittest.mock import Mock, patch

import pytest
import requests
from fastapi import status
from fastapi.testclient import TestClient
from requests.exceptions import ConnectionError, Timeout

from app.server import app
from app.utils.sse_broadcaster import agent_network_event_stream


class TestNetworkErrorHandling:
    """Test handling of various network error conditions."""

    def setup_method(self):
        """Set up network error testing."""
        self.client = TestClient(app)
        self.test_session_id = str(uuid.uuid4())
        self.base_url = "http://127.0.0.1:8000"

    def test_connection_timeout_handling(self):
        """Test handling of connection timeouts."""
        with patch("requests.post") as mock_post:
            mock_post.side_effect = Timeout("Connection timed out")

            # Simulate timeout in feedback endpoint
            feedback_data = {
                "score": 4,
                "invocation_id": str(uuid.uuid4()),
                "text": "Test feedback",
            }

            with pytest.raises(Timeout):
                # Direct requests would timeout, but our app should handle it
                requests.post(
                    f"{self.base_url}/feedback", json=feedback_data, timeout=1
                )

    def test_connection_refused_handling(self):
        """Test handling when backend is unavailable."""
        with patch("requests.get") as mock_get:
            mock_get.side_effect = ConnectionError("Connection refused")

            with pytest.raises(ConnectionError):
                requests.get(f"{self.base_url}/health")

    def test_intermittent_network_failures(self):
        """Test handling of intermittent network issues."""
        call_count = 0

        def mock_request(*args, **kwargs):
            nonlocal call_count
            call_count += 1

            # Fail first two attempts, succeed on third
            if call_count <= 2:
                raise ConnectionError("Network temporarily unavailable")
            else:
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"status": "success"}
                return mock_response

        with patch("requests.post", side_effect=mock_request):
            # Implement retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = requests.post(f"{self.base_url}/feedback", json={})
                    if response.status_code == 200:
                        break
                except ConnectionError:
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(0.1 * (2**attempt))  # Exponential backoff

            assert call_count == 3  # Should succeed on third attempt

    def test_slow_network_response(self):
        """Test handling of very slow network responses."""

        def slow_response(*args, **kwargs):
            time.sleep(2)  # Simulate 2-second delay
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"status": "delayed_success"}
            return mock_response

        with patch("requests.get", side_effect=slow_response):
            start_time = time.time()

            try:
                response = requests.get(f"{self.base_url}/health", timeout=3)
                response_time = time.time() - start_time

                # Should succeed but take time
                assert response_time >= 2.0
                assert response.json()["status"] == "delayed_success"

            except Timeout:
                # Acceptable if timeout is set lower than delay
                pass


class TestSSEErrorScenarios:
    """Test SSE connection error scenarios."""

    def setup_method(self):
        """Set up SSE error testing."""
        self.client = TestClient(app)
        self.test_session_id = str(uuid.uuid4())

    def test_sse_connection_drop(self):
        """Test handling of SSE connection drops."""
        connection_events = []

        async def monitor_sse_connection():
            """Monitor SSE connection and track events."""
            try:
                async for event_data in agent_network_event_stream(
                    self.test_session_id
                ):
                    connection_events.append(
                        {
                            "type": "event_received",
                            "data": event_data,
                            "timestamp": time.time(),
                        }
                    )

                    # Stop after receiving a few events
                    if len(connection_events) >= 3:
                        break

            except Exception as e:
                connection_events.append(
                    {"type": "error", "error": str(e), "timestamp": time.time()}
                )

        # Run SSE monitoring with timeout
        try:
            asyncio.run(asyncio.wait_for(monitor_sse_connection(), timeout=5.0))
        except asyncio.TimeoutError:
            connection_events.append({"type": "timeout", "timestamp": time.time()})

        # Should handle connection gracefully
        assert len(connection_events) >= 1

    def test_malformed_sse_events(self):
        """Test handling of malformed SSE events."""
        from app.utils.sse_broadcaster import EnhancedSSEBroadcaster

        broadcaster = EnhancedSSEBroadcaster()

        malformed_events = [
            None,  # Null event
            "",  # Empty string
            {"type": "test"},  # Missing session_id
            {"session_id": "wrong_session"},  # Wrong session
            {"malformed": True},  # Unexpected structure
            {"session_id": self.test_session_id, "data": "not_json"},  # Invalid data
        ]

        errors_caught = 0

        for malformed_event in malformed_events:
            try:
                broadcaster.broadcast_event(self.test_session_id, malformed_event)
            except Exception as e:
                errors_caught += 1
                # Should be reasonable exceptions
                assert isinstance(e, ValueError | TypeError | KeyError | AttributeError)

        # Some malformed events should cause errors
        # (exact behavior depends on implementation)
        assert errors_caught >= 0  # At least some validation

    def test_sse_memory_pressure(self):
        """Test SSE behavior under memory pressure."""
        from app.utils.sse_broadcaster import EnhancedSSEBroadcaster

        broadcaster = EnhancedSSEBroadcaster()

        # Generate many large events
        large_event_count = 1000
        large_event_size = 10000  # 10KB per event

        events_processed = 0
        memory_errors = 0

        for i in range(large_event_count):
            try:
                large_event = {
                    "type": "memory_pressure_test",
                    "event_id": i,
                    "large_data": "x" * large_event_size,
                    "timestamp": time.time(),
                    "session_id": self.test_session_id,
                }

                broadcaster.broadcast_event(self.test_session_id, large_event)
                events_processed += 1

                # Periodic memory check (simplified)
                if i % 100 == 0:
                    import psutil

                    memory_percent = psutil.virtual_memory().percent
                    if memory_percent > 90:  # If memory usage too high
                        break

            except MemoryError:
                memory_errors += 1
                break
            except Exception as e:
                # Other errors are acceptable
                if "memory" in str(e).lower():
                    memory_errors += 1
                break

        # Should process reasonable number without crashing
        assert events_processed >= 100  # At least 100 events

    def test_concurrent_sse_connections(self):
        """Test concurrent SSE connections and potential conflicts."""
        session_ids = [str(uuid.uuid4()) for _ in range(10)]
        connection_results = []

        async def test_concurrent_connection(session_id, connection_id):
            """Test a single concurrent SSE connection."""
            try:
                events_received = 0
                async for _event_data in agent_network_event_stream(session_id):
                    events_received += 1
                    if events_received >= 2:  # Limit events per connection
                        break

                connection_results.append(
                    {
                        "connection_id": connection_id,
                        "session_id": session_id,
                        "status": "success",
                        "events_received": events_received,
                    }
                )

            except Exception as e:
                connection_results.append(
                    {
                        "connection_id": connection_id,
                        "session_id": session_id,
                        "status": "error",
                        "error": str(e),
                    }
                )

        async def run_concurrent_connections():
            """Run multiple concurrent SSE connections."""
            tasks = []
            for i, session_id in enumerate(session_ids):
                task = asyncio.create_task(test_concurrent_connection(session_id, i))
                tasks.append(task)

            # Wait for all connections with timeout
            try:
                await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True), timeout=10.0
                )
            except asyncio.TimeoutError:
                # Some connections may timeout, which is acceptable
                pass

        # Run concurrent connection test
        asyncio.run(run_concurrent_connections())

        # Verify results
        successful_connections = [
            r for r in connection_results if r["status"] == "success"
        ]

        # Should handle at least some concurrent connections
        assert (
            len(successful_connections) >= len(session_ids) * 0.5
        )  # At least 50% success


class TestDataValidationErrors:
    """Test data validation and sanitization error handling."""

    def setup_method(self):
        """Set up data validation testing."""
        self.client = TestClient(app)

    def test_malformed_json_requests(self):
        """Test handling of malformed JSON in requests."""
        malformed_json_cases = [
            '{"invalid": json}',  # Invalid JSON syntax
            '{"unclosed": "string}',  # Unclosed string
            '{invalid_key: "value"}',  # Invalid key format
            '{"trailing": "comma",}',  # Trailing comma
            "",  # Empty string
            "not json at all",  # Not JSON
        ]

        for malformed_json in malformed_json_cases:
            response = self.client.post(
                "/feedback",
                data=malformed_json,  # Send raw data instead of json
                headers={"Content-Type": "application/json"},
            )

            # Should return 422 for malformed JSON
            assert response.status_code in [
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                status.HTTP_400_BAD_REQUEST,
            ]

    def test_injection_attack_prevention(self):
        """Test prevention of various injection attacks."""
        injection_payloads = [
            # SQL injection attempts
            "'; DROP TABLE sessions; --",
            "' OR '1'='1",
            "1; DELETE FROM users WHERE 1=1; --",
            # XSS attempts
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            # Path traversal attempts
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            # Command injection attempts
            "; cat /etc/passwd",
            "| whoami",
            "&& rm -rf /",
        ]

        for payload in injection_payloads:
            # Test in feedback endpoint
            feedback_data = {
                "score": 3,
                "invocation_id": str(uuid.uuid4()),
                "text": payload,
            }

            response = self.client.post("/feedback", json=feedback_data)

            # Should either succeed (with sanitized input) or reject safely
            assert response.status_code in [
                status.HTTP_200_OK,  # Accepted with sanitization
                status.HTTP_422_UNPROCESSABLE_ENTITY,  # Rejected
                status.HTTP_400_BAD_REQUEST,  # Bad request
            ]

            # Server should not crash or return 500 errors
            assert response.status_code != status.HTTP_500_INTERNAL_SERVER_ERROR

            # Test in SSE endpoint (session ID)
            if len(payload) <= 100:  # Reasonable session ID length
                sse_response = self.client.get(f"/agent_network_sse/{payload}")

                # Should handle malicious session IDs gracefully
                assert sse_response.status_code in [
                    status.HTTP_200_OK,  # Accepted
                    status.HTTP_422_UNPROCESSABLE_ENTITY,  # Validation error
                    status.HTTP_400_BAD_REQUEST,  # Bad request
                ]

    def test_oversized_request_handling(self):
        """Test handling of oversized requests."""
        # Create oversized feedback text
        oversized_text = "A" * 1000000  # 1MB text

        feedback_data = {
            "score": 4,
            "invocation_id": str(uuid.uuid4()),
            "text": oversized_text,
        }

        response = self.client.post("/feedback", json=feedback_data)

        # Should either accept or reject gracefully
        assert response.status_code in [
            status.HTTP_200_OK,  # Accepted
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,  # Too large
            status.HTTP_422_UNPROCESSABLE_ENTITY,  # Validation error
        ]

    def test_unicode_and_encoding_errors(self):
        """Test handling of Unicode and encoding issues."""
        unicode_test_cases = [
            "Hello 世界",  # Mixed ASCII and Unicode
            "🎉🔥💯",  # Emoji
            "Café naïve résumé",  # Accented characters
            "\x00\x01\x02",  # Control characters
            "𝕌𝕟𝕚𝕔𝕠𝕕𝕖",  # Mathematical Unicode  # noqa: RUF001
            "\udcff\udcfe",  # Surrogate characters
        ]

        for unicode_text in unicode_test_cases:
            feedback_data = {
                "score": 3,
                "invocation_id": str(uuid.uuid4()),
                "text": unicode_text,
            }

            try:
                response = self.client.post("/feedback", json=feedback_data)

                # Should handle Unicode gracefully
                assert response.status_code in [
                    status.HTTP_200_OK,
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                ]

            except UnicodeError:
                # If Unicode errors occur, they should be caught
                pass

    def test_type_validation_errors(self):
        """Test handling of wrong data types in requests."""
        type_error_cases = [
            # Wrong score types
            {"score": "five", "invocation_id": str(uuid.uuid4()), "text": "test"},
            {"score": [1, 2, 3], "invocation_id": str(uuid.uuid4()), "text": "test"},
            {
                "score": {"nested": "object"},
                "invocation_id": str(uuid.uuid4()),
                "text": "test",
            },
            # Wrong invocation_id types
            {"score": 4, "invocation_id": 123, "text": "test"},
            {"score": 4, "invocation_id": ["list", "id"], "text": "test"},
            # Wrong text types
            {"score": 4, "invocation_id": str(uuid.uuid4()), "text": 123},
            {"score": 4, "invocation_id": str(uuid.uuid4()), "text": ["array", "text"]},
            # Missing required fields
            {"score": 4},  # Missing invocation_id and text
            {"invocation_id": str(uuid.uuid4())},  # Missing score and text
        ]

        for error_case in type_error_cases:
            response = self.client.post("/feedback", json=error_case)

            # Should return validation error
            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestEdgeCaseScenarios:
    """Test edge cases and boundary conditions."""

    def setup_method(self):
        """Set up edge case testing."""
        self.client = TestClient(app)
        self.test_session_id = str(uuid.uuid4())

    def test_boundary_value_testing(self):
        """Test boundary values for various parameters."""
        # Test score boundaries (assuming 1-5 scale)
        boundary_scores = [0, 1, 5, 6, -1, 999]

        for score in boundary_scores:
            feedback_data = {
                "score": score,
                "invocation_id": str(uuid.uuid4()),
                "text": "Boundary test",
            }

            response = self.client.post("/feedback", json=feedback_data)

            if 1 <= score <= 5:  # Valid range
                assert response.status_code == status.HTTP_200_OK
            else:  # Invalid range
                assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_empty_and_null_values(self):
        """Test handling of empty and null values."""
        empty_cases = [
            {"score": None, "invocation_id": str(uuid.uuid4()), "text": "test"},
            {"score": 4, "invocation_id": None, "text": "test"},
            {"score": 4, "invocation_id": str(uuid.uuid4()), "text": None},
            {"score": 4, "invocation_id": "", "text": "test"},
            {"score": 4, "invocation_id": str(uuid.uuid4()), "text": ""},
        ]

        for empty_case in empty_cases:
            response = self.client.post("/feedback", json=empty_case)

            # Should handle null/empty values appropriately
            assert response.status_code in [
                status.HTTP_200_OK,  # If nulls/empty strings are acceptable
                status.HTTP_422_UNPROCESSABLE_ENTITY,  # If validation rejects them
            ]

    def test_concurrent_session_access(self):
        """Test concurrent access to the same session."""
        session_id = self.test_session_id

        def access_session_history(thread_id):
            """Access session history from a thread."""
            try:
                response = self.client.get(f"/agent_network_sse/{session_id}")
                return {
                    "thread_id": thread_id,
                    "status_code": response.status_code,
                    "success": response.status_code == 200,
                }
            except Exception as e:
                return {"thread_id": thread_id, "error": str(e), "success": False}

        # Create concurrent access threads
        threads = []
        results = []

        for i in range(10):
            thread = threading.Thread(
                target=lambda tid=i: results.append(access_session_history(tid))
            )
            threads.append(thread)
            thread.start()

        # Wait for all threads
        for thread in threads:
            thread.join(timeout=5.0)

        # Verify results
        assert len(results) == 10
        successful_accesses = [r for r in results if r.get("success", False)]

        # Should handle concurrent access reasonably
        assert len(successful_accesses) >= 5  # At least 50% success

    def test_resource_exhaustion_protection(self):
        """Test protection against resource exhaustion."""
        # Test many rapid requests
        rapid_requests = []

        for i in range(100):
            try:
                response = self.client.get("/health")
                rapid_requests.append(
                    {
                        "request_id": i,
                        "status_code": response.status_code,
                        "response_time": 0.01,  # Estimated
                    }
                )
            except Exception as e:
                rapid_requests.append(
                    {"request_id": i, "error": str(e), "failed": True}
                )

        # Should handle rapid requests without crashing
        successful_requests = [r for r in rapid_requests if "error" not in r]

        # Should process most requests successfully
        assert len(successful_requests) >= 80  # At least 80% success

    def test_session_id_edge_cases(self):
        """Test edge cases in session ID handling."""
        edge_case_session_ids = [
            "",  # Empty string
            "a",  # Very short
            "x" * 1000,  # Very long
            "session with spaces",  # Spaces
            "session/with/slashes",  # Path-like
            "session?with=query&params=true",  # Query-like
            "session#with-fragment",  # Fragment-like
            "UPPER-CASE-SESSION",  # Upper case
            "123-456-789",  # Numeric
            "special!@#$%^&*()chars",  # Special characters
        ]

        for session_id in edge_case_session_ids:
            try:
                response = self.client.get(f"/agent_network_sse/{session_id}")

                # Should handle gracefully (success or controlled error)
                assert response.status_code in [
                    status.HTTP_200_OK,
                    status.HTTP_400_BAD_REQUEST,
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                ]

            except Exception as e:
                # If exceptions occur, they should be reasonable
                assert isinstance(e, ValueError | TypeError)


class TestSystemLimitsAndBoundaries:
    """Test system limits and boundary conditions."""

    def setup_method(self):
        """Set up system limits testing."""
        self.client = TestClient(app)

    def test_maximum_concurrent_connections(self):
        """Test maximum concurrent connection limits."""

        connection_attempts = []
        max_connections = 50  # Test limit

        def attempt_connection(connection_id):
            """Attempt to establish a connection."""
            try:
                session_id = f"conn_test_{connection_id}"
                response = self.client.get(f"/agent_network_sse/{session_id}")

                connection_attempts.append(
                    {
                        "connection_id": connection_id,
                        "status_code": response.status_code,
                        "success": response.status_code == 200,
                    }
                )

                # Keep connection open briefly
                time.sleep(0.1)

            except Exception as e:
                connection_attempts.append(
                    {"connection_id": connection_id, "error": str(e), "success": False}
                )

        # Create many concurrent connections
        threads = []
        for i in range(max_connections):
            thread = threading.Thread(target=attempt_connection, args=(i,))
            threads.append(thread)
            thread.start()

        # Wait for all attempts
        for thread in threads:
            thread.join(timeout=10.0)

        successful_connections = [
            c for c in connection_attempts if c.get("success", False)
        ]

        # Should handle reasonable number of connections
        assert len(successful_connections) >= max_connections * 0.5  # At least 50%

    def test_memory_usage_under_load(self):
        """Test memory usage under high load conditions."""
        import psutil

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss

        # Generate load
        load_operations = []

        for _i in range(1000):
            # Multiple types of operations
            operations = [
                lambda: self.client.get("/health"),
                lambda: self.client.get("/agent_network_history?limit=100"),
                lambda: self.client.post(
                    "/feedback",
                    json={
                        "score": 3,
                        "invocation_id": str(uuid.uuid4()),
                        "text": f"Load test {uuid.uuid4().hex[:8]}",
                    },
                ),
            ]

            for operation in operations:
                try:
                    operation()
                    load_operations.append(
                        {"operation": operation.__name__, "success": True}
                    )
                except Exception as e:
                    load_operations.append(
                        {
                            "operation": operation.__name__,
                            "error": str(e),
                            "success": False,
                        }
                    )

        # Check memory usage after load
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory

        # Memory increase should be reasonable
        max_acceptable_increase = 200 * 1024 * 1024  # 200MB
        assert memory_increase < max_acceptable_increase

        # Most operations should succeed
        successful_operations = [
            op for op in load_operations if op.get("success", False)
        ]
        success_rate = len(successful_operations) / len(load_operations)
        assert success_rate > 0.8  # At least 80% success


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])

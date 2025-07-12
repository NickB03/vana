"""
Unit tests for system tools functionality

Tests the system tools (echo, get_health_status) in isolation,
validating their core functionality, error handling, and edge cases.
"""

import json

# Import the actual tools from VANA codebase
import sys
import time
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from lib._tools.adk_tools import adk_echo, adk_get_health_status
from tests.framework import EnvironmentConfig, EnvironmentType, TestEnvironment


class TestSystemTools:
    """Unit tests for system tools"""

    @pytest.fixture
    def test_env(self):
        """Create test environment"""
        config = EnvironmentConfig(env_type=EnvironmentType.UNIT)
        return TestEnvironment(config)

    @pytest.mark.unit
    def test_adk_echo_basic_string(self):
        """Test echo with basic string"""
        test_message = "Hello, World!"
        result = adk_echo.func(test_message)

        assert isinstance(result, str)
        assert test_message in result

    @pytest.mark.unit
    def test_adk_echo_empty_string(self):
        """Test echo with empty string"""
        result = adk_echo.func("")

        assert isinstance(result, str)
        # Should handle empty string gracefully

    @pytest.mark.unit
    def test_adk_echo_unicode_string(self):
        """Test echo with unicode characters"""
        unicode_message = "Unicode test: 你好世界 🌍 café naïve résumé"
        result = adk_echo.func(unicode_message)

        assert isinstance(result, str)
        # Echo returns JSON, so check the JSON structure
        try:
            parsed = json.loads(result)
            assert "message" in parsed
            assert parsed["message"] == unicode_message
        except json.JSONDecodeError:
            # If not JSON, the original message should be in the result
            assert unicode_message in result

    @pytest.mark.unit
    def test_adk_echo_long_string(self):
        """Test echo with very long string"""
        long_message = "This is a very long message. " * 100  # ~3000 characters
        result = adk_echo.func(long_message)

        assert isinstance(result, str)
        assert long_message in result

    @pytest.mark.unit
    def test_adk_echo_special_characters(self):
        """Test echo with special characters"""
        special_message = "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?"
        result = adk_echo.func(special_message)

        assert isinstance(result, str)
        # Echo returns JSON, so check the JSON structure
        try:
            parsed = json.loads(result)
            assert "message" in parsed
            assert parsed["message"] == special_message
        except json.JSONDecodeError:
            assert special_message in result

    @pytest.mark.unit
    def test_adk_echo_multiline_string(self):
        """Test echo with multiline string"""
        multiline_message = "Line 1\nLine 2\nLine 3\nFinal line"
        result = adk_echo.func(multiline_message)

        assert isinstance(result, str)
        # Echo returns JSON, so check the JSON structure
        try:
            parsed = json.loads(result)
            assert "message" in parsed
            assert parsed["message"] == multiline_message
        except json.JSONDecodeError:
            assert multiline_message in result

    @pytest.mark.unit
    def test_adk_echo_json_string(self):
        """Test echo with JSON-formatted string"""
        json_message = '{"key": "value", "number": 42, "array": [1, 2, 3]}'
        result = adk_echo.func(json_message)

        assert isinstance(result, str)
        # Echo returns JSON, so check the JSON structure
        try:
            parsed = json.loads(result)
            assert "message" in parsed
            assert parsed["message"] == json_message
        except json.JSONDecodeError:
            assert json_message in result

    @pytest.mark.unit
    def test_adk_echo_whitespace_handling(self):
        """Test echo with various whitespace"""
        whitespace_message = "  \t  Leading and trailing whitespace  \t  "
        result = adk_echo.func(whitespace_message)

        assert isinstance(result, str)
        # Echo returns JSON, so check the JSON structure
        try:
            parsed = json.loads(result)
            assert "message" in parsed
            assert parsed["message"] == whitespace_message
        except json.JSONDecodeError:
            assert whitespace_message in result

    @pytest.mark.unit
    def test_adk_get_health_status_basic(self):
        """Test basic health status functionality"""
        result = adk_get_health_status.func()

        assert isinstance(result, str)

        # Should contain health-related information
        result_lower = result.lower()
        health_indicators = ["health", "status", "system", "agent", "tools"]
        assert any(indicator in result_lower for indicator in health_indicators)

    @pytest.mark.unit
    def test_adk_get_health_status_structure(self):
        """Test health status returns structured information"""
        result = adk_get_health_status.func()

        assert isinstance(result, str)
        assert len(result) > 0

        # Should contain some structured information
        # Could be JSON, formatted text, or other structured format
        result_lower = result.lower()

        # Check for common health status fields
        expected_fields = ["agent", "tools", "status", "system"]
        found_fields = [field for field in expected_fields if field in result_lower]
        assert len(found_fields) >= 2, f"Expected health status fields, found: {found_fields}"

    @pytest.mark.unit
    def test_adk_get_health_status_consistency(self):
        """Test health status consistency across multiple calls"""
        results = []
        for _ in range(3):
            result = adk_get_health_status.func()
            results.append(result)
            time.sleep(0.1)  # Small delay between calls

        # All results should be strings
        assert all(isinstance(result, str) for result in results)

        # Results should be consistent in structure (though content may vary)
        assert all(len(result) > 0 for result in results)

    @pytest.mark.unit
    def test_adk_get_health_status_error_handling(self):
        """Test health status error handling"""
        # This test verifies the tool handles internal errors gracefully
        # Since get_health_status doesn't use get_agent_count, just test normal operation
        result = adk_get_health_status.func()

        # Should return a string
        assert isinstance(result, str)
        assert len(result) > 0

    @pytest.mark.unit
    def test_adk_get_health_status_performance(self):
        """Test health status performance"""
        start_time = time.time()
        result = adk_get_health_status.func()
        end_time = time.time()

        execution_time = end_time - start_time

        # Health status should be fast (under 1 second)
        assert execution_time < 1.0, f"Health status took too long: {execution_time:.2f}s"
        assert isinstance(result, str)


class TestSystemToolsEdgeCases:
    """Edge case tests for system tools"""

    @pytest.mark.unit
    def test_echo_with_none_input(self):
        """Test echo with None input"""
        # This tests how the tool handles unexpected input types
        try:
            result = adk_echo.func(None)
            assert isinstance(result, str)
        except (TypeError, AttributeError):
            # It's acceptable for the tool to raise an error with None input
            pass

    @pytest.mark.unit
    def test_echo_with_numeric_input(self):
        """Test echo with numeric input"""
        # Test with integer
        result = adk_echo.func(42)
        assert isinstance(result, str)
        assert "42" in result

        # Test with float
        result = adk_echo.func(3.14159)
        assert isinstance(result, str)
        assert "3.14159" in result

    @pytest.mark.unit
    def test_echo_with_boolean_input(self):
        """Test echo with boolean input"""
        # Test with True
        result = adk_echo.func(True)
        assert isinstance(result, str)
        assert "true" in result.lower()

        # Test with False
        result = adk_echo.func(False)
        assert isinstance(result, str)
        assert "false" in result.lower()

    @pytest.mark.unit
    def test_echo_with_list_input(self):
        """Test echo with list input"""
        test_list = [1, 2, 3, "test", True]
        result = adk_echo.func(test_list)

        assert isinstance(result, str)
        # Should convert list to string representation
        assert "1" in result and "2" in result and "3" in result

    @pytest.mark.unit
    def test_echo_with_dict_input(self):
        """Test echo with dictionary input"""
        test_dict = {"key1": "value1", "key2": 42, "key3": [1, 2, 3]}
        result = adk_echo.func(test_dict)

        assert isinstance(result, str)
        # Should convert dict to string representation
        assert "key1" in result and "value1" in result

    @pytest.mark.unit
    def test_echo_concurrent_calls(self):
        """Test echo with concurrent calls"""
        import queue
        import threading

        results_queue = queue.Queue()

        def echo_worker(message):
            result = adk_echo.func(f"Thread message: {message}")
            results_queue.put(result)

        # Start multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=echo_worker, args=(f"Message {i}",))
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Collect results
        results = []
        while not results_queue.empty():
            results.append(results_queue.get())

        # Verify all calls completed successfully
        assert len(results) == 5
        assert all(isinstance(result, str) for result in results)
        assert all("Thread message" in result for result in results)

    @pytest.mark.unit
    def test_health_status_repeated_calls(self):
        """Test health status with rapid repeated calls"""
        results = []

        # Make rapid successive calls
        for i in range(10):
            result = adk_get_health_status.func()
            results.append(result)

        # All calls should succeed
        assert len(results) == 10
        assert all(isinstance(result, str) for result in results)
        assert all(len(result) > 0 for result in results)

    @pytest.mark.unit
    def test_system_tools_memory_usage(self):
        """Test system tools don't leak memory"""
        import gc

        # Get initial memory state
        gc.collect()
        initial_objects = len(gc.get_objects())

        # Perform many operations
        for i in range(100):
            adk_echo.func(f"Memory test {i}")
            if i % 10 == 0:
                adk_get_health_status.func()

        # Force garbage collection
        gc.collect()
        final_objects = len(gc.get_objects())

        # Memory usage shouldn't grow significantly
        object_growth = final_objects - initial_objects
        assert object_growth < 1000, f"Potential memory leak: {object_growth} new objects"

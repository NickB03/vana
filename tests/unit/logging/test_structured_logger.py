"""
Tests for VANA Structured Logger
"""

import pytest
import json
import logging
from unittest.mock import patch, MagicMock
from lib.logging.structured_logger import StructuredLogger, LogEntry

class TestStructuredLogger:
    """Test cases for StructuredLogger."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.logger = StructuredLogger("test_component", "test_correlation_id")
    
    def test_log_entry_creation(self):
        """Test LogEntry creation and JSON serialization."""
        entry = LogEntry(
            timestamp=1234567890.0,
            level="info",
            message="Test message",
            correlation_id="test_id",
            component="test_component",
            metadata={"key": "value"}
        )
        
        json_str = entry.to_json()
        parsed = json.loads(json_str)
        
        assert parsed["timestamp"] == 1234567890.0
        assert parsed["level"] == "info"
        assert parsed["message"] == "Test message"
        assert parsed["correlation_id"] == "test_id"
        assert parsed["component"] == "test_component"
        assert parsed["metadata"]["key"] == "value"
    
    @patch('logging.getLogger')
    def test_structured_logging(self, mock_get_logger):
        """Test structured logging functionality."""
        mock_logger = MagicMock()
        mock_get_logger.return_value = mock_logger
        
        logger = StructuredLogger("test_component", "test_correlation_id")
        logger.info("Test message", extra_data="test_value")
        
        # Verify logger was called
        mock_logger.log.assert_called_once()
        
        # Get the logged JSON and parse it
        call_args = mock_logger.log.call_args
        log_level = call_args[0][0]
        json_message = call_args[0][1]
        
        assert log_level == logging.INFO
        
        parsed = json.loads(json_message)
        assert parsed["level"] == "info"
        assert parsed["message"] == "Test message"
        assert parsed["correlation_id"] == "test_correlation_id"
        assert parsed["component"] == "test_component"
        assert parsed["metadata"]["extra_data"] == "test_value"
    
    @patch('logging.getLogger')
    def test_all_log_levels(self, mock_get_logger):
        """Test all log levels."""
        mock_logger = MagicMock()
        mock_get_logger.return_value = mock_logger
        
        logger = StructuredLogger("test_component")
        
        # Test all log levels
        logger.debug("Debug message")
        logger.info("Info message")
        logger.warning("Warning message")
        logger.error("Error message")
        logger.critical("Critical message")
        
        # Should have called log 5 times
        assert mock_logger.log.call_count == 5
        
        # Check log levels
        calls = mock_logger.log.call_args_list
        expected_levels = [logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR, logging.CRITICAL]
        
        for i, expected_level in enumerate(expected_levels):
            assert calls[i][0][0] == expected_level
    
    def test_correlation_id_inheritance(self):
        """Test correlation ID inheritance."""
        original_logger = StructuredLogger("test_component", "original_id")
        new_logger = original_logger.with_correlation_id("new_id")
        
        assert original_logger.correlation_id == "original_id"
        assert new_logger.correlation_id == "new_id"
        assert new_logger.component == "test_component"
    
    def test_auto_generated_correlation_id(self):
        """Test automatic correlation ID generation."""
        logger = StructuredLogger("test_component")
        
        # Should have generated a correlation ID
        assert logger.correlation_id is not None
        assert len(logger.correlation_id) > 0
        
        # Should be different for different instances
        logger2 = StructuredLogger("test_component")
        assert logger.correlation_id != logger2.correlation_id
    
    @patch('logging.getLogger')
    def test_metadata_handling(self, mock_get_logger):
        """Test metadata handling in logs."""
        mock_logger = MagicMock()
        mock_get_logger.return_value = mock_logger
        
        logger = StructuredLogger("test_component")
        
        # Log with various metadata types
        logger.info(
            "Test message",
            string_value="test",
            int_value=42,
            float_value=3.14,
            bool_value=True,
            list_value=[1, 2, 3],
            dict_value={"nested": "data"}
        )
        
        # Get the logged JSON and parse it
        json_message = mock_logger.log.call_args[0][1]
        parsed = json.loads(json_message)
        
        metadata = parsed["metadata"]
        assert metadata["string_value"] == "test"
        assert metadata["int_value"] == 42
        assert metadata["float_value"] == 3.14
        assert metadata["bool_value"] is True
        assert metadata["list_value"] == [1, 2, 3]
        assert metadata["dict_value"]["nested"] == "data"
    
    @patch('time.time')
    @patch('logging.getLogger')
    def test_timestamp_accuracy(self, mock_get_logger, mock_time):
        """Test timestamp accuracy in logs."""
        mock_logger = MagicMock()
        mock_get_logger.return_value = mock_logger
        mock_time.return_value = 1234567890.123
        
        logger = StructuredLogger("test_component")
        logger.info("Test message")
        
        # Get the logged JSON and parse it
        json_message = mock_logger.log.call_args[0][1]
        parsed = json.loads(json_message)
        
        assert parsed["timestamp"] == 1234567890.123

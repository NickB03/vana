#!/usr/bin/env python3
"""
Test script for VANA Logging Framework

This script tests the new centralized logging configuration and utilities
to ensure they work correctly in different environments.
"""

import os
import sys
import time
import tempfile
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib.logging_config import setup_logging, get_logger, get_structured_logger
from lib.logging_utils import (
    LoggerMixin, log_function_call, log_operation, log_performance,
    log_info, log_error, create_correlation_id, set_correlation_id
)


class TestComponent(LoggerMixin):
    """Test component using LoggerMixin."""
    
    def __init__(self):
        super().__init__()
        self.setup_logger("test_component")
    
    def test_logging_methods(self):
        """Test all logging methods."""
        self.log_debug("This is a debug message")
        self.log_info("This is an info message", "test_operation")
        self.log_warning("This is a warning message", "test_operation", extra_data="test")
        self.log_error("This is an error message", "test_operation", test_value=123)


@log_function_call("test_decorator", log_args=True, log_result=True)
def test_decorated_function(arg1: str, arg2: int = 42) -> str:
    """Test function with logging decorator."""
    time.sleep(0.1)  # Simulate some work
    return f"Result: {arg1} + {arg2}"


@log_performance
def test_performance_function():
    """Test function with performance logging."""
    time.sleep(0.2)  # Simulate some work
    return "Performance test complete"


def test_basic_logging():
    """Test basic logging functionality."""
    print("🔧 Testing basic logging functionality...")
    
    # Test standard logger
    logger = get_logger("vana.test")
    logger.debug("Debug message from standard logger")
    logger.info("Info message from standard logger")
    logger.warning("Warning message from standard logger")
    logger.error("Error message from standard logger")
    
    # Test structured logger
    structured_logger = get_structured_logger("test_structured")
    structured_logger.debug("Debug message from structured logger")
    structured_logger.info("Info message from structured logger", "test_operation")
    structured_logger.warning("Warning message from structured logger", "test_operation", {"key": "value"})
    structured_logger.error("Error message from structured logger", "test_operation", {"error_code": 500})
    
    print("✅ Basic logging test completed")


def test_logger_mixin():
    """Test LoggerMixin functionality."""
    print("🔧 Testing LoggerMixin functionality...")
    
    component = TestComponent()
    component.test_logging_methods()
    
    print("✅ LoggerMixin test completed")


def test_decorators():
    """Test logging decorators."""
    print("🔧 Testing logging decorators...")
    
    # Test function call decorator
    result = test_decorated_function("test", 100)
    print(f"Decorated function result: {result}")
    
    # Test performance decorator
    perf_result = test_performance_function()
    print(f"Performance function result: {perf_result}")
    
    print("✅ Decorators test completed")


def test_context_manager():
    """Test logging context manager."""
    print("🔧 Testing logging context manager...")
    
    # Test successful operation
    with log_operation("test_successful_operation", "test_context"):
        time.sleep(0.1)
        print("  Doing some work...")
    
    # Test failed operation
    try:
        with log_operation("test_failed_operation", "test_context"):
            time.sleep(0.1)
            raise ValueError("Simulated error")
    except ValueError:
        print("  Expected error caught")
    
    print("✅ Context manager test completed")


def test_correlation_id():
    """Test correlation ID functionality."""
    print("🔧 Testing correlation ID functionality...")
    
    # Create correlation ID
    correlation_id = create_correlation_id()
    print(f"Created correlation ID: {correlation_id}")
    
    # Set correlation ID for structured logger
    set_correlation_id(correlation_id, "test_correlation")
    
    # Log with correlation ID
    logger = get_structured_logger("test_correlation")
    logger.info("Message with correlation ID", "correlation_test")
    
    print("✅ Correlation ID test completed")


def test_convenience_functions():
    """Test convenience logging functions."""
    print("🔧 Testing convenience logging functions...")
    
    log_info("Info message via convenience function", "test_convenience")
    log_error("Error message via convenience function", "test_convenience", test_data="example")
    
    print("✅ Convenience functions test completed")


def test_environment_detection():
    """Test environment-specific configuration."""
    print("🔧 Testing environment detection...")
    
    # Test different environment variables
    original_env = os.environ.get("K_SERVICE")
    
    # Test production environment (Cloud Run)
    os.environ["K_SERVICE"] = "vana-prod"
    config = setup_logging()
    print(f"Production environment detected: {config.environment}")
    
    # Clean up
    if original_env:
        os.environ["K_SERVICE"] = original_env
    else:
        os.environ.pop("K_SERVICE", None)
    
    print("✅ Environment detection test completed")


def test_log_levels():
    """Test different log levels."""
    print("🔧 Testing log levels...")
    
    # Test with different log levels
    original_level = os.environ.get("VANA_LOG_LEVEL")
    
    for level in ["DEBUG", "INFO", "WARNING", "ERROR"]:
        os.environ["VANA_LOG_LEVEL"] = level
        config = setup_logging()
        logger = get_logger("vana.level_test")
        logger.debug(f"Debug message at {level} level")
        logger.info(f"Info message at {level} level")
        logger.warning(f"Warning message at {level} level")
        logger.error(f"Error message at {level} level")
    
    # Clean up
    if original_level:
        os.environ["VANA_LOG_LEVEL"] = original_level
    else:
        os.environ.pop("VANA_LOG_LEVEL", None)
    
    print("✅ Log levels test completed")


def main():
    """Run all logging framework tests."""
    print("🚀 Starting VANA Logging Framework Tests")
    print("=" * 50)
    
    # Setup logging
    config = setup_logging()
    print(f"Environment: {config.environment}")
    print(f"Log level: {config.log_level}")
    print(f"Log directory: {config.log_dir}")
    print()
    
    # Run tests
    test_basic_logging()
    print()
    
    test_logger_mixin()
    print()
    
    test_decorators()
    print()
    
    test_context_manager()
    print()
    
    test_correlation_id()
    print()
    
    test_convenience_functions()
    print()
    
    test_environment_detection()
    print()
    
    test_log_levels()
    print()
    
    print("=" * 50)
    print("🎉 All logging framework tests completed successfully!")
    
    # Show log files if they exist
    if config.log_dir and os.path.exists(config.log_dir):
        print(f"\n📁 Log files created in: {config.log_dir}")
        for log_file in os.listdir(config.log_dir):
            file_path = os.path.join(config.log_dir, log_file)
            file_size = os.path.getsize(file_path)
            print(f"  - {log_file} ({file_size} bytes)")


if __name__ == "__main__":
    main()

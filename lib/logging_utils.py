"""
VANA Logging Utilities

This module provides convenient logging utilities and functions for the VANA project.
It offers simple interfaces for common logging patterns and integrates with the
centralized logging configuration.
"""

import functools
import time
from contextlib import contextmanager
from typing import Callable, Optional

from .logging_config import get_logger, get_structured_logger


class LoggerMixin:
    """
    Mixin class that provides logging capabilities to any class.

    Usage:
        class MyClass(LoggerMixin):
            def __init__(self):
                super().__init__()
                self.setup_logger("my_component")

            def my_method(self):
                self.log_info("Doing something")
    """

    def setup_logger(self, component: str, structured: bool = True) -> None:
        """
        Set up logging for the class.

        Args:
            component: Component name for the logger
            structured: Whether to use structured logging (default: True)
        """
        self.component = component
        if structured:
            self.logger = get_structured_logger(component)
        else:
            self.logger = get_logger(f"vana.{component}")

    def log_debug(self, message: str, operation: Optional[str] = None, **kwargs) -> None:
        """Log a debug message."""
        if hasattr(self.logger, "debug") and hasattr(self.logger, "component"):
            # Structured logger
            self.logger.debug(message, operation, kwargs if kwargs else None)
        else:
            # Standard logger
            self.logger.debug(message)

    def log_info(self, message: str, operation: Optional[str] = None, **kwargs) -> None:
        """Log an info message."""
        if hasattr(self.logger, "info") and hasattr(self.logger, "component"):
            # Structured logger
            self.logger.info(message, operation, kwargs if kwargs else None)
        else:
            # Standard logger
            self.logger.info(message)

    def log_warning(self, message: str, operation: Optional[str] = None, **kwargs) -> None:
        """Log a warning message."""
        if hasattr(self.logger, "warning") and hasattr(self.logger, "component"):
            # Structured logger
            self.logger.warning(message, operation, kwargs if kwargs else None)
        else:
            # Standard logger
            self.logger.warning(message)

    def log_error(self, message: str, operation: Optional[str] = None, exc_info: bool = False, **kwargs) -> None:
        """Log an error message."""
        if hasattr(self.logger, "error") and hasattr(self.logger, "component"):
            # Structured logger
            self.logger.error(message, operation, kwargs if kwargs else None, exc_info)
        else:
            # Standard logger
            self.logger.error(message, exc_info=exc_info)

    def log_critical(self, message: str, operation: Optional[str] = None, exc_info: bool = False, **kwargs) -> None:
        """Log a critical message."""
        if hasattr(self.logger, "critical") and hasattr(self.logger, "component"):
            # Structured logger
            self.logger.critical(message, operation, kwargs if kwargs else None, exc_info)
        else:
            # Standard logger
            self.logger.critical(message, exc_info=exc_info)


def log_function_call(logger_name: str = None, log_args: bool = False, log_result: bool = False):
    """
    Decorator to log function calls.

    Args:
        logger_name: Name of the logger to use (default: function's module)
        log_args: Whether to log function arguments (default: False)
        log_result: Whether to log function result (default: False)

    Usage:
        @log_function_call("my_component", log_args=True)
        def my_function(arg1, arg2):
            return "result"
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get logger
            if logger_name:
                logger = get_logger(f"vana.{logger_name}")
            else:
                logger = get_logger(func.__module__)

            # Log function entry
            func_name = f"{func.__module__}.{func.__name__}"
            if log_args:
                logger.debug(f"Calling {func_name} with args={args}, kwargs={kwargs}")
            else:
                logger.debug(f"Calling {func_name}")

            try:
                # Execute function
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time

                # Log success
                if log_result:
                    logger.debug(f"{func_name} completed in {execution_time:.3f}s, result={result}")
                else:
                    logger.debug(f"{func_name} completed in {execution_time:.3f}s")

                return result

            except Exception as e:
                # Log error
                logger.error(f"{func_name} failed: {e}", exc_info=True)
                raise

        return wrapper

    return decorator


@contextmanager
def log_operation(operation: str, component: str = "vana", log_level: str = "info"):
    """
    Context manager to log the start and end of an operation.

    Args:
        operation: Name of the operation
        component: Component performing the operation
        log_level: Log level to use (default: "info")

    Usage:
        with log_operation("data_processing", "data_science"):
            # Do some work
            process_data()
    """
    logger = get_structured_logger(component)
    log_func = getattr(logger, log_level.lower())

    # Log operation start
    start_time = time.time()
    log_func(f"Starting {operation}", operation)

    try:
        yield
        # Log operation success
        execution_time = time.time() - start_time
        log_func(
            f"Completed {operation} in {execution_time:.3f}s",
            operation,
            {"status": "success", "execution_time": execution_time},
        )

    except Exception as e:
        # Log operation failure
        execution_time = time.time() - start_time
        logger.error(
            f"Failed {operation} after {execution_time:.3f}s: {e}",
            operation,
            {"status": "failure", "execution_time": execution_time, "error": str(e)},
            exc_info=True,
        )
        raise


def log_performance(func: Callable) -> Callable:
    """
    Decorator to log function performance metrics.

    Usage:
        @log_performance
        def slow_function():
            time.sleep(1)
            return "done"
    """

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = get_structured_logger("performance")
        func_name = f"{func.__module__}.{func.__name__}"

        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time

            # Log performance metrics
            logger.info(
                f"Performance: {func_name}",
                "performance_monitoring",
                {"function": func_name, "execution_time": execution_time, "status": "success"},
            )

            return result

        except Exception as e:
            execution_time = time.time() - start_time

            # Log performance metrics for failed function
            logger.error(
                f"Performance: {func_name} failed",
                "performance_monitoring",
                {"function": func_name, "execution_time": execution_time, "status": "failure", "error": str(e)},
            )

            raise

    return wrapper


def create_correlation_id() -> str:
    """
    Create a correlation ID for tracking operations across components.

    Returns:
        Correlation ID string
    """
    import uuid

    return str(uuid.uuid4())


def set_correlation_id(correlation_id: str, component: str) -> None:
    """
    Set correlation ID for a component's structured logger.

    Args:
        correlation_id: Correlation ID to set
        component: Component name
    """
    logger = get_structured_logger(component)
    if hasattr(logger, "set_correlation_id"):
        logger.set_correlation_id(correlation_id)


# Convenience functions for quick logging
def log_debug(message: str, component: str = "vana", **kwargs) -> None:
    """Quick debug logging."""
    logger = get_structured_logger(component)
    logger.debug(message, extra=kwargs if kwargs else None)


def log_info(message: str, component: str = "vana", **kwargs) -> None:
    """Quick info logging."""
    logger = get_structured_logger(component)
    logger.info(message, extra=kwargs if kwargs else None)


def log_warning(message: str, component: str = "vana", **kwargs) -> None:
    """Quick warning logging."""
    logger = get_structured_logger(component)
    logger.warning(message, extra=kwargs if kwargs else None)


def log_error(message: str, component: str = "vana", exc_info: bool = False, **kwargs) -> None:
    """Quick error logging."""
    logger = get_structured_logger(component)
    logger.error(message, extra=kwargs if kwargs else None, exc_info=exc_info)


def log_critical(message: str, component: str = "vana", exc_info: bool = False, **kwargs) -> None:
    """Quick critical logging."""
    logger = get_structured_logger(component)
    logger.critical(message, extra=kwargs if kwargs else None, exc_info=exc_info)

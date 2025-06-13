import functools
import time
from typing import Callable, Any
from .performance_monitor import PerformanceMonitor

class APM:
    """Application Performance Monitoring decorator and context manager."""
    
    def __init__(self, monitor: PerformanceMonitor):
        self.monitor = monitor
    
    def trace(self, operation_name: str = None, tags: dict = None):
        """Decorator to trace function execution time."""
        def decorator(func: Callable) -> Callable:
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            @functools.wraps(func)
            def wrapper(*args, **kwargs) -> Any:
                start_time = time.time()
                success = True
                error = None
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = False
                    error = str(e)
                    raise
                finally:
                    duration = time.time() - start_time
                    self.monitor.record_response_time(
                        op_name, 
                        duration, 
                        success=success,
                        **(tags or {})
                    )
                    
                    if error:
                        self.monitor.record_metric(
                            f"errors.{op_name}",
                            1,
                            "count",
                            tags={"error": error}
                        )
            
            return wrapper
        return decorator
    
    def trace_async(self, operation_name: str = None, tags: dict = None):
        """Decorator to trace async function execution time."""
        def decorator(func: Callable) -> Callable:
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            @functools.wraps(func)
            async def wrapper(*args, **kwargs) -> Any:
                start_time = time.time()
                success = True
                error = None
                
                try:
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    success = False
                    error = str(e)
                    raise
                finally:
                    duration = time.time() - start_time
                    self.monitor.record_response_time(
                        op_name, 
                        duration, 
                        success=success,
                        **(tags or {})
                    )
                    
                    if error:
                        self.monitor.record_metric(
                            f"errors.{op_name}",
                            1,
                            "count",
                            tags={"error": error}
                        )
            
            return wrapper
        return decorator

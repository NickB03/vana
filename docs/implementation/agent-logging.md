# Agent Logging System Implementation

[Home](../../index.md) > [Implementation](../index.md) > Agent Logging System

This document describes the implementation of the logging system for the VANA agent.

## Overview

The VANA agent logging system provides a comprehensive logging solution with support for different log levels, formatting, and storage. It is designed to be flexible and configurable, allowing for both console and file output, log rotation, and structured logging.

The logging system is implemented in the `agent/logging.py` file and provides a consistent interface for logging messages at different levels.

## Components

### VanaLogger Class

The `VanaLogger` class is the main class for the logging system. It provides methods for:

- Logging messages at different levels (debug, info, warning, error, critical)
- Configuring log output (console, file)
- Setting log levels
- Formatting log messages
- Rotating log files
- Structured logging (JSON format)

#### Key Methods

```python
def __init__(
    self,
    name: str = "vana",
    level: str = "info",
    log_dir: Optional[str] = None,
    console: bool = True,
    file: bool = True,
    max_bytes: int = 10 * 1024 * 1024,  # 10 MB
    backup_count: int = 5,
    structured: bool = False
):
    """
    Initialize the logger.
    
    Args:
        name: Logger name
        level: Log level (debug, info, warning, error, critical)
        log_dir: Directory to store log files
        console: Whether to log to console
        file: Whether to log to file
        max_bytes: Maximum size of log files before rotation
        backup_count: Number of backup log files to keep
        structured: Whether to use structured (JSON) logging
    """
```

The constructor initializes the logger with the specified configuration.

```python
def _add_console_handler(self):
    """Add a console handler to the logger."""
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(self.level)
    
    if self.structured:
        formatter = logging.Formatter('%(message)s')
    else:
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    console_handler.setFormatter(formatter)
    self.logger.addHandler(console_handler)
```

The `_add_console_handler` method adds a console handler to the logger for outputting log messages to the console.

```python
def _add_file_handler(self):
    """Add a file handler to the logger."""
    # Create log directory if it doesn't exist
    os.makedirs(self.log_dir, exist_ok=True)
    
    # Create log file path
    log_file = os.path.join(self.log_dir, f"{self.name}.log")
    
    # Create rotating file handler
    file_handler = logging.handlers.RotatingFileHandler(
        log_file,
        maxBytes=self.max_bytes,
        backupCount=self.backup_count
    )
    file_handler.setLevel(self.level)
    
    if self.structured:
        formatter = logging.Formatter('%(message)s')
    else:
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    file_handler.setFormatter(formatter)
    self.logger.addHandler(file_handler)
```

The `_add_file_handler` method adds a file handler to the logger for outputting log messages to a file. It supports log rotation to prevent log files from growing too large.

```python
def _format_structured(self, level: str, message: str, **kwargs) -> str:
    """
    Format a structured log message.
    
    Args:
        level: Log level
        message: Log message
        **kwargs: Additional log data
        
    Returns:
        Formatted log message
    """
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "level": level,
        "name": self.name,
        "message": message
    }
    
    # Add additional data
    if kwargs:
        log_data["data"] = kwargs
    
    return json.dumps(log_data)
```

The `_format_structured` method formats a log message as a JSON string for structured logging.

```python
def debug(self, message: str, **kwargs):
    """
    Log a debug message.
    
    Args:
        message: Log message
        **kwargs: Additional log data
    """
    if self.structured:
        message = self._format_structured("debug", message, **kwargs)
    elif kwargs:
        message = f"{message} - {json.dumps(kwargs)}"
    
    self.logger.debug(message)
```

The `debug` method logs a message at the debug level. Similar methods exist for other log levels (info, warning, error, critical).

```python
def log_tool_call(self, tool_name: str, args: Dict[str, Any], result: Any):
    """
    Log a tool call.
    
    Args:
        tool_name: Name of the tool
        args: Tool arguments
        result: Tool result
    """
    self.info(
        f"Tool call: {tool_name}",
        tool=tool_name,
        args=args,
        result=result
    )
```

The `log_tool_call` method logs a tool call with the tool name, arguments, and result.

```python
def log_session_start(self, session_id: str, user_id: str):
    """
    Log a session start.
    
    Args:
        session_id: Session ID
        user_id: User ID
    """
    self.info(
        f"Session started: {session_id}",
        session_id=session_id,
        user_id=user_id,
        event="session_start"
    )
```

The `log_session_start` method logs a session start event with the session ID and user ID.

```python
def log_session_end(self, session_id: str, user_id: str):
    """
    Log a session end.
    
    Args:
        session_id: Session ID
        user_id: User ID
    """
    self.info(
        f"Session ended: {session_id}",
        session_id=session_id,
        user_id=user_id,
        event="session_end"
    )
```

The `log_session_end` method logs a session end event with the session ID and user ID.

```python
def log_message(self, session_id: str, user_id: str, role: str, content: str):
    """
    Log a message.
    
    Args:
        session_id: Session ID
        user_id: User ID
        role: Message role (user or assistant)
        content: Message content
    """
    self.info(
        f"Message ({role}): {content[:50]}{'...' if len(content) > 50 else ''}",
        session_id=session_id,
        user_id=user_id,
        role=role,
        content=content,
        event="message"
    )
```

The `log_message` method logs a message event with the session ID, user ID, role, and content.

### Convenience Functions

The logging system provides convenience functions for creating and using loggers:

```python
# Create a default logger
default_logger = VanaLogger()

# Convenience functions
def get_logger(name: str = "vana", **kwargs) -> VanaLogger:
    """
    Get a logger with the specified name and configuration.
    
    Args:
        name: Logger name
        **kwargs: Logger configuration
        
    Returns:
        Configured logger
    """
    return VanaLogger(name=name, **kwargs)

def set_default_logger(logger: VanaLogger):
    """
    Set the default logger.
    
    Args:
        logger: Logger to set as default
    """
    global default_logger
    default_logger = logger

def debug(message: str, **kwargs):
    """
    Log a debug message with the default logger.
    
    Args:
        message: Log message
        **kwargs: Additional log data
    """
    default_logger.debug(message, **kwargs)
```

These functions provide a convenient way to create and use loggers without having to create a `VanaLogger` instance directly.

## Log Levels

The logging system supports the following log levels:

- **debug**: Detailed information, typically of interest only when diagnosing problems
- **info**: Confirmation that things are working as expected
- **warning**: An indication that something unexpected happened, or may happen in the near future
- **error**: Due to a more serious problem, the software has not been able to perform some function
- **critical**: A serious error, indicating that the program itself may be unable to continue running

## Log Rotation

The logging system supports log rotation to prevent log files from growing too large. When a log file reaches the specified maximum size, it is rotated and a new log file is created. The system keeps a specified number of backup log files.

```python
file_handler = logging.handlers.RotatingFileHandler(
    log_file,
    maxBytes=self.max_bytes,
    backupCount=self.backup_count
)
```

## Structured Logging

The logging system supports structured logging, which formats log messages as JSON strings. This is useful for log analysis tools that can parse JSON.

```python
def _format_structured(self, level: str, message: str, **kwargs) -> str:
    log_data = {
        "timestamp": datetime.now().isoformat(),
        "level": level,
        "name": self.name,
        "message": message
    }
    
    # Add additional data
    if kwargs:
        log_data["data"] = kwargs
    
    return json.dumps(log_data)
```

## Usage

The logging system can be used in several ways:

1. **Using the default logger**:
   ```python
   from agent.logging import debug, info, warning, error, critical
   
   debug("Debug message")
   info("Info message")
   warning("Warning message")
   error("Error message")
   critical("Critical message")
   ```

2. **Creating a custom logger**:
   ```python
   from agent.logging import get_logger
   
   logger = get_logger("custom_logger", level="debug", structured=True)
   logger.debug("Debug message")
   logger.info("Info message with data", key="value")
   ```

3. **Setting the default logger**:
   ```python
   from agent.logging import get_logger, set_default_logger, info
   
   custom_logger = get_logger("custom_logger", level="debug")
   set_default_logger(custom_logger)
   info("This will use the custom logger")
   ```

For more detailed usage instructions, see the [Interpreting VANA Logs](../guides/interpreting-logs.md) guide.

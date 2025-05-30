# Logging System Implementation

[Home](../../index.md) > [Implementation](../index.md) > Logging System

This document details the implementation of the logging system in VANA. A consistent and configurable logging mechanism is essential for debugging, monitoring, and auditing the behavior of VANA's various components.

## 1. Overview

VANA aims for a structured and centralized logging approach. Key features include:
*   Standard Python `logging` module usage.
*   Configuration driven by `config/environment.py` (which loads from `.env`).
*   Ability to log to both console and files.
*   Support for different log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL).
*   Contextual information in log messages.

## 2. Core Logging Utility (Conceptual `tools/logging/logger.py`)

A dedicated module, say `tools/logging/logger.py`, would typically provide a function to get a configured logger instance.

```python
# tools/logging/logger.py (Conceptual Structure)
import logging
import sys
from pathlib import Path
from config import environment # VANA's central configuration

# --- Configuration ---
LOG_LEVEL = environment.LOG_LEVEL.upper() # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FILE_PATH = Path(environment.LOG_FILE_PATH) # From config/environment.py
LOG_FORMAT_CONSOLE = environment.LOG_FORMAT_CONSOLE or '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
LOG_FORMAT_FILE = environment.LOG_FORMAT_FILE or '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s'
# Example: JSON logging format
# LOG_FORMAT_JSON = '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "name": "%(name)s", "module": "%(module)s", "lineno": "%(lineno)d", "message": "%(message)s"}'
# Use a library like python-json-logger for proper JSON logging.

# Ensure log directory exists
if LOG_FILE_PATH:
    LOG_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)

# --- Logger Cache to avoid reconfiguring loggers ---
_loggers = {}

def get_logger(name: str = 'vana_app', logger_level: str = None):
    """
    Retrieves a configured logger instance.

    Args:
        name (str): Name of the logger, typically __name__ of the calling module.
        logger_level (str, optional): Specific level for this logger, overrides global.

    Returns:
        logging.Logger: Configured logger instance.
    """
    if name in _loggers:
        return _loggers[name]

    logger = logging.getLogger(name)
    
    # Determine effective log level
    effective_level_str = (logger_level or LOG_LEVEL).upper()
    level = getattr(logging, effective_level_str, logging.INFO)
    logger.setLevel(level)

    # Prevent duplicate handlers if logger was already partially configured
    if logger.hasHandlers():
        logger.handlers.clear()

    # --- Console Handler ---
    # Only add console handler if not already present on root or if specifically desired
    # This basic setup adds it per logger; more advanced setups might configure root logger
    console_handler = logging.StreamHandler(sys.stdout)
    console_formatter = logging.Formatter(LOG_FORMAT_CONSOLE)
    console_handler.setFormatter(console_formatter)
    console_handler.setLevel(level) # Console handler respects the logger's level
    logger.addHandler(console_handler)

    # --- File Handler ---
    if LOG_FILE_PATH:
        try:
            file_handler = logging.FileHandler(LOG_FILE_PATH, encoding='utf-8')
            file_formatter = logging.Formatter(LOG_FORMAT_FILE)
            file_handler.setFormatter(file_formatter)
            file_handler.setLevel(level) # File handler also respects the logger's level
            logger.addHandler(file_handler)
        except Exception as e:
            # Fallback to console logging if file handler fails
            logger.error(f"Failed to initialize file logger at {LOG_FILE_PATH}: {e}", exc_info=True)
            # Potentially remove console_handler and re-add to avoid duplicate console messages if error occurs late
            
    # Do not propagate to root logger if we are configuring handlers here,
    # unless root logger is also configured and this is intended.
    logger.propagate = False 
    
    _loggers[name] = logger
    return logger

# --- Example: Configure Root Logger (Optional, for libraries that use logging.getLogger()) ---
# def setup_root_logger():
#    root_logger = logging.getLogger()
#    # Configure root_logger similarly if needed, e.g. if third-party libs should also log to VANA's handlers
#    # Be careful with levels and propagation if configuring both root and specific loggers.

# if environment.CONFIGURE_ROOT_LOGGER: # Control via env var
#    setup_root_logger()

```

### Key Aspects of `logger.py`:
*   **Configuration Import:** Imports `LOG_LEVEL` and `LOG_FILE_PATH` from `config.environment`.
*   **Log Directory Creation:** Ensures the directory for log files exists.
*   **`get_logger(name)` Function:**
    *   This is the primary function used by other modules to obtain a logger instance.
    *   It takes a `name` argument, which should typically be `__name__` of the calling module. This helps in identifying the source of log messages.
    *   It configures the logger with handlers (e.g., console, file) and formatters.
    *   Caches logger instances in `_loggers` to avoid re-configuration on subsequent calls for the same name.
*   **Handlers:**
    *   `StreamHandler`: Logs to the console (`sys.stdout`).
    *   `FileHandler`: Logs to the file specified by `LOG_FILE_PATH`.
*   **Formatters:**
    *   `logging.Formatter` is used to define the structure of log messages. Different formats can be used for console and file logs.
    *   The example `LOG_FORMAT_FILE` includes `%(filename)s:%(lineno)d` for more precise location of log calls.
    *   Structured logging (e.g., JSON) can be implemented using libraries like `python-json-logger` and configuring a custom formatter.
*   **Log Levels:** Sets the logger's level based on `LOG_LEVEL` from the configuration. This means only messages of this severity or higher will be processed by the logger and its handlers. Individual handlers can also have their own levels set.
*   **Propagation:** `logger.propagate = False` is often set for named loggers if they have their own handlers, to prevent messages from also being passed up to the root logger (which might have its own, potentially duplicate, handlers).

## 3. Configuration via `config/environment.py`

As shown in the `config-environment.md` implementation details, `config/environment.py` defines logging-related variables loaded from `.env`:

```python
# In config/environment.py
# ...
LOG_LEVEL = get_env_variable("LOG_LEVEL", "INFO" if IS_PRODUCTION else "DEBUG").upper()
LOG_FILE_PATH = get_env_variable("LOG_FILE_PATH", str(BASE_DIR / "logs" / "vana_app.log"))
LOG_FORMAT_CONSOLE = get_env_variable("LOG_FORMAT_CONSOLE", '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
LOG_FORMAT_FILE = get_env_variable("LOG_FORMAT_FILE", '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s')
# ...
```

And in `.env.example`:
```env
# Logging
LOG_LEVEL=DEBUG # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FILE_PATH=logs/vana_app.log # Relative to project root or absolute path
# LOG_FORMAT_CONSOLE=... (optional override)
# LOG_FORMAT_FILE=... (optional override)
```

## 4. Usage in VANA Components

Other modules in VANA use the `get_logger` function to obtain a logger instance:

```python
# In a tool, e.g., tools/vector_search/vector_search_client.py
from tools.logging.logger import get_logger

logger = get_logger(__name__) # Use the module's name for the logger

class VectorSearchClient:
    def __init__(self):
        logger.info("Initializing VectorSearchClient...")
        # ...
    
    def find_neighbors(self, query_embedding, num_neighbors):
        logger.debug(f"Finding {num_neighbors} neighbors for query embedding (first 5 dims): {query_embedding[:5]}")
        try:
            # ... perform search ...
            logger.info("Vector search successful.")
            # return results
        except Exception as e:
            logger.error(f"Error during vector search: {e}", exc_info=True) # exc_info=True logs stack trace
            # raise or return error
```

### Logging Best Practices in Components:
*   **Use `__name__`:** Always get the logger with `get_logger(__name__)` so log messages are tagged with the module path.
*   **Appropriate Levels:** Use DEBUG for verbose developer-centric info, INFO for general operations, WARNING for potential issues, ERROR for failures of specific operations, and CRITICAL for severe application-level failures.
*   **Contextual Information:** Include relevant variables or context in log messages. F-strings are convenient for this.
    ```python
    logger.info(f"Processing file: {file_path} for user: {user_id}")
    ```
*   **Log Exceptions:** When catching exceptions, log them with `exc_info=True` to include the stack trace.
    ```python
    try:
        # ... some operation ...
    except ValueError as e:
        logger.error(f"ValueError during operation: {e}", exc_info=True)
    ```
*   **Avoid Logging Sensitive Data:** Be careful not to log raw API keys, passwords, or extensive PII unless absolutely necessary for debugging and properly secured/anonymized.

## 5. Structured Logging (e.g., JSON)

For better machine readability and integration with log management systems (like ELK stack, Splunk, Google Cloud Logging), structured JSON logging is often preferred.
This typically involves:
1.  Using a library like `python-json-logger`.
    ```bash
    pip install python-json-logger
    ```
2.  Configuring a custom `jsonlogger.JsonFormatter` in `tools/logging/logger.py`.
    ```python
    # In tools/logging/logger.py
    # from pythonjsonlogger import jsonlogger

    # class CustomJsonFormatter(jsonlogger.JsonFormatter):
    #     def add_fields(self, log_record, record, message_dict):
    #         super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
    #         if not log_record.get('timestamp'):
    #             log_record['timestamp'] = record.created
    #         if log_record.get('level'):
    #             log_record['level'] = log_record['level'].upper()
    #         else:
    #             log_record['level'] = record.levelname

    # ... in get_logger():
    # if environment.LOG_FORMAT_TYPE == 'json':
    #     formatter = CustomJsonFormatter('%(timestamp)s %(level)s %(name)s %(message)s')
    # else:
    #     formatter = logging.Formatter(LOG_FORMAT_FILE)
    # file_handler.setFormatter(formatter)
    ```
    The `LOG_FORMAT_TYPE` would be another setting in `config/environment.py`.

## 6. Centralized vs. Component-Specific Configuration

The current approach provides a centralized way to get a logger that's configured based on global settings. More advanced scenarios might involve:
*   Configuring different log levels for different modules (e.g., set `tools.vector_search` to DEBUG while everything else is INFO). This can be done with Python's `logging.config.dictConfig` or by modifying the `get_logger` function to accept more parameters.
*   Multiple file handlers for different components or log types (e.g., an `audit.log`, an `error.log`).

This logging system provides a solid foundation for observability within VANA.

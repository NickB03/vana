"""
Configuration utilities for VANA Dashboard.

This module provides functions for loading and managing dashboard configuration.
"""

import json
import logging
import os

# Default configuration
DEFAULT_CONFIG = {
    "dashboard": {
        "title": "VANA Dashboard",
        "refresh_interval": 30,
        "theme": "light",
        "debug": False,
    },
    "data_sources": {
        "use_mock_data": False,
        "memory_api_url": os.environ.get(
            "VANA_MEMORY_API_URL", "http://localhost:8000/api/memory"
        ),
        "agent_api_url": os.environ.get(
            "VANA_AGENT_API_URL", "http://localhost:8000/api/agents"
        ),
        "system_api_url": os.environ.get(
            "VANA_SYSTEM_API_URL", "http://localhost:8000/api/system"
        ),
        "task_api_url": os.environ.get(
            "VANA_TASK_API_URL", "http://localhost:8000/api/tasks"
        ),
    },
    "visualization": {
        "chart_height": 400,
        "chart_width": 800,
        "color_scheme": "blues",
        "animation": True,
    },
    "alerts": {
        "enabled": True,
        "cpu_threshold": 80,
        "memory_threshold": 80,
        "disk_threshold": 80,
        "error_rate_threshold": 5,
    },
}


def load_config(config_path=None):
    """Load configuration from file or use defaults."""
    if config_path and os.path.exists(config_path):
        try:
            with open(config_path) as f:
                config = json.load(f)
                logging.info(f"Loaded configuration from {config_path}")
                return config
        except Exception as e:
            logging.error(f"Error loading configuration: {e}")
            return DEFAULT_CONFIG
    else:
        default_path = os.path.join(os.path.dirname(__file__), "../config/config.json")
        if os.path.exists(default_path):
            try:
                with open(default_path) as f:
                    config = json.load(f)
                    logging.info(f"Loaded configuration from {default_path}")
                    return config
            except Exception as e:
                logging.error(f"Error loading configuration: {e}")

        logging.info("Using default configuration")
        return DEFAULT_CONFIG


def save_config(config, config_path=None):
    """
    Save configuration to file.

    Args:
        config (dict): Configuration dictionary.
        config_path (str): Path to save the configuration file.

    Returns:
        bool: True if successful, False otherwise.
    """
    if not config_path:
        config_path = os.path.join(os.path.dirname(__file__), "../config/config.json")

    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(config_path), exist_ok=True)

    try:
        with open(config_path, "w") as f:
            json.dump(config, f, indent=4)
        logging.info(f"Saved configuration to {config_path}")
        return True
    except Exception as e:
        logging.error(f"Error saving configuration to {config_path}: {e}")
        return False


def get_config_value(key, default=None):
    """
    Get a configuration value by key.

    Args:
        key (str): Configuration key (dot notation for nested keys).
        default: Default value to return if key is not found.

    Returns:
        Value of the configuration key or default if not found.
    """
    config = load_config()

    # Split key by dots to navigate nested dictionaries
    keys = key.split(".")
    value = config

    # Navigate through the nested dictionaries
    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            return default

    return value


def set_config_value(key, value):
    """
    Set a configuration value by key.

    Args:
        key (str): Configuration key (dot notation for nested keys).
        value: Value to set.

    Returns:
        bool: True if successful, False otherwise.
    """
    config = load_config()

    # Split key by dots to navigate nested dictionaries
    keys = key.split(".")

    # Navigate through the nested dictionaries
    current = config
    for i, k in enumerate(keys[:-1]):
        if k not in current:
            current[k] = {}
        current = current[k]

    # Set the value
    current[keys[-1]] = value

    # Save the updated configuration
    return save_config(config)


# Global configuration object
CONFIG = load_config()

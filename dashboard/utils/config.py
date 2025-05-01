"""
Configuration utilities for VANA Dashboard.

This module provides functions for loading and managing dashboard configuration.
"""

import os
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Default configuration
DEFAULT_CONFIG = {
    "dashboard": {
        "title": "VANA Dashboard",
        "refresh_interval": 60,  # seconds
        "theme": "light",
        "debug": False
    },
    "data_sources": {
        "use_mock_data": True,
        "memory_api_url": "http://localhost:8000/api/memory",
        "agent_api_url": "http://localhost:8000/api/agents",
        "system_api_url": "http://localhost:8000/api/system",
        "task_api_url": "http://localhost:8000/api/tasks"
    },
    "visualization": {
        "chart_height": 400,
        "chart_width": 800,
        "color_scheme": "viridis",
        "animation": True
    },
    "alerts": {
        "enabled": True,
        "cpu_threshold": 80,
        "memory_threshold": 80,
        "disk_threshold": 80,
        "error_rate_threshold": 0.05
    }
}

def get_config_path():
    """
    Get the path to the configuration file.
    
    Returns:
        Path: Path to the configuration file.
    """
    # Check for config file in the dashboard directory
    dashboard_dir = Path(__file__).parent.parent
    config_path = dashboard_dir / "config.json"
    
    # If not found, check for config file in the parent directory
    if not config_path.exists():
        config_path = dashboard_dir.parent / "config.json"
    
    # If still not found, use the default config path
    if not config_path.exists():
        config_path = dashboard_dir / "config.json"
    
    return config_path

def load_config():
    """
    Load configuration from file or use default configuration.
    
    Returns:
        dict: Configuration dictionary.
    """
    config_path = get_config_path()
    
    # If config file exists, load it
    if config_path.exists():
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            logger.info(f"Loaded configuration from {config_path}")
            return config
        except Exception as e:
            logger.error(f"Error loading configuration from {config_path}: {e}")
            logger.info("Using default configuration")
            return DEFAULT_CONFIG
    
    # If config file doesn't exist, use default configuration
    logger.info(f"Configuration file {config_path} not found. Using default configuration")
    return DEFAULT_CONFIG

def save_config(config):
    """
    Save configuration to file.
    
    Args:
        config (dict): Configuration dictionary.
    
    Returns:
        bool: True if successful, False otherwise.
    """
    config_path = get_config_path()
    
    try:
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=4)
        logger.info(f"Saved configuration to {config_path}")
        return True
    except Exception as e:
        logger.error(f"Error saving configuration to {config_path}: {e}")
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
    keys = key.split('.')
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
    keys = key.split('.')
    
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

# Create default configuration file if it doesn't exist
if not get_config_path().exists():
    save_config(DEFAULT_CONFIG)

"""
Data formatting utilities for VANA Dashboard.

This module provides functions for formatting data for visualization.
"""

import logging
from datetime import datetime

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def format_timestamps(data, timestamp_key="timestamps"):
    """
    Format timestamps in data for visualization.

    Args:
        data (dict): Data dictionary with timestamps.
        timestamp_key (str): Key for timestamps in the data dictionary.

    Returns:
        dict: Data dictionary with formatted timestamps.
    """
    if timestamp_key not in data:
        logger.warning(f"Timestamp key '{timestamp_key}' not found in data")
        return data

    formatted_data = data.copy()

    try:
        # Convert ISO format timestamps to datetime objects
        timestamps = [datetime.fromisoformat(ts) for ts in data[timestamp_key]]

        # Format timestamps for display
        formatted_data[timestamp_key] = [
            ts.strftime("%Y-%m-%d %H:%M:%S") for ts in timestamps
        ]

        # Add a shorter format for charts
        formatted_data["short_timestamps"] = [
            ts.strftime("%H:%M")
            if ts.date() == datetime.now().date()
            else ts.strftime("%m-%d %H:%M")
            for ts in timestamps
        ]
    except Exception as e:
        logger.error(f"Error formatting timestamps: {e}")

    return formatted_data


def create_dataframe(data, timestamp_key="timestamps"):
    """
    Create a pandas DataFrame from data for visualization.

    Args:
        data (dict): Data dictionary.
        timestamp_key (str): Key for timestamps in the data dictionary.

    Returns:
        pandas.DataFrame: DataFrame for visualization.
    """
    if timestamp_key not in data:
        logger.warning(f"Timestamp key '{timestamp_key}' not found in data")
        return pd.DataFrame()

    try:
        # Create a dictionary for the DataFrame
        df_dict = {timestamp_key: data[timestamp_key]}

        # Add all other keys except 'short_timestamps'
        for key in data:
            if (
                key != timestamp_key
                and key != "short_timestamps"
                and len(data[key]) == len(data[timestamp_key])
            ):
                df_dict[key] = data[key]

        # Create DataFrame
        df = pd.DataFrame(df_dict)

        # Set timestamps as index
        df.set_index(timestamp_key, inplace=True)

        return df
    except Exception as e:
        logger.error(f"Error creating DataFrame: {e}")
        return pd.DataFrame()


def calculate_statistics(data):
    """
    Calculate statistics for numerical data.

    Args:
        data (list): List of numerical values.

    Returns:
        dict: Dictionary of statistics.
    """
    if not data:
        return {"min": 0, "max": 0, "mean": 0, "median": 0, "std": 0}

    try:
        return {
            "min": min(data),
            "max": max(data),
            "mean": sum(data) / len(data),
            "median": sorted(data)[len(data) // 2],
            "std": np.std(data) if len(data) > 1 else 0,
        }
    except Exception as e:
        logger.error(f"Error calculating statistics: {e}")
        return {"min": 0, "max": 0, "mean": 0, "median": 0, "std": 0}


def format_bytes(bytes_value):
    """
    Format bytes value to human-readable format.

    Args:
        bytes_value (int): Bytes value.

    Returns:
        str: Formatted bytes value.
    """
    if bytes_value < 1024:
        return f"{bytes_value} B"
    elif bytes_value < 1024**2:
        return f"{bytes_value / 1024:.2f} KB"
    elif bytes_value < 1024**3:
        return f"{bytes_value / (1024**2):.2f} MB"
    else:
        return f"{bytes_value / (1024**3):.2f} GB"


def format_duration(seconds):
    """
    Format duration in seconds to human-readable format.

    Args:
        seconds (float): Duration in seconds.

    Returns:
        str: Formatted duration.
    """
    if seconds < 0.001:
        return f"{seconds * 1000000:.2f} µs"
    elif seconds < 1:
        return f"{seconds * 1000:.2f} ms"
    elif seconds < 60:
        return f"{seconds:.2f} s"
    elif seconds < 3600:
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        return f"{int(minutes)}m {int(remaining_seconds)}s"
    else:
        hours = seconds // 3600
        remaining_seconds = seconds % 3600
        minutes = remaining_seconds // 60
        remaining_seconds = remaining_seconds % 60
        return f"{int(hours)}h {int(minutes)}m {int(remaining_seconds)}s"


def format_percentage(value, decimal_places=2):
    """
    Format a value as a percentage.

    Args:
        value (float): Value to format (0.0 to 1.0).
        decimal_places (int): Number of decimal places.

    Returns:
        str: Formatted percentage.
    """
    return f"{value * 100:.{decimal_places}f}%"


def format_time_ago(timestamp_str):
    """
    Format a timestamp as a human-readable time ago string.

    Args:
        timestamp_str (str): ISO format timestamp.

    Returns:
        str: Human-readable time ago string.
    """
    try:
        timestamp = datetime.fromisoformat(timestamp_str)
        now = datetime.now()
        delta = now - timestamp

        if delta.days > 365:
            years = delta.days // 365
            return f"{years} year{'s' if years > 1 else ''} ago"
        elif delta.days > 30:
            months = delta.days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"
        elif delta.days > 0:
            return f"{delta.days} day{'s' if delta.days > 1 else ''} ago"
        elif delta.seconds > 3600:
            hours = delta.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif delta.seconds > 60:
            minutes = delta.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return f"{delta.seconds} second{'s' if delta.seconds != 1 else ''} ago"
    except Exception as e:
        logger.error(f"Error formatting time ago: {e}")
        return timestamp_str


def format_timestamp(timestamp_str):
    """Format an ISO timestamp string to a human-readable string."""
    try:
        # Parse ISO format timestamp
        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))

        # Convert to local timezone
        local_tz = datetime.now().astimezone().tzinfo
        local_dt = dt.astimezone(local_tz)

        # Calculate time difference
        now = datetime.now(local_tz)
        diff = now - local_dt

        # Format based on time difference
        if diff.days == 0:
            if diff.seconds < 60:
                return "Just now"
            elif diff.seconds < 3600:
                minutes = diff.seconds // 60
                return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
            else:
                hours = diff.seconds // 3600
                return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.days == 1:
            return f"Yesterday at {local_dt.strftime('%H:%M')}"
        else:
            return local_dt.strftime("%Y-%m-%d %H:%M")
    except Exception as e:
        # If formatting fails, return the original string
        logger.error(f"Error formatting timestamp: {e}")
        return timestamp_str


def format_percentage(value):
    """Format a decimal value as a percentage string."""
    try:
        return f"{value * 100:.1f}%"
    except Exception as e:
        logger.error(f"Error formatting percentage: {e}")
        return f"{value}"

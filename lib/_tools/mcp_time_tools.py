"""
Time MCP Tools for VANA Agent System

This module provides comprehensive time and date operations including:
- Current time retrieval with timezone support
- Timezone conversion and calculations
- Date arithmetic and formatting
- Schedule and calendar operations

Part of Phase 3: Fundamental MCP Implementation
"""

import datetime
import os
from typing import Any, Dict, List, Optional

import pytz
from dateutil import parser, relativedelta
from google.adk.tools import FunctionTool

# Time zone mappings for common abbreviations
TIMEZONE_MAPPINGS = {
    "EST": "US/Eastern",
    "PST": "US/Pacific",
    "CST": "US/Central",
    "MST": "US/Mountain",
    "UTC": "UTC",
    "GMT": "GMT",
    "CET": "Europe/Paris",
    "JST": "Asia/Tokyo",
    "IST": "Asia/Kolkata",
    "AEST": "Australia/Sydney",
}


def get_current_time(timezone: str = "UTC", format_string: str = "%Y-%m-%d %H:%M:%S %Z") -> str:
    """
    Get the current time in the specified timezone.

    Args:
        timezone: Timezone name (e.g., 'UTC', 'US/Eastern', 'Europe/Paris') or abbreviation
        format_string: Python strftime format string for output

    Returns:
        Formatted current time string
    """
    try:
        # Handle timezone abbreviations
        if timezone.upper() in TIMEZONE_MAPPINGS:
            timezone = TIMEZONE_MAPPINGS[timezone.upper()]

        # Get timezone object
        tz = pytz.timezone(timezone)

        # Get current time in specified timezone
        current_time = datetime.datetime.now(tz)

        # Format and return
        return current_time.strftime(format_string)

    except Exception as e:
        return f"Error getting current time: {str(e)}"


def convert_timezone(
    datetime_str: str, from_timezone: str, to_timezone: str, input_format: str = "%Y-%m-%d %H:%M:%S"
) -> str:
    """
    Convert a datetime from one timezone to another.

    Args:
        datetime_str: DateTime string to convert
        from_timezone: Source timezone name or abbreviation
        to_timezone: Target timezone name or abbreviation
        input_format: Format of the input datetime string

    Returns:
        Converted datetime string with timezone info
    """
    try:
        # Handle timezone abbreviations
        if from_timezone.upper() in TIMEZONE_MAPPINGS:
            from_timezone = TIMEZONE_MAPPINGS[from_timezone.upper()]
        if to_timezone.upper() in TIMEZONE_MAPPINGS:
            to_timezone = TIMEZONE_MAPPINGS[to_timezone.upper()]

        # Parse input datetime
        dt = datetime.datetime.strptime(datetime_str, input_format)

        # Localize to source timezone
        from_tz = pytz.timezone(from_timezone)
        localized_dt = from_tz.localize(dt)

        # Convert to target timezone
        to_tz = pytz.timezone(to_timezone)
        converted_dt = localized_dt.astimezone(to_tz)

        return converted_dt.strftime("%Y-%m-%d %H:%M:%S %Z")

    except Exception as e:
        return f"Error converting timezone: {str(e)}"


def calculate_date(base_date: str, operation: str, amount: int, unit: str, date_format: str = "%Y-%m-%d") -> str:
    """
    Perform date arithmetic operations.

    Args:
        base_date: Starting date string
        operation: 'add' or 'subtract'
        amount: Number of units to add/subtract
        unit: Time unit ('days', 'weeks', 'months', 'years', 'hours', 'minutes')
        date_format: Format of input/output date strings

    Returns:
        Calculated date string
    """
    try:
        # Parse base date
        if base_date.lower() == "today":
            dt = datetime.datetime.now()
        elif base_date.lower() == "tomorrow":
            dt = datetime.datetime.now() + datetime.timedelta(days=1)
        elif base_date.lower() == "yesterday":
            dt = datetime.datetime.now() - datetime.timedelta(days=1)
        else:
            dt = datetime.datetime.strptime(base_date, date_format)

        # Prepare delta arguments
        delta_kwargs = {}

        if unit == "days":
            delta_kwargs["days"] = amount
        elif unit == "weeks":
            delta_kwargs["weeks"] = amount
        elif unit == "months":
            delta_kwargs["months"] = amount
        elif unit == "years":
            delta_kwargs["years"] = amount
        elif unit == "hours":
            delta_kwargs["hours"] = amount
        elif unit == "minutes":
            delta_kwargs["minutes"] = amount
        else:
            return f"Error: Unsupported time unit '{unit}'"

        # Apply operation
        if operation.lower() == "add":
            if unit in ["months", "years"]:
                result_dt = dt + relativedelta.relativedelta(**delta_kwargs)
            else:
                result_dt = dt + datetime.timedelta(**delta_kwargs)
        elif operation.lower() == "subtract":
            if unit in ["months", "years"]:
                delta_kwargs = {k: -v for k, v in delta_kwargs.items()}
                result_dt = dt + relativedelta.relativedelta(**delta_kwargs)
            else:
                result_dt = dt - datetime.timedelta(**delta_kwargs)
        else:
            return f"Error: Unsupported operation '{operation}'"

        return result_dt.strftime(date_format)

    except Exception as e:
        return f"Error calculating date: {str(e)}"


def format_datetime(datetime_str: str, input_format: str, output_format: str) -> str:
    """
    Reformat a datetime string from one format to another.

    Args:
        datetime_str: Input datetime string
        input_format: Current format of the datetime string
        output_format: Desired output format

    Returns:
        Reformatted datetime string
    """
    try:
        # Parse input datetime
        dt = datetime.datetime.strptime(datetime_str, input_format)

        # Format to output format
        return dt.strftime(output_format)

    except Exception as e:
        return f"Error formatting datetime: {str(e)}"


def get_time_until(
    target_datetime: str, target_timezone: str = "UTC", datetime_format: str = "%Y-%m-%d %H:%M:%S"
) -> str:
    """
    Calculate time remaining until a target datetime.

    Args:
        target_datetime: Target datetime string
        target_timezone: Timezone of target datetime
        datetime_format: Format of target datetime string

    Returns:
        Human-readable time remaining string
    """
    try:
        # Handle timezone abbreviations
        if target_timezone.upper() in TIMEZONE_MAPPINGS:
            target_timezone = TIMEZONE_MAPPINGS[target_timezone.upper()]

        # Parse target datetime
        target_dt = datetime.datetime.strptime(target_datetime, datetime_format)

        # Localize target datetime
        tz = pytz.timezone(target_timezone)
        target_dt = tz.localize(target_dt)

        # Get current time in same timezone
        current_dt = datetime.datetime.now(tz)

        # Calculate difference
        time_diff = target_dt - current_dt

        if time_diff.total_seconds() < 0:
            return f"Target time was {abs(time_diff.total_seconds() / 3600):.1f} hours ago"

        # Format human-readable output
        days = time_diff.days
        hours, remainder = divmod(time_diff.seconds, 3600)
        minutes, _ = divmod(remainder, 60)

        parts = []
        if days > 0:
            parts.append(f"{days} day{'s' if days != 1 else ''}")
        if hours > 0:
            parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
        if minutes > 0:
            parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")

        if not parts:
            return "Less than 1 minute"

        return ", ".join(parts)

    except Exception as e:
        return f"Error calculating time until target: {str(e)}"


def list_timezones(region: Optional[str] = None) -> str:
    """
    List available timezones, optionally filtered by region.

    Args:
        region: Optional region filter (e.g., 'US', 'Europe', 'Asia')

    Returns:
        List of available timezones
    """
    try:
        all_timezones = list(pytz.all_timezones)

        if region:
            filtered_timezones = [tz for tz in all_timezones if tz.startswith(region)]
            return f"Timezones in {region}:\n" + "\n".join(sorted(filtered_timezones))
        else:
            # Return common timezones and abbreviations
            common_timezones = [
                "UTC",
                "US/Eastern",
                "US/Central",
                "US/Mountain",
                "US/Pacific",
                "Europe/London",
                "Europe/Paris",
                "Europe/Berlin",
                "Asia/Tokyo",
                "Asia/Shanghai",
                "Asia/Kolkata",
                "Australia/Sydney",
            ]

            result = "Common Timezones:\n" + "\n".join(common_timezones)
            result += "\n\nSupported Abbreviations:\n" + "\n".join(
                [f"{abbr} -> {tz}" for abbr, tz in TIMEZONE_MAPPINGS.items()]
            )
            return result

    except Exception as e:
        return f"Error listing timezones: {str(e)}"


# Create ADK FunctionTool instances
adk_get_current_time = FunctionTool(func=get_current_time)
adk_get_current_time.name = "get_current_time"

adk_convert_timezone = FunctionTool(func=convert_timezone)
adk_convert_timezone.name = "convert_timezone"

adk_calculate_date = FunctionTool(func=calculate_date)
adk_calculate_date.name = "calculate_date"

adk_format_datetime = FunctionTool(func=format_datetime)
adk_format_datetime.name = "format_datetime"

adk_get_time_until = FunctionTool(func=get_time_until)
adk_get_time_until.name = "get_time_until"

adk_list_timezones = FunctionTool(func=list_timezones)
adk_list_timezones.name = "list_timezones"

# Export all time tools
__all__ = [
    "adk_get_current_time",
    "adk_convert_timezone",
    "adk_calculate_date",
    "adk_format_datetime",
    "adk_get_time_until",
    "adk_list_timezones",
]

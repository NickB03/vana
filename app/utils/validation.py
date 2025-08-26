"""Input validation utilities for secure endpoint handling."""

import re
from typing import Any

from fastapi import HTTPException


def validate_session_id(session_id: str) -> str:
    """Validate session ID format to prevent injection attacks.
    
    Args:
        session_id: The session ID to validate
        
    Returns:
        The validated session ID
        
    Raises:
        HTTPException: If session ID is invalid
    """
    # Session ID should only contain alphanumeric characters, hyphens, and underscores
    # Maximum length of 128 characters
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID is required")
    
    if len(session_id) > 128:
        raise HTTPException(status_code=400, detail="Session ID too long")
    
    # Only allow safe characters to prevent injection
    if not re.match(r"^[a-zA-Z0-9_\-]+$", session_id):
        raise HTTPException(
            status_code=400, 
            detail="Invalid session ID format. Only alphanumeric characters, hyphens, and underscores allowed"
        )
    
    return session_id


def sanitize_user_input(input_str: str, max_length: int = 1000) -> str:
    """Sanitize user input to prevent XSS and injection attacks.
    
    Args:
        input_str: The input string to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not input_str:
        return ""
    
    # Truncate to max length
    input_str = input_str[:max_length]
    
    # Remove any HTML/script tags
    input_str = re.sub(r'<[^>]+>', '', input_str)
    
    # Escape special characters
    replacements = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    }
    
    for char, replacement in replacements.items():
        input_str = input_str.replace(char, replacement)
    
    return input_str


def validate_limit_parameter(limit: int, max_limit: int = 100) -> int:
    """Validate limit parameter for pagination.
    
    Args:
        limit: The requested limit
        max_limit: Maximum allowed limit
        
    Returns:
        Validated limit value
        
    Raises:
        HTTPException: If limit is invalid
    """
    if limit < 1:
        raise HTTPException(status_code=400, detail="Limit must be at least 1")
    
    if limit > max_limit:
        raise HTTPException(status_code=400, detail=f"Limit cannot exceed {max_limit}")
    
    return limit


def validate_json_payload(payload: dict[str, Any], required_fields: list[str] | None = None) -> dict[str, Any]:
    """Validate JSON payload structure.
    
    Args:
        payload: The JSON payload to validate
        required_fields: List of required field names
        
    Returns:
        Validated payload
        
    Raises:
        HTTPException: If payload is invalid
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    
    if required_fields:
        missing_fields = [field for field in required_fields if field not in payload]
        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}"
            )
    
    return payload
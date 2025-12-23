#!/usr/bin/env python3
"""
PreToolUse hook to enforce file-based Chrome screenshots and prevent 400 errors.

This hook prevents two critical issues:
1. Claude Code MIME type bug (PNG labeled as JPEG)
2. Payload size limits (base64 screenshots exceed message limits)

Solution: Force all screenshots to use filePath parameter (file-based) instead
of returning base64 data in the tool result.

Issue refs:
- https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/571
- https://github.com/anthropics/claude-code/issues/11931
"""

import sys
import json
from datetime import datetime


def main():
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        # If we can't parse input, allow the tool to proceed
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    # Only intercept chrome-devtools take_screenshot tool
    if "take_screenshot" not in tool_name:
        sys.exit(0)

    has_file_path = bool(tool_input.get("filePath"))

    # If already saving to file, allow
    if has_file_path:
        sys.exit(0)

    # BLOCK: Force file-based screenshots to prevent 400 errors
    # Generate a timestamped filename in .screenshots/ directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f".screenshots/chrome-mcp-{timestamp}.png"

    # Force file-based screenshot with PNG format (reliable, no MIME issues)
    modified_input = {
        **tool_input,
        "filePath": filename,
        "format": "png"  # PNG is fine when saving to file
    }

    # Output modified tool input as JSON
    result = {
        "tool_input": modified_input
    }
    print(json.dumps(result))

    # Log the modification to stderr (visible in Claude Code output)
    print(
        f"[chrome-screenshot-fix] Enforcing file-based screenshot: {filename}\n"
        f"  Reason: Prevents 400 errors from base64 payload size limits",
        file=sys.stderr
    )

    sys.exit(0)  # Allow with modifications


if __name__ == "__main__":
    main()

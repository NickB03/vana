#!/usr/bin/env python3
"""
Script to add python-json-logger dependency to pyproject.toml
"""

from lib.logging_config import get_logger

logger = get_logger("vana.add_json_logger_dependency")

# Read the current pyproject.toml
with open('pyproject.toml', 'r') as f:
    content = f.read()

# Add the dependency after uvicorn
new_content = content.replace(
    'uvicorn = ">=0.24.0"',
    'uvicorn = ">=0.24.0"\npython-json-logger = "^2.0.0"'
)

# Write the updated content
with open('pyproject.toml', 'w') as f:
    f.write(new_content)

logger.info("✅ Added python-json-logger dependency to pyproject.toml")

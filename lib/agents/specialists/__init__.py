# Specialists module - contains individual specialist implementations
# This module does NOT export agents to avoid ADK discovery confusion
# Specialists are accessed through the main orchestrator only

# Import specialist agents for internal use only
try:
    from .architecture_specialist import architecture_specialist, architecture_specialist_tool
except ImportError:
    # Handle gracefully if specialists not yet implemented
    architecture_specialist = None
    architecture_specialist_tool = None

try:
    from .data_science_specialist import data_science_specialist, data_science_specialist_tool
except ImportError:
    data_science_specialist = None
    data_science_specialist_tool = None

try:
    from .security_specialist import security_specialist, security_specialist_tool
except ImportError:
    security_specialist = None
    security_specialist_tool = None

try:
    from .devops_specialist import devops_specialist, devops_specialist_tool
except ImportError:
    devops_specialist = None
    devops_specialist_tool = None

# Export only specialist tools, NOT agents (to prevent ADK discovery)
__all__ = [
    "architecture_specialist_tool",
    "data_science_specialist_tool", 
    "security_specialist_tool",
    "devops_specialist_tool",
]

#!/usr/bin/env python3
"""
Fix for the 'Agent already has a parent' issue.

The problem: Specialists are created as module-level singletons and reused across
multiple orchestrator instances. ADK doesn't allow an agent to have multiple parents.

The solution: Convert specialists from singleton instances to factory functions
that create fresh instances when needed.
"""

# Example of the fix pattern:

# BEFORE (causes parent conflict):
"""
security_specialist = LlmAgent(
    name="security_specialist",
    model="gemini-2.0-flash-thinking-exp-01-21",
    ...
)
"""

# AFTER (creates fresh instances):
"""
def create_security_specialist():
    return LlmAgent(
        name="security_specialist",
        model="gemini-2.0-flash-thinking-exp-01-21",
        ...
    )
"""

# Then in enhanced_orchestrator.py:
"""
# Create fresh specialist instances for this orchestrator
available_specialists = []
try:
    from lib.agents.specialists.security_specialist import create_security_specialist
    available_specialists.append(create_security_specialist())
except ImportError:
    pass
    
# ... repeat for other specialists ...

enhanced_orchestrator = LlmAgent(
    sub_agents=available_specialists,  # Fresh instances, no parent conflicts
    ...
)
"""

print("This fix requires updating all specialist files to use factory functions.")
print("This is a significant refactor that should be done carefully.")
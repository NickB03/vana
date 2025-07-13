# Lightweight Code Execution Integration for VANA

## Executive Summary

This design document outlines an intelligent approach to integrate basic code execution capabilities into VANA without Docker dependencies, staying native to Google ADK design patterns.

## Current Analysis

### Existing Infrastructure

1. **Full Code Execution Agent** (`agents/code_execution/`):
   - Comprehensive Docker-based sandbox
   - Multi-language support (Python, JavaScript, Shell)
   - Advanced security validation via AST
   - Resource monitoring and limits
   - Currently **disabled** due to Docker requirement

2. **Available ADK Tools** (`lib/_tools/adk_tools.py`):
   - `simple_execute_code`: Basic Python execution with subprocess
   - `mathematical_solve`: Safe arithmetic expression evaluation
   - Both are production-ready and ADK-compliant

### Security Comparison

| Feature | Docker Sandbox | ADK Native Approach |
|---------|---------------|-------------------|
| Process Isolation | Full container | Subprocess with restrictions |
| Network Access | Blocked at container level | Pattern-based blocking |
| File System | Isolated workspace | Temp directory only |
| Resource Limits | cgroups | timeout + basic limits |
| Import Control | AST validation | Pattern matching |

## Proposed Integration

### Phase 1: Enable Existing Tools (Immediate)

1. **Add to VANA Chat Agent**:
   ```python
   # In agents/vana/team.py
   tools = [
       adk_simple_execute_code,  # Basic Python execution
       adk_mathematical_solve,   # Safe math evaluation
       # ... existing tools
   ]
   ```

2. **Update Task Routing**:
   ```python
   # Instead of "code execution is disabled"
   if task_type == "code_execution":
       if "calculate" in query or "math" in query:
           return mathematical_solve(query)
       elif complexity == "SIMPLE":
           return simple_execute_code(code, "python")
       else:
           return "Complex code execution requires Docker sandbox (currently disabled)"
   ```

### Phase 2: Create Hybrid Specialist (1-2 days)

Create `agents/lightweight_code_specialist.py`:

```python
"""
Lightweight Code Execution Specialist
Provides basic code execution without Docker dependencies
"""

from google.adk.agents import LlmAgent
from lib._tools.adk_tools import (
    adk_simple_execute_code,
    adk_mathematical_solve,
    adk_create_file,
    adk_read_file
)

lightweight_code_specialist = LlmAgent(
    name="lightweight_code_specialist",
    model="gemini-2.5-flash",
    description="Basic code execution for simple Python scripts and calculations",
    instruction="""You provide basic code execution capabilities:

CAPABILITIES:
- Python script execution (no imports, basic operations only)
- Mathematical calculations and expressions
- Data structure manipulation (lists, dicts)
- String processing
- Basic algorithms

LIMITATIONS:
- No file system access (except temp files)
- No network operations
- No dangerous imports (os, subprocess, etc.)
- 10-second timeout
- Memory limited to simple operations

When asked to execute code:
1. First check if it's a simple calculation → use mathematical_solve
2. For Python code → validate safety, then use simple_execute_code
3. For complex requirements → explain limitations and suggest alternatives
""",
    tools=[
        adk_simple_execute_code,
        adk_mathematical_solve,
        adk_create_file,  # For saving results
        adk_read_file,    # For reading inputs
    ]
)
```

### Phase 3: Enhanced Security Patterns

Extend `simple_execute_code` with ADK-native patterns:

```python
def enhanced_execute_code(code: str, language: str = "python") -> str:
    """Enhanced code execution with better security and features."""
    
    # 1. Pre-execution validation
    validation_result = validate_code_safety(code)
    if not validation_result["safe"]:
        return suggest_safe_alternative(code, validation_result["issues"])
    
    # 2. Code transformation for safety
    safe_code = transform_code_for_safety(code)
    
    # 3. Execute with monitoring
    result = execute_with_limits(safe_code, {
        "timeout": 10,
        "memory_limit": 100 * 1024 * 1024,  # 100MB
        "cpu_limit": 1
    })
    
    # 4. Post-process results
    return format_execution_result(result)
```

## Implementation Strategy

### Step 1: Enable Basic Tools (30 minutes)
1. Add `adk_simple_execute_code` to VANA's tools
2. Update routing logic to use it for simple code
3. Test with basic Python examples

### Step 2: Create Documentation (1 hour)
1. Document supported operations
2. Create examples of safe code patterns
3. Add to user-facing help

### Step 3: Implement Specialist (2-4 hours)
1. Create lightweight_code_specialist.py
2. Add to orchestrator routing
3. Test integration

### Step 4: Gradual Enhancement (ongoing)
1. Add more safe built-ins
2. Implement result caching
3. Add visualization support (matplotlib → base64)

## Security Considerations

### Safe Patterns
```python
# ✅ Allowed
result = sum([1, 2, 3, 4, 5])
data = {"name": "test", "value": 42}
processed = [x * 2 for x in range(10)]

# ❌ Blocked
import os  # No system imports
open("file.txt")  # No file operations
requests.get("url")  # No network
```

### Validation Approach
1. **Pattern Matching**: Quick rejection of dangerous patterns
2. **AST Analysis**: For complex validation (optional)
3. **Sandboxing**: Subprocess with restricted environment
4. **Monitoring**: Timeout and basic resource limits

## Benefits

1. **Immediate Value**: Users can execute basic code today
2. **No Infrastructure**: Works without Docker
3. **ADK Native**: Uses existing Google ADK patterns
4. **Gradual Migration**: Can enhance over time
5. **Clear Boundaries**: Users understand limitations

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Security breach | Multiple validation layers, no system access |
| Resource exhaustion | Timeouts, subprocess limits |
| User frustration | Clear documentation of capabilities |
| Code injection | Pattern matching + subprocess isolation |

## Success Metrics

1. **Adoption**: % of code requests handled vs rejected
2. **Safety**: Zero security incidents
3. **Performance**: <500ms overhead for validation
4. **User Satisfaction**: Positive feedback on basic capabilities

## Migration Path

1. **Phase 1**: Basic tools (immediate)
2. **Phase 2**: Lightweight specialist (1 day)
3. **Phase 3**: Enhanced validation (1 week)
4. **Phase 4**: Consider containers for advanced use (future)

## Conclusion

This approach provides immediate code execution capabilities while maintaining security and staying true to Google ADK design principles. It offers a practical solution that can be implemented quickly and enhanced over time based on user needs.
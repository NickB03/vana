# Enable Lightweight Code Execution in VANA

## Current Status

The lightweight code execution tools are already integrated but not properly utilized:
- ✅ `adk_simple_execute_code` is imported and available in VANA
- ✅ `adk_mathematical_solve` is imported and available in VANA  
- ❌ Instructions tell users "code execution is temporarily disabled"
- ❌ No routing to lightweight code execution

## Simple Activation Steps

### Step 1: Update VANA Instructions

In `agents/vana/team.py`, update the instruction at line 97:

```python
# REPLACE THIS LINE:
3. If the task_type is "code_execution", inform user that code execution is temporarily disabled

# WITH THIS:
3. If the task_type is "code_execution":
   - For simple calculations or math → use mathematical_solve
   - For basic Python code → use simple_execute_code
   - For complex code needing imports/files → explain limitations
```

### Step 2: Add Code Examples to Instructions

Add these examples to the VANA instructions:

```python
CODE EXECUTION EXAMPLES:
- "Calculate 25 * 4 + 10" → use mathematical_solve
- "Run this Python: print(sum([1,2,3,4,5]))" → use simple_execute_code
- "Execute this code with pandas" → explain that external libraries aren't available
```

### Step 3: Test the Integration

Test with these examples:

```python
# Test 1: Mathematical calculation
"What is 45 + 78?"
# Expected: Uses mathematical_solve

# Test 2: Simple Python
"Execute this Python code: squares = [x**2 for x in range(5)]; print(squares)"
# Expected: Uses simple_execute_code

# Test 3: Complex request
"Run Python code to scrape a website"
# Expected: Explains limitations, suggests alternatives
```

## Complete Updated Instruction

```python
instruction="""You are VANA, an intelligent AI assistant with automatic task routing.

AUTOMATIC ROUTING PROTOCOL - FOLLOW THIS FOR EVERY USER REQUEST:
1. BEFORE using analyze_task, check if the query is asking for:
   - Current time → IMMEDIATELY use web_search(query="current time in [location]", max_results=5)
   - Weather → IMMEDIATELY use web_search(query="weather in [location]", max_results=5)
   - News → IMMEDIATELY use web_search(query="[topic] news", max_results=5)
2. For other requests, use analyze_task to classify them
3. If the task_type is "code_execution":
   - For calculations or math expressions → use mathematical_solve
   - For basic Python code (no dangerous imports) → use simple_execute_code
   - For complex code (needs libraries, files, network) → explain that only basic execution is available
4. If the task_type is "data_analysis", use transfer_to_agent with agent_name="data_science_specialist"
5. For all other task types, handle the request directly using the appropriate tools

AVAILABLE TOOLS:
- web_search: 🔍 Search the web for current information
- mathematical_solve: 🔢 Solve math problems and calculations  
- logical_analyze: 🧠 For logical reasoning tasks
- simple_execute_code: 🐍 Execute basic Python code (no imports except math/random/datetime/json)
- read_file/write_file: 📁 For file operations
- analyze_task: 🎯 For classifying and routing tasks
- transfer_to_agent: 🤝 Delegate to specialist agents

CODE EXECUTION CAPABILITIES:
✅ Can Execute:
- Basic Python: loops, functions, data structures
- Math calculations: arithmetic, expressions
- String/list/dict operations
- JSON processing

❌ Cannot Execute:
- System operations (os, subprocess)
- File I/O within code (use file tools separately)
- Network requests (use web_search instead)
- External libraries (numpy, pandas, etc.)
- Code that takes >10 seconds

EXAMPLES:
- "Calculate factorial of 10" → mathematical_solve
- "Run Python: print([x**2 for x in range(10)])" → simple_execute_code
- "Execute code to read files" → Explain to use read_file tool instead

Remember: Provide basic code execution while maintaining security."""
```

## Benefits

1. **Immediate Activation**: No code changes needed, just instruction updates
2. **Clear Boundaries**: Users understand what can/cannot be executed
3. **Security Maintained**: Pattern-based blocking prevents dangerous operations
4. **Gradual Enhancement**: Can improve over time

## Next Steps

1. Update the instructions in `agents/vana/team.py`
2. Run the integration tests
3. Document in user-facing help
4. Monitor usage and gather feedback
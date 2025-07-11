# Architecture Tools API Reference

**Status**: Phase 3 Complete ✅  
**Location**: `agents/specialists/architecture_tools.py`

The Architecture Specialist provides 6 tools for code analysis, design pattern detection, and architectural improvements using AST-based analysis.

## Tool Overview

| Tool | Purpose | Performance |
|------|---------|-------------|
| `detect_design_patterns` | Identify design patterns in code | 100-200ms |
| `analyze_dependencies` | Generate dependency graphs | 200-400ms |
| `suggest_refactoring` | Provide refactoring suggestions | 150-300ms |
| `review_architecture` | Comprehensive architecture analysis | 300-500ms |
| `generate_documentation` | Auto-generate documentation | 200-400ms |
| `validate_structure` | Validate code structure | 100-200ms |

## Tool Details

### 1. detect_design_patterns

Analyzes Python code to identify common design patterns using AST parsing.

**Parameters:**
```python
detect_design_patterns(code_path: str) -> str
```

**Input:**
- `code_path` (str): Path to Python file or directory to analyze

**Returns:**
- Formatted report of detected patterns with locations and confidence scores

**Detected Patterns:**
- Singleton Pattern
- Factory Pattern
- Observer Pattern
- Decorator Pattern
- Strategy Pattern
- Adapter Pattern
- Repository Pattern
- Command Pattern

**Example:**
```python
result = detect_design_patterns("/path/to/project/src")
# Returns:
"""
## Design Pattern Analysis

### Detected Patterns:

**Singleton Pattern** (2 instances)
- File: src/config/manager.py, Class: ConfigManager (lines 15-45)
  Confidence: High (90%)
  Implementation: Double-checked locking with __new__
  
**Factory Pattern** (1 instance)
- File: src/builders/agent_factory.py, Class: AgentFactory (lines 8-62)
  Confidence: High (85%)
  Implementation: create_agent() method with type dispatch
"""
```

### 2. analyze_dependencies

Generates a dependency graph showing imports and relationships between modules.

**Parameters:**
```python
analyze_dependencies(project_path: str) -> str
```

**Input:**
- `project_path` (str): Root directory of the project to analyze

**Returns:**
- Dependency report with circular dependency detection and import analysis

**Features:**
- Import tracking (internal and external)
- Circular dependency detection
- Unused import identification
- Module coupling metrics

**Example:**
```python
result = analyze_dependencies("/path/to/vana")
# Returns:
"""
## Dependency Analysis

### Module Dependencies:
agents.vana.team -> lib._tools.adk_tools (5 imports)
agents.vana.team -> lib._shared_libraries.adk_memory_service (2 imports)
agents.specialists.security_specialist -> agents.specialists.security_tools (4 imports)

### Circular Dependencies Detected:
⚠️ lib.utils.helpers <-> lib.utils.formatters

### Unused Imports:
- agents/data_science/specialist.py: 'asyncio' imported but not used

### Metrics:
- Total modules: 45
- Average imports per module: 8.2
- Max coupling: agents.vana.team (15 dependencies)
"""
```

### 3. suggest_refactoring

Analyzes code for refactoring opportunities and provides actionable suggestions.

**Parameters:**
```python
suggest_refactoring(code_path: str) -> str
```

**Input:**
- `code_path` (str): Path to file or directory to analyze

**Returns:**
- Prioritized list of refactoring suggestions with code examples

**Refactoring Types:**
- Long method extraction
- Duplicate code consolidation
- Complex conditional simplification
- Parameter reduction
- Dead code removal
- Type hint additions

**Example:**
```python
result = suggest_refactoring("/path/to/module.py")
# Returns:
"""
## Refactoring Suggestions

### High Priority:

1. **Extract Method** - process_data() is 150 lines long
   Location: module.py, lines 45-195
   Suggestion: Extract validation logic (lines 50-80) into validate_input()
   
   Before:
   ```python
   def process_data(data):
       # 30 lines of validation
       if not data:
           return None
       # ... more validation ...
   ```
   
   After:
   ```python
   def validate_input(data):
       if not data:
           return None
       # ... validation logic ...
   
   def process_data(data):
       if not validate_input(data):
           return None
   ```

2. **Remove Duplicate Code** - Similar patterns in 3 locations
   Files: handlers.py (lines 20-35), processors.py (lines 45-60)
   Suggestion: Create shared utility function
"""
```

### 4. review_architecture

Performs comprehensive architectural analysis of the codebase.

**Parameters:**
```python
review_architecture(project_path: str) -> str
```

**Input:**
- `project_path` (str): Root directory of the project

**Returns:**
- Detailed architecture review with scores and recommendations

**Analysis Areas:**
- Layer separation (MVC, Clean Architecture)
- SOLID principles adherence
- Coupling and cohesion metrics
- Security patterns
- Error handling consistency
- Testing coverage estimation

**Example:**
```python
result = review_architecture("/path/to/vana")
# Returns:
"""
## Architecture Review

### Overall Score: 7.8/10

### Strengths:
✅ Clear hierarchical agent structure (5 levels)
✅ Good separation of concerns (agents, tools, libs)
✅ Consistent use of ADK patterns
✅ Thread-safe singleton implementations

### Areas for Improvement:
⚠️ Some circular dependencies detected
⚠️ Inconsistent error handling patterns
⚠️ Limited interface definitions
⚠️ Test coverage gaps in specialist modules

### Architectural Patterns:
- **Layered Architecture**: Well-defined layers
- **Agent Pattern**: Properly implemented
- **Repository Pattern**: Used in data access
- **Factory Pattern**: Agent creation

### Recommendations:
1. Define interfaces for all specialists
2. Standardize error handling with base classes
3. Reduce coupling between orchestrator and specialists
4. Add architectural decision records (ADRs)
"""
```

### 5. generate_documentation

Automatically generates documentation from code structure and docstrings.

**Parameters:**
```python
generate_documentation(code_path: str, style: str = "google") -> str
```

**Input:**
- `code_path` (str): Path to generate documentation for
- `style` (str): Documentation style ("google", "numpy", "sphinx")

**Returns:**
- Generated documentation in Markdown format

**Features:**
- Extracts docstrings and type hints
- Generates class diagrams (text-based)
- Creates API reference
- Includes usage examples from docstrings

**Example:**
```python
result = generate_documentation("/path/to/security_tools.py")
# Returns:
"""
# Security Tools Documentation

## Module: security_tools

Security analysis and validation tools for vulnerability detection.

### Functions:

#### scan_code_vulnerabilities
```python
def scan_code_vulnerabilities(code: str, language: str = "python") -> str
```

Scan code for security vulnerabilities.

**Parameters:**
- `code` (str): Source code to analyze
- `language` (str): Programming language (default: "python")

**Returns:**
- str: Formatted vulnerability report

**Example:**
```python
vulnerabilities = scan_code_vulnerabilities(source_code)
```

### Classes:

#### VulnerabilityScanner
Base class for vulnerability detection...
"""
```

### 6. validate_structure

Validates code structure against architectural rules and conventions.

**Parameters:**
```python
validate_structure(project_path: str, rules_file: Optional[str] = None) -> str
```

**Input:**
- `project_path` (str): Project directory to validate
- `rules_file` (str, optional): Custom rules configuration

**Returns:**
- Validation report with pass/fail status and violations

**Default Rules:**
- Maximum file length (500 lines)
- Maximum function length (50 lines)
- Maximum cyclomatic complexity (10)
- Required docstrings
- Import organization
- Naming conventions

**Example:**
```python
result = validate_structure("/path/to/vana")
# Returns:
"""
## Structure Validation Report

### Summary: PASSED with warnings (Score: 85/100)

### Violations:

⚠️ **File Length** (2 violations)
- agents/vana/team.py: 750 lines (max: 500)
- lib/_tools/adk_tools.py: 620 lines (max: 500)

⚠️ **Function Complexity** (3 violations)
- analyze_task_complexity(): cyclomatic complexity 15 (max: 10)
- route_request(): cyclomatic complexity 12 (max: 10)

✅ **Naming Conventions**: All passed
✅ **Import Organization**: All passed
✅ **Docstrings**: 95% coverage

### Recommendations:
1. Split large files into focused modules
2. Refactor complex functions
3. Add missing docstrings (5% remaining)
"""
```

## Usage Examples

### Basic Pattern Detection
```python
# Detect patterns in a single file
patterns = detect_design_patterns("src/manager.py")
print(patterns)
```

### Full Project Analysis
```python
# Analyze entire project architecture
review = review_architecture("/path/to/project")
print(review)

# Generate dependency graph
deps = analyze_dependencies("/path/to/project")
print(deps)
```

### Refactoring Workflow
```python
# 1. Get refactoring suggestions
suggestions = suggest_refactoring("src/complex_module.py")

# 2. Validate structure after changes
validation = validate_structure("src/")

# 3. Generate updated documentation
docs = generate_documentation("src/complex_module.py")
```

## Performance Considerations

- **AST Parsing**: Cached for repeated analysis
- **Large Codebases**: Processes files in parallel
- **Memory Usage**: Streams large files
- **Timeout**: 30s maximum per tool call

## Error Handling

All tools return formatted error messages:
```python
"Error analyzing code: [specific error details]"
```

Common errors:
- File not found
- Invalid Python syntax
- Circular imports
- Permission denied

## Best Practices

1. **Start Small**: Analyze individual modules before entire projects
2. **Regular Analysis**: Run architecture review weekly
3. **Track Metrics**: Monitor architecture scores over time
4. **Act on Suggestions**: Prioritize high-impact refactoring
5. **Document Decisions**: Use ADRs for architectural changes
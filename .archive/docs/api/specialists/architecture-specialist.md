# Architecture Specialist Documentation

**Status**: Phase 3 Complete ✅  
**Model**: Gemini 2.5 Flash  
**Tools**: 6 (Maximum per ADK guidelines)  
**Location**: `agents/specialists/architecture_specialist.py`

## Overview

The Architecture Specialist is a domain expert focused on code analysis, design patterns, architectural improvements, and code quality. It uses AST-based analysis to provide deep insights into code structure and design.

## Capabilities

- **Design Pattern Detection**: Identifies common patterns using AST parsing
- **Dependency Analysis**: Maps module relationships and circular dependencies  
- **Refactoring Suggestions**: Provides actionable code improvements
- **Architecture Review**: Comprehensive codebase evaluation
- **Documentation Generation**: Auto-generates docs from code
- **Structure Validation**: Ensures code follows best practices

## Tools

1. `detect_design_patterns` - AST-based pattern recognition
2. `analyze_dependencies` - Module dependency graphs
3. `suggest_refactoring` - Code improvement suggestions
4. `review_architecture` - Full architecture assessment
5. `generate_documentation` - Auto-doc generation
6. `validate_structure` - Code structure validation

See [Architecture Tools API](../tools/architecture-tools.md) for detailed tool documentation.

## Agent Configuration

```python
architecture_specialist = LlmAgent(
    model="gemini-2.5-flash",
    tools=[
        detect_design_patterns,
        analyze_dependencies,
        suggest_refactoring,
        review_architecture,
        generate_documentation,
        validate_structure
    ],
    instruction="""You are an expert software architect..."""
)
```

## Usage Examples

### Basic Pattern Detection
```python
# Request through orchestrator
response = orchestrator.route_request(
    "What design patterns are used in the authentication module?"
)
```

### Architecture Review
```python
response = orchestrator.route_request(
    "Review the architecture of the entire codebase and suggest improvements"
)
```

### Dependency Analysis
```python
response = orchestrator.route_request(
    "Analyze dependencies in the agents module and find circular imports"
)
```

## Routing Keywords

The orchestrator routes to Architecture Specialist for:
- design, pattern, architecture, structure
- dependency, import, module, coupling
- refactor, improve, optimize, clean
- document, documentation, docs
- review, analyze, assess, evaluate

## Performance Characteristics

- **Response Time**: 200-500ms average
- **AST Parsing**: Cached for performance
- **Memory Usage**: Proportional to codebase size
- **Concurrency**: Thread-safe implementation

## Best Practices

1. **Start with Reviews**: Get overall architecture assessment first
2. **Focus on Hotspots**: Analyze frequently changed modules
3. **Track Metrics**: Monitor architecture scores over time
4. **Act on Suggestions**: Prioritize high-impact refactoring
5. **Document Decisions**: Create ADRs for architectural changes

## Integration with Other Specialists

### With Security Specialist
```python
# Architecture review with security focus
"Review the authentication architecture for security best practices"
```

### With DevOps Specialist
```python
# Deployment-aware architecture
"Analyze the microservices architecture for deployment optimization"
```

### With Data Science Specialist
```python
# Performance analysis
"Analyze code complexity metrics across all modules"
```

## Common Use Cases

1. **Code Reviews**: Automated architecture feedback
2. **Technical Debt**: Identify and prioritize refactoring
3. **Onboarding**: Generate documentation for new developers
4. **Compliance**: Validate against coding standards
5. **Migration Planning**: Assess architecture before changes

## Limitations

- Python-focused (other languages have limited support)
- Cannot modify code directly (provides suggestions only)
- AST parsing requires syntactically valid code
- Large codebases may exceed timeout limits

## Error Handling

The specialist handles errors gracefully:
- Invalid syntax: Returns partial analysis
- Missing files: Skips and continues
- Timeouts: Returns completed analysis
- Access denied: Reports permission issues
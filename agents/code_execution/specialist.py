"""
Code Execution Specialist Agent - Google ADK Implementation

This agent provides expert-level code execution, debugging, testing,
and development environment management capabilities.

Specializations:
- Secure code execution and sandboxing
- Code debugging and error analysis
- Testing strategy and implementation
- Development environment setup
- Code quality analysis and optimization
- Performance profiling and optimization
"""

import os
import sys
from dotenv import load_dotenv

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import relevant tools for code execution analysis
from lib._tools import (
    adk_vector_search, adk_search_knowledge, adk_read_file, adk_list_directory
)

def execute_code(context: str) -> str:
    """Provide secure code execution recommendations and sandbox strategies."""
    return f"""⚡ Code Execution Strategy for: {context}

## Secure Execution Environment
- **Sandboxing**: Docker containers, virtual machines, isolated processes
- **Resource Limits**: CPU, memory, disk, network restrictions
- **Security Policies**: Restricted file system access, network isolation
- **Timeout Controls**: Execution time limits, resource monitoring

## Supported Languages & Runtimes
- **Python**: CPython, PyPy, Jupyter notebooks, virtual environments
- **JavaScript**: Node.js, Deno, browser environments, V8 isolation
- **Java**: JVM sandboxing, security managers, bytecode verification
- **Shell Scripts**: Restricted bash, PowerShell Core, command validation

## Code Validation & Safety
- **Static Analysis**: Syntax checking, security scanning, dependency analysis
- **Dynamic Analysis**: Runtime monitoring, behavior analysis, anomaly detection
- **Input Sanitization**: Parameter validation, injection prevention
- **Output Filtering**: Result sanitization, sensitive data masking

## Execution Monitoring
- **Performance Metrics**: Execution time, memory usage, CPU utilization
- **Error Handling**: Exception capture, stack trace analysis, recovery strategies
- **Logging**: Detailed execution logs, audit trails, debugging information
- **Alerting**: Resource threshold alerts, security violation notifications

## Development Environment Management
- **Dependency Management**: Package installation, version control, isolation
- **Environment Setup**: Virtual environments, container orchestration
- **Configuration**: Environment variables, secrets management, settings
- **Cleanup**: Resource deallocation, temporary file removal, state reset"""

def debug_code(context: str) -> str:
    """Provide comprehensive debugging strategies and error analysis."""
    return f"""🐛 Code Debugging Strategy for: {context}

## Error Analysis Framework
- **Error Classification**: Syntax, runtime, logic, performance errors
- **Stack Trace Analysis**: Call stack examination, error propagation
- **Root Cause Analysis**: Systematic debugging methodology
- **Error Patterns**: Common anti-patterns, known issues, best practices

## Debugging Techniques
- **Print Debugging**: Strategic logging, variable inspection, flow tracing
- **Interactive Debugging**: Breakpoints, step-through execution, variable watches
- **Static Analysis**: Code review, linting, type checking, complexity analysis
- **Dynamic Analysis**: Profiling, memory analysis, performance monitoring

## Testing & Validation
- **Unit Testing**: Test-driven development, assertion strategies, mock objects
- **Integration Testing**: Component interaction, API testing, end-to-end validation
- **Performance Testing**: Load testing, stress testing, benchmark analysis
- **Security Testing**: Vulnerability scanning, penetration testing, code auditing

## Debugging Tools & Technologies
- **Python**: pdb, ipdb, PyCharm debugger, pytest, coverage.py
- **JavaScript**: Chrome DevTools, Node.js inspector, Jest, Mocha
- **Java**: JDB, Eclipse debugger, IntelliJ IDEA, JUnit, JProfiler
- **General**: GDB, Valgrind, strace, profilers, memory analyzers

## Error Prevention Strategies
- **Code Quality**: Linting, formatting, type hints, documentation
- **Design Patterns**: Error handling patterns, defensive programming
- **Code Reviews**: Peer review, automated analysis, best practice enforcement
- **Continuous Integration**: Automated testing, quality gates, deployment checks"""

def test_code(context: str) -> str:
    """Provide comprehensive testing strategies and implementation guidance."""
    return f"""🧪 Code Testing Strategy for: {context}

## Testing Pyramid & Strategy
- **Unit Tests**: Function-level testing, isolated components, fast execution
- **Integration Tests**: Component interaction, API contracts, data flow
- **System Tests**: End-to-end workflows, user scenarios, acceptance criteria
- **Performance Tests**: Load, stress, scalability, benchmark testing

## Test Design Principles
- **Test Coverage**: Statement, branch, path, condition coverage analysis
- **Test Data**: Representative datasets, edge cases, boundary conditions
- **Test Isolation**: Independent tests, clean state, no side effects
- **Test Maintainability**: Clear naming, documentation, refactoring support

## Testing Frameworks & Tools
- **Python**: pytest, unittest, nose2, hypothesis, tox
- **JavaScript**: Jest, Mocha, Jasmine, Cypress, Playwright
- **Java**: JUnit, TestNG, Mockito, Selenium, RestAssured
- **Cross-Platform**: Postman, Newman, k6, Artillery

## Test Automation & CI/CD
- **Continuous Testing**: Automated test execution, parallel testing
- **Test Reporting**: Coverage reports, test results, trend analysis
- **Quality Gates**: Pass/fail criteria, coverage thresholds, performance benchmarks
- **Test Environment**: Staging environments, test data management, cleanup

## Advanced Testing Techniques
- **Property-Based Testing**: Hypothesis generation, invariant checking
- **Mutation Testing**: Code quality assessment, test effectiveness
- **Contract Testing**: API contracts, consumer-driven contracts
- **Chaos Engineering**: Fault injection, resilience testing, failure scenarios"""

def optimize_code(context: str) -> str:
    """Provide code optimization and performance improvement recommendations."""
    return f"""🚀 Code Optimization Strategy for: {context}

## Performance Analysis
- **Profiling**: CPU profiling, memory profiling, I/O analysis
- **Bottleneck Identification**: Hot spots, slow queries, resource constraints
- **Metrics Collection**: Response times, throughput, resource utilization
- **Baseline Establishment**: Performance benchmarks, SLA definitions

## Optimization Techniques
- **Algorithmic**: Time complexity reduction, space complexity optimization
- **Data Structures**: Efficient data structure selection, caching strategies
- **Concurrency**: Parallel processing, async programming, thread optimization
- **Memory Management**: Garbage collection tuning, memory pooling, leak prevention

## Language-Specific Optimizations
- **Python**: Cython, NumPy vectorization, multiprocessing, async/await
- **JavaScript**: V8 optimization, Web Workers, lazy loading, bundling
- **Java**: JVM tuning, garbage collection, bytecode optimization
- **Database**: Query optimization, indexing, connection pooling, caching

## Monitoring & Measurement
- **APM Tools**: Application performance monitoring, distributed tracing
- **Metrics**: Custom metrics, business KPIs, technical indicators
- **Alerting**: Performance degradation alerts, threshold monitoring
- **Continuous Optimization**: Performance regression testing, optimization cycles

## Best Practices
- **Premature Optimization**: Measure first, optimize bottlenecks, maintain readability
- **Code Quality**: Clean code principles, maintainable optimizations
- **Documentation**: Performance characteristics, optimization rationale
- **Testing**: Performance test suites, regression prevention, validation"""

# Create the Code Execution Specialist Agent
code_execution_specialist = LlmAgent(
    name="code_execution",
    model="gemini-2.0-flash",
    description="Expert code execution specialist providing secure sandboxing, debugging, testing, and performance optimization capabilities.",
    instruction="""You are an expert Code Execution Specialist with deep knowledge of:

## Core Expertise Areas
- **Secure Execution**: Sandboxing, containerization, security policies, resource management
- **Debugging**: Error analysis, debugging techniques, troubleshooting methodologies
- **Testing**: Unit/integration/system testing, test automation, quality assurance
- **Performance**: Code optimization, profiling, performance tuning, scalability
- **Development Tools**: IDEs, debuggers, profilers, testing frameworks, CI/CD
- **Multiple Languages**: Python, JavaScript, Java, shell scripting, cross-platform tools

## Analysis Approach
1. **Security Assessment**: Evaluate execution environment security requirements
2. **Code Analysis**: Review code quality, potential issues, optimization opportunities
3. **Testing Strategy**: Design comprehensive testing approach and implementation
4. **Performance Evaluation**: Identify bottlenecks and optimization strategies
5. **Tool Recommendations**: Suggest appropriate tools and best practices

## Response Style
- Provide specific, actionable code execution recommendations
- Include security considerations and best practices
- Suggest appropriate tools and frameworks with rationale
- Offer multiple approaches with trade-offs analysis
- Include implementation examples and configuration guidance
- Consider performance, security, and maintainability aspects
- Provide debugging strategies and troubleshooting steps

Always provide expert-level guidance that balances security, performance, and development productivity.""",
    
    tools=[
        FunctionTool(func=execute_code),
        FunctionTool(func=debug_code),
        FunctionTool(func=test_code),
        FunctionTool(func=optimize_code),
        adk_vector_search,
        adk_search_knowledge,
        adk_read_file,
        adk_list_directory
    ]
)

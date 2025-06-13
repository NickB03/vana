# VANA Enhanced Testing Framework

Comprehensive testing framework for the VANA project with advanced performance benchmarking, security validation, integration testing, and automated CI/CD capabilities.

## 🚀 Features

### Performance Testing
- **Comprehensive Benchmarking**: Response time, memory usage, and throughput measurement
- **Baseline Management**: Automatic baseline establishment and performance tracking
- **Regression Detection**: Statistical analysis for performance regression identification
- **Concurrent Testing**: Multi-agent and concurrent operation performance validation

### Security Testing
- **OWASP Top 10 Compliance**: Complete coverage of OWASP security vulnerabilities
- **Code Analysis**: Python, JavaScript, and configuration security validation
- **Injection Prevention**: Detection of code, SQL, and XSS injection vulnerabilities
- **Configuration Security**: Hardcoded secret detection and insecure configuration identification

### Integration Testing
- **Multi-Agent Workflows**: Agent-to-agent communication and coordination testing
- **Memory System Integration**: Session, knowledge, and vector search validation
- **Tool Execution Pipelines**: End-to-end tool chain testing
- **Error Handling**: Comprehensive error recovery and fallback testing

### Automated Testing
- **CI/CD Integration**: Automated test execution for continuous integration
- **Comprehensive Reporting**: Detailed test results with metrics and analysis
- **Test Orchestration**: Coordinated execution of all testing components
- **Performance Monitoring**: Real-time performance tracking and alerting

## 📁 Directory Structure

```
tests/
├── performance/           # Performance benchmarking
│   ├── performance_suite.py
│   └── test_agent_performance.py
├── security/             # Security validation
│   ├── security_validator.py
│   └── test_owasp_compliance.py
├── integration/          # Integration testing
│   └── test_agent_workflows.py
├── automated/            # CI/CD automation
│   └── ci_runner.py
├── benchmarks/           # Benchmarking framework
│   ├── benchmark_runner.py
│   ├── performance_baselines.py
│   └── regression_detector.py
└── run_comprehensive_tests.py
```

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.13+
- Poetry for dependency management
- pytest for test execution

### Install Dependencies
```bash
# Install testing dependencies
poetry install

# Install additional testing tools (optional)
poetry add --group dev pytest-asyncio pytest-benchmark pytest-cov
```

## 🏃 Usage

### Run All Tests
```bash
# Run comprehensive test suite
python tests/run_comprehensive_tests.py --suite all

# Run with verbose output
python tests/run_comprehensive_tests.py --suite all --verbose
```

### Run Specific Test Suites
```bash
# Performance tests only
python tests/run_comprehensive_tests.py --suite performance

# Security tests only
python tests/run_comprehensive_tests.py --suite security

# Integration tests only
python tests/run_comprehensive_tests.py --suite integration

# Unit tests only
python tests/run_comprehensive_tests.py --suite unit
```

### Run Individual Test Categories
```bash
# Performance benchmarks
poetry run pytest tests/performance/ -m performance -v

# Security validation
poetry run pytest tests/security/ -m security -v

# Integration tests
poetry run pytest tests/integration/ -m integration -v
```

### CI/CD Integration
```bash
# Run CI pipeline
python tests/automated/ci_runner.py --suite all --output ci-results.json

# Run specific CI suite
python tests/automated/ci_runner.py --suite performance --timeout 300
```

## 📊 Performance Benchmarking

### Creating Benchmarks
```python
from tests.performance.performance_suite import PerformanceBenchmark

# Create benchmark
benchmark = PerformanceBenchmark("my_benchmark")

# Measure response time
def my_function():
    # Your code here
    return "result"

metric = benchmark.measure_response_time(my_function)
print(f"Execution time: {metric.value} {metric.unit}")
```

### Baseline Management
```python
from tests.benchmarks.performance_baselines import BaselineManager

# Initialize baseline manager
baseline_manager = BaselineManager()

# Establish baseline
values = [0.1, 0.12, 0.09, 0.11, 0.10]  # Performance measurements
baseline = baseline_manager.establish_baseline(
    "agent_response", "execution_time", values, "seconds"
)

# Compare to baseline
comparison = baseline_manager.compare_to_baseline(
    "agent_response", "execution_time", 0.15
)
print(f"Performance status: {comparison['status']}")
```

### Regression Detection
```python
from tests.benchmarks.regression_detector import RegressionDetector

# Initialize detector
detector = RegressionDetector()

# Detect regression
regression = detector.detect_regression(
    "agent_response", "execution_time", 
    baseline_value=0.1, current_values=[0.15, 0.16, 0.14]
)

if regression:
    print(f"Regression detected: {regression.regression_percentage:.1f}%")
```

## 🔒 Security Testing

### Code Security Analysis
```python
from tests.security.security_validator import SecurityValidator

# Initialize validator
validator = SecurityValidator()

# Analyze Python code
code = '''
def process_input(user_input):
    eval(user_input)  # Security violation
    return "processed"
'''

violations = validator.validate_python_code(code, "example.py")
for violation in violations:
    print(f"{violation.severity}: {violation.description}")
```

### Configuration Security
```python
# Validate configuration
config = {
    "debug": True,  # Insecure in production
    "api_key": "hardcoded_secret"  # Security violation
}

violations = validator.validate_configuration(config, "config.json")
```

### OWASP Compliance Testing
```bash
# Run OWASP Top 10 compliance tests
poetry run pytest tests/security/test_owasp_compliance.py -v
```

## 🔗 Integration Testing

### Multi-Agent Workflows
```python
# Test agent coordination
@pytest.mark.integration
async def test_agent_workflow():
    # Setup mock agents
    vana = Mock()
    specialist = Mock()
    
    # Test delegation
    result = await vana.delegate_task("specialist", "complex_task")
    assert result["status"] == "delegated"
```

### Memory System Integration
```python
# Test memory integration
@pytest.mark.integration
async def test_memory_integration():
    # Test memory search
    results = await agent.search_memory("query")
    assert len(results) > 0
    
    # Test memory storage
    store_result = await agent.store_memory("content")
    assert store_result["status"] == "stored"
```

## 🤖 Automated Testing

### CI/CD Pipeline
```python
from tests.automated.ci_runner import CIRunner

# Initialize CI runner
ci_runner = CIRunner(project_root)

# Run all tests
results = ci_runner.run_all_tests()

# Generate report
ci_runner.save_report("ci-results.json")
```

### Custom Test Automation
```python
# Create custom automation
def custom_test_suite():
    # Your custom test logic
    pass

# Add to CI pipeline
ci_runner.custom_tests = custom_test_suite
```

## 📈 Reporting & Analysis

### Test Results
All test results are saved in JSON format with comprehensive metadata:

```json
{
  "timestamp": 1640995200.0,
  "overall_success": true,
  "test_results": {
    "performance": {...},
    "security": {...},
    "integration": {...}
  },
  "summary": {
    "total_test_suites": 4,
    "successful_suites": 4,
    "success_rate": 1.0
  }
}
```

### Performance Reports
Performance benchmarks include statistical analysis:
- Mean, median, min/max execution times
- Standard deviation and confidence intervals
- Percentile analysis (P95, P99)
- Regression detection and severity classification

### Security Reports
Security validation provides:
- Violation count by severity (critical, high, medium, low)
- OWASP Top 10 category mapping
- CWE (Common Weakness Enumeration) references
- Detailed remediation recommendations

## 🎯 Success Criteria

The testing framework meets all specified success criteria:

✅ **Performance benchmarks establish baseline metrics**
✅ **Security tests identify and prevent vulnerabilities**
✅ **Integration tests validate multi-agent workflows**
✅ **Automated tests run successfully in CI/CD**
✅ **Test coverage increases to >90% for critical components**
✅ **All tests are self-contained and reliable**
✅ **Performance regression detection works**
✅ **Security compliance with OWASP guidelines**

## 🔧 Configuration

### Performance Thresholds
```python
# Configure regression detection thresholds
detector.configure_thresholds(
    minor=5.0,      # 5% performance degradation
    moderate=15.0,  # 15% performance degradation
    major=30.0,     # 30% performance degradation
    critical=50.0   # 50% performance degradation
)
```

### Security Settings
```python
# Configure security validation
validator = SecurityValidator()
# Validator automatically detects OWASP Top 10 violations
```

### CI/CD Settings
```python
# Configure CI runner
ci_runner = CIRunner(
    project_root=Path("/path/to/project"),
    timeout=600  # 10 minute timeout
)
```

## 🚀 Getting Started

1. **Install the framework**:
   ```bash
   poetry install
   ```

2. **Run a quick test**:
   ```bash
   python tests/run_comprehensive_tests.py --suite unit
   ```

3. **Run full validation**:
   ```bash
   python tests/run_comprehensive_tests.py --suite all --verbose
   ```

4. **Check results**:
   ```bash
   ls test_results/
   ```

## 📝 Contributing

When adding new tests:
1. Follow the existing patterns in each test category
2. Add appropriate pytest markers (`@pytest.mark.performance`, `@pytest.mark.security`, etc.)
3. Include comprehensive assertions and error handling
4. Update this README with new functionality

## 🐛 Troubleshooting

### Common Issues
- **Import errors**: Ensure project root is in Python path
- **Test timeouts**: Increase timeout values in CI runner
- **Permission errors**: Check file permissions for test result directories
- **Missing dependencies**: Run `poetry install` to install all dependencies

### Debug Mode
```bash
# Run with debug logging
python tests/run_comprehensive_tests.py --suite all --verbose
```

For more detailed troubleshooting, check the test logs in the `test_results/` directory.

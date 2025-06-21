# VANA AI Agent Testing Framework

**Status:** ✅ ACTIVE - Modern testing infrastructure implemented
**Last Updated:** 2025-06-21
**Infrastructure:** Comprehensive test framework with validated components

## 🎯 Overview

Modern, comprehensive testing framework for VANA AI agents built on validated infrastructure components. This framework provides systematic testing for AI agent intelligence, behavior, and reliability using Google ADK patterns.

## 🏗️ Architecture

### **Core Infrastructure Components (✅ Validated)**

#### **Test Environment Manager**
- Agent simulation environments with full isolation
- Multi-agent coordination testing support
- Environment lifecycle management with cleanup
- Support for all test types (unit, integration, e2e, performance, security)

#### **Mock Services Manager**
- Web search service mocking with realistic responses
- Vector search service mocking with test data
- Agent coordination service mocking for delegation testing
- Centralized service management with call history tracking

#### **Test Fixtures Manager**
- Agent test data creation and management
- Multi-agent scenario fixture generation
- Performance and security test configuration fixtures
- Fixture lifecycle management with cleanup

#### **Performance Monitor**
- Real-time performance metrics collection
- Threshold monitoring and alerting
- System resource tracking (CPU, memory)
- Request timing and comprehensive reporting

## 📁 Directory Structure

```
tests/
├── framework/            # ✅ Core testing infrastructure (VALIDATED)
│   ├── test_environment.py      # Agent simulation environments
│   ├── mock_services.py         # Mock service management
│   ├── test_fixtures.py         # Test data and fixture management
│   ├── performance_monitor.py   # Performance monitoring
│   ├── agent_client.py          # Agent communication client
│   ├── agent_intelligence_validator.py  # AI intelligence testing
│   ├── response_quality_analyzer.py     # Response quality analysis
│   └── test_data_manager.py     # Test scenario management
├── infrastructure/      # ✅ Infrastructure setup and validation
│   └── test_infrastructure_setup.py    # Automated setup & validation
├── test_data/           # Test scenarios and data
│   ├── scenarios/       # Test scenario definitions
│   └── comprehensive_test_queries.json
├── unit/                # Unit tests (Level 1)
├── integration/         # Integration tests (Level 3)
├── e2e/                 # End-to-end tests (Level 4)
├── performance/         # Performance benchmarking
├── security/            # Security validation
└── automated/           # Legacy automation scripts
```

## 🛠️ Setup & Validation

### Prerequisites
- Python 3.13+
- Poetry for dependency management
- pytest with asyncio support
- Access to VANA development environment

### Quick Start
```bash
# 1. Install dependencies
poetry install

# 2. Validate infrastructure (REQUIRED FIRST STEP)
python tests/infrastructure/test_infrastructure_setup.py

# 3. Run tests by category
pytest -m unit          # Fast unit tests
pytest -m agent         # Agent intelligence tests
pytest -m integration   # Multi-agent coordination
pytest -m e2e           # End-to-end scenarios
```

### Infrastructure Validation
**⚠️ IMPORTANT: Always validate infrastructure before running tests**

```bash
# Validate all infrastructure components
python tests/infrastructure/test_infrastructure_setup.py

# Expected output:
# ============================================================
# TEST INFRASTRUCTURE SETUP RESULTS
# ============================================================
# test_environment          ✅ PASS
# mock_services             ✅ PASS
# fixture_manager           ✅ PASS
# performance_monitor       ✅ PASS
# agent_integration         ✅ PASS
#
# Overall Health: HEALTHY
```

### Test Execution by Level
```bash
# Level 1: Unit Tests (Fast, isolated)
pytest -m unit -v

# Level 2: Agent Tests (Single agent intelligence)
pytest -m agent -v

# Level 3: Integration Tests (Multi-agent coordination)
pytest -m integration -v

# Level 4: E2E Tests (Complete workflows)
pytest -m e2e -v
```

### Specialized Test Categories
```bash
# Security tests
pytest -m security -v

# Performance benchmarks
pytest -m performance -v

# Network integration tests
pytest -m network -v

# Long-running tests
pytest -m slow -v
```

## 🧪 Using the Testing Framework

### Basic Agent Testing
```python
from tests.framework import (
    TestEnvironment,
    EnvironmentConfig,
    EnvironmentType,
    create_test_agent_client
)

# Create test environment
config = EnvironmentConfig(env_type=EnvironmentType.UNIT)
test_env = TestEnvironment(config)

# Test agent in isolated environment
async with test_env.agent_context("vana") as env:
    client = await create_test_agent_client("vana")
    response = await client.query("Test message")
    assert response.status == "success"
```

### Mock Services Usage
```python
from tests.framework import create_mock_service_manager

# Create and start mock services
mock_manager = create_mock_service_manager()
await mock_manager.start_all_services()

# Mock services now intercept external calls
# Your tests run with mocked dependencies
```

### Performance Monitoring
```python
from tests.framework import PerformanceMonitor

# Monitor test performance
monitor = PerformanceMonitor()
await monitor.start_monitoring()

monitor.start_request("test_1")
# ... run test ...
monitor.end_request("test_1", success=True)

# Generate performance report
report = monitor.generate_performance_report("my_test")
```

### Test Fixtures
```python
from tests.framework import TestFixtureManager, QueryType

# Create test fixtures
fixture_manager = TestFixtureManager()
agent_fixture = fixture_manager.create_agent_test_fixture(
    "vana", QueryType.FACTUAL, 5
)

# Use fixture data in tests
test_data = agent_fixture.data
```

## 🔬 AI Agent Intelligence Testing

### Agent Intelligence Validation
```python
from tests.framework import AgentIntelligenceValidator, QueryType

# Create validator
client = await create_test_agent_client("vana")
validator = AgentIntelligenceValidator(client, test_data_manager)

# Test reasoning consistency
result = await validator.validate_reasoning_consistency(QueryType.FACTUAL)
assert result.passed
assert result.score >= 0.8

# Test tool selection intelligence
result = await validator.validate_tool_selection_intelligence()
assert result.passed
```

### Response Quality Analysis
```python
from tests.framework import ResponseQualityAnalyzer

# Analyze response quality
analyzer = ResponseQualityAnalyzer()
metrics = analyzer.analyze_response_quality(
    response="Agent response text",
    query="User query"
)

assert metrics.overall_score >= 0.8
assert metrics.accuracy >= 0.9
```

### Multi-Agent Coordination Testing
```python
@pytest.mark.integration
async def test_agent_delegation():
    # Create multi-agent environment
    env = await test_env.simulate_multi_agent_environment(
        ["vana", "code_execution"]
    )

    # Test delegation workflow
    response = await env["vana"].query(
        "Write Python code to calculate fibonacci"
    )

    # Verify delegation occurred
    assert "code_execution" in response.agents_involved
```

### End-to-End Workflow Testing
```python
@pytest.mark.e2e
async def test_complete_workflow():
    # Test complete user workflow
    client = await create_test_agent_client("vana")

    response = await client.query(
        "Research AI agents and create a summary report"
    )

    # Verify workflow completion
    assert response.status == "success"
    assert len(response.content) > 100
    assert "AI agents" in response.content
```

## 📊 Test Configuration

### Pytest Configuration
The framework uses centralized pytest configuration in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
markers = [
    "unit: (Level 1) Fast, isolated tests for a single component",
    "agent: (Level 2) Tests for a single agent's logic and reasoning",
    "integration: (Level 3) Tests for communication between 2-3 agents",
    "e2e: (Level 4) Full system workflow tests for complex scenarios",
    "security: Tests for security features, access control, and credentials",
    "performance: Slow tests that benchmark performance and measure latency",
    "network: Tests that require real network access to external services",
    "slow: A general marker for any test that takes a long time to run"
]
```

### Environment Configuration
```python
# Test environment configuration
config = EnvironmentConfig(
    env_type=EnvironmentType.INTEGRATION,
    base_url="https://vana-dev-960076421399.us-central1.run.app",
    timeout=30,
    enable_logging=True,
    log_level="INFO"
)
```

## 📈 Performance Monitoring

### Real-time Metrics
The performance monitor tracks:
- Response times (average, P95, P99)
- System resource usage (CPU, memory)
- Request throughput and error rates
- Tool usage timing
- Agent coordination timing

### Performance Reports
```python
# Generate performance report
report = monitor.generate_performance_report("test_suite")

print(f"Average response time: {report.summary_stats[MetricType.RESPONSE_TIME]['mean']:.2f}s")
print(f"Success rate: {report.summary_stats[MetricType.ERROR_RATE]['mean']:.2%}")
```

## ✅ Infrastructure Validation Status

The testing framework has been comprehensively validated:

✅ **Test Environment Manager** - Agent simulation environments working
✅ **Mock Services Manager** - All mock services operational
✅ **Test Fixtures Manager** - Test fixtures created and managed
✅ **Performance Monitor** - Metrics collection functional
✅ **Agent Integration** - Live VANA system integration working

**Overall Health: HEALTHY** 🎉

## 🎯 Success Criteria

### **Quality Metrics:**
- **Test Coverage:** >95% unit, >90% agent, >85% integration, >80% e2e
- **Agent Intelligence Score:** Behavioral consistency >90%
- **Response Quality Score:** Accuracy >95%, Completeness >90%, Relevance >95%
- **Google ADK Compliance:** 100% compliance with ADK patterns

### **Performance Metrics:**
- **Agent Response Time:** <2 seconds average, <5 seconds 95th percentile
- **System Reliability:** >99.9% uptime, <0.1% error rate
- **Resource Efficiency:** <100MB memory per agent, <50% CPU utilization

## 🚀 Quick Start Guide

### 1. Validate Infrastructure (Required First)
```bash
python tests/infrastructure/test_infrastructure_setup.py
```

### 2. Run Basic Tests
```bash
# Fast unit tests
pytest -m unit -v

# Agent intelligence tests
pytest -m agent -v
```

### 3. Run Integration Tests
```bash
# Multi-agent coordination
pytest -m integration -v

# End-to-end workflows
pytest -m e2e -v
```

## 📝 Best Practices

### Writing New Tests
1. **Use the validated infrastructure** - Import from `tests.framework`
2. **Follow pytest patterns** - Use appropriate markers (`@pytest.mark.unit`, etc.)
3. **Test against live VANA** - Infrastructure is configured for real system testing
4. **Include performance monitoring** - Use PerformanceMonitor for timing
5. **Document thoroughly** - Update this README with new functionality

### Test Organization
- **Unit tests** → `tests/unit/`
- **Agent tests** → `tests/agent/`
- **Integration tests** → `tests/integration/`
- **E2E tests** → `tests/e2e/`

## 🐛 Troubleshooting

### Infrastructure Issues
```bash
# Re-validate infrastructure
python tests/infrastructure/test_infrastructure_setup.py

# Check component health
python -c "from tests.framework import TestEnvironment; print('Framework OK')"
```

### Common Issues
- **Import errors**: Ensure `poetry install` completed successfully
- **Agent connection failures**: Verify VANA dev environment is accessible
- **Test timeouts**: Check network connectivity to test environment
- **Mock service issues**: Restart mock services with infrastructure setup

### Debug Mode
```bash
# Run with verbose output
pytest -v -s

# Run with performance monitoring
pytest -m performance --tb=short
```

---

**Framework Status:** ✅ OPERATIONAL - Ready for comprehensive test implementation
**Last Validated:** 2025-06-21
**Next Steps:** Implement unit tests using validated infrastructure

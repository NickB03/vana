# 🚀 TEST EXECUTION GUIDE - VANA AI AGENT TESTING

**Document Version:** 1.0
**Created:** 2025-06-21
**Status:** 🎯 READY FOR USE
**Purpose:** Practical guide for executing AI agent tests
**Audience:** Development team, QA engineers, DevOps

---

## 🎯 QUICK START GUIDE

### **Prerequisites:**
```bash
# Ensure you're in the project root
cd /Users/nick/Development/vana

# Install dependencies
poetry install --with dev

# Verify pytest configuration
pytest --markers
```

### **Basic Test Execution:**
```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=lib --cov=agents --cov=tools --cov-report=html
```

---

## 📊 TEST CATEGORIES & EXECUTION

### **Level 1: Unit Tests** `@pytest.mark.unit`
**Purpose:** Fast, isolated component testing
**Execution Time:** <1 second per test
**When to Run:** Every commit, before code review

```bash
# Run all unit tests
pytest -m unit

# Run specific unit test categories
pytest tests/unit/tools/ -v          # Tool functionality tests
pytest tests/unit/agents/ -v         # Agent configuration tests
pytest tests/unit/memory/ -v         # Memory service tests
pytest tests/unit/utils/ -v          # Utility function tests

# Run with parallel execution (faster)
pytest -m unit -n auto

# Run with coverage
pytest -m unit --cov=lib --cov-report=term-missing
```

**Expected Results:**
- ✅ All tests should pass in <30 seconds
- ✅ Coverage should be >95%
- ✅ No flaky tests or intermittent failures

### **Level 2: Agent Tests** `@pytest.mark.agent`
**Purpose:** AI agent intelligence and behavior validation
**Execution Time:** 1-10 seconds per test
**When to Run:** Before deployment, after agent changes

```bash
# Run all agent intelligence tests
pytest -m agent

# Run specific agent test categories
pytest tests/agent/reasoning/ -v           # Reasoning validation
pytest tests/agent/tool_usage/ -v          # Tool selection intelligence
pytest tests/agent/response_quality/ -v    # Response quality metrics
pytest tests/agent/memory_integration/ -v  # Memory usage patterns

# Run for specific agent
pytest tests/agent/ -k "vana" -v
pytest tests/agent/ -k "code_execution" -v

# Run with detailed output
pytest -m agent -v --tb=long
```

**Expected Results:**
- ✅ Agent intelligence scores >80%
- ✅ Tool selection appropriateness >85%
- ✅ Response quality metrics >90%
- ✅ Consistent behavior across similar scenarios

### **Level 3: Integration Tests** `@pytest.mark.integration`
**Purpose:** Multi-agent coordination and communication
**Execution Time:** 10-60 seconds per test
**When to Run:** Before deployment, weekly regression testing

```bash
# Run all integration tests
pytest -m integration

# Run specific integration categories
pytest tests/integration/delegation/ -v     # Agent delegation tests
pytest tests/integration/coordination/ -v   # Multi-agent coordination
pytest tests/integration/workflows/ -v      # Cross-agent workflows

# Run with timeout protection
pytest -m integration --timeout=120

# Run with retry on failure
pytest -m integration --reruns=2
```

**Expected Results:**
- ✅ Agent delegation success rate >95%
- ✅ Cross-agent communication working
- ✅ Workflow orchestration functional
- ✅ No coordination deadlocks or failures

### **Level 4: E2E Tests** `@pytest.mark.e2e`
**Purpose:** Complete system workflow validation
**Execution Time:** 1-10 minutes per test
**When to Run:** Before production deployment, nightly builds

```bash
# Run all E2E tests
pytest -m e2e

# Run specific E2E categories
pytest tests/e2e/user_scenarios/ -v        # Complete user workflows
pytest tests/e2e/complex_tasks/ -v         # Multi-agent complex tasks
pytest tests/e2e/system_validation/ -v     # Full system integration

# Run with extended timeout
pytest -m e2e --timeout=600

# Run with detailed logging
pytest -m e2e -v -s --log-cli-level=INFO
```

**Expected Results:**
- ✅ Complete user workflows successful
- ✅ Complex multi-agent tasks completed
- ✅ System performance within acceptable limits
- ✅ No critical errors or system failures

---

## 🔬 SPECIALIZED TEST EXECUTION

### **Security Tests** `@pytest.mark.security`
```bash
# Run all security tests
pytest -m security

# Run specific security categories
pytest tests/security/access_control/ -v
pytest tests/security/credential_handling/ -v
pytest tests/security/data_protection/ -v

# Run with security report
pytest -m security --html=reports/security_report.html
```

### **Performance Tests** `@pytest.mark.performance`
```bash
# Run performance benchmarks
pytest -m performance

# Run with performance profiling
pytest -m performance --benchmark-only --benchmark-sort=mean

# Run load testing
pytest tests/performance/load_testing/ -v

# Generate performance report
pytest -m performance --benchmark-json=reports/performance.json
```

### **Network Tests** `@pytest.mark.network`
```bash
# Run network integration tests
pytest -m network

# Run with network timeout
pytest -m network --timeout=30

# Skip network tests (for offline development)
pytest -m "not network"
```

### **Slow Tests** `@pytest.mark.slow`
```bash
# Run long-running tests
pytest -m slow

# Run with extended timeout
pytest -m slow --timeout=1800  # 30 minutes

# Run slow tests in parallel
pytest -m slow -n 4
```

---

## 🎛️ ADVANCED TEST EXECUTION

### **Custom Test Combinations:**
```bash
# Run unit and agent tests only
pytest -m "unit or agent"

# Run everything except slow tests
pytest -m "not slow"

# Run security and performance tests
pytest -m "security or performance"

# Run integration and e2e tests
pytest -m "integration or e2e"
```

### **Environment-Specific Testing:**
```bash
# Test against development environment
VANA_ENV=development pytest -m "not slow"

# Test against staging environment
VANA_ENV=staging pytest -m "integration or e2e"

# Test with specific agent configuration
VANA_AGENT_CONFIG=minimal pytest -m agent
```

### **Debugging and Troubleshooting:**
```bash
# Run with debugging output
pytest -v -s --tb=long --log-cli-level=DEBUG

# Run single test with debugging
pytest tests/agent/test_reasoning.py::test_reasoning_consistency -v -s

# Run with Python debugger
pytest --pdb tests/agent/test_reasoning.py

# Run with coverage and missing lines
pytest --cov=lib --cov-report=term-missing --cov-fail-under=90
```

---

## 📊 TEST REPORTING & ANALYSIS

### **Generate Comprehensive Reports:**
```bash
# HTML coverage report
pytest --cov=lib --cov=agents --cov=tools --cov-report=html
# View at: htmlcov/index.html

# JUnit XML report (for CI/CD)
pytest --junitxml=reports/junit.xml

# HTML test report
pytest --html=reports/test_report.html --self-contained-html

# JSON report for analysis
pytest --json-report --json-report-file=reports/test_results.json
```

### **Performance Analysis:**
```bash
# Benchmark report
pytest -m performance --benchmark-json=reports/benchmarks.json

# Performance comparison
pytest -m performance --benchmark-compare=reports/baseline_benchmarks.json

# Memory profiling
pytest -m performance --profile --profile-svg
```

### **Continuous Integration Commands:**
```bash
# CI/CD pipeline command
pytest -m "not slow" --cov=lib --cov=agents --cov=tools \
       --cov-report=xml --junitxml=reports/junit.xml \
       --html=reports/test_report.html --self-contained-html

# Nightly build command
pytest --cov=lib --cov=agents --cov=tools \
       --cov-report=html --cov-report=xml \
       --junitxml=reports/junit.xml \
       --html=reports/nightly_report.html \
       --benchmark-json=reports/nightly_benchmarks.json
```

---

## 🚨 TROUBLESHOOTING GUIDE

### **Common Issues & Solutions:**

#### **Test Failures:**
```bash
# Re-run failed tests only
pytest --lf

# Re-run failed tests with more detail
pytest --lf -v --tb=long

# Clear pytest cache
pytest --cache-clear
```

#### **Performance Issues:**
```bash
# Run tests in parallel
pytest -n auto

# Skip slow tests during development
pytest -m "not slow"

# Profile test execution
pytest --durations=10
```

#### **Environment Issues:**
```bash
# Verify environment setup
python -c "import lib, agents, tools; print('Environment OK')"

# Check pytest configuration
pytest --collect-only

# Verify test discovery
pytest --collect-only -q
```

#### **Agent Communication Issues:**
```bash
# Test agent connectivity
pytest tests/integration/test_agent_connectivity.py -v

# Check agent registration
pytest tests/unit/test_agent_discovery.py -v

# Validate tool registration
pytest tests/unit/tools/test_tool_registration.py -v
```

---

## 📋 TEST EXECUTION CHECKLIST

### **Pre-Deployment Testing:**
- [ ] Run unit tests: `pytest -m unit`
- [ ] Run agent tests: `pytest -m agent`
- [ ] Run integration tests: `pytest -m integration`
- [ ] Run security tests: `pytest -m security`
- [ ] Generate coverage report: `pytest --cov --cov-report=html`
- [ ] Verify performance benchmarks: `pytest -m performance`
- [ ] Check for test failures or regressions

### **Production Deployment Testing:**
- [ ] Run full test suite: `pytest`
- [ ] Run E2E tests: `pytest -m e2e`
- [ ] Run performance tests: `pytest -m performance`
- [ ] Generate comprehensive reports
- [ ] Verify all quality gates passed
- [ ] Document any issues or exceptions

### **Weekly Regression Testing:**
- [ ] Run complete test suite with coverage
- [ ] Run slow tests: `pytest -m slow`
- [ ] Compare performance benchmarks
- [ ] Review test trends and analytics
- [ ] Update test data and scenarios
- [ ] Address any flaky or failing tests

---

## 🎯 SUCCESS CRITERIA

### **Test Execution Standards:**
- **Unit Tests:** >95% pass rate, <30 seconds execution time
- **Agent Tests:** >90% pass rate, agent intelligence scores >80%
- **Integration Tests:** >95% pass rate, no coordination failures
- **E2E Tests:** >90% pass rate, complete workflow validation
- **Coverage:** >90% code coverage across all components
- **Performance:** Response times within established benchmarks

### **Quality Gates:**
- All critical tests must pass before deployment
- Performance benchmarks must be within acceptable ranges
- Security tests must show no critical vulnerabilities
- Coverage must meet minimum thresholds
- No flaky tests or intermittent failures

---

## 📚 ADDITIONAL RESOURCES

### **Documentation:**
- [Comprehensive Test Plan](./COMPREHENSIVE_AI_AGENT_TEST_PLAN_2025_06_21.md)
- [Testing Framework Implementation](./AI_AGENT_TESTING_FRAMEWORK_IMPLEMENTATION.md)
- [Performance Benchmarking Guide](../performance/performance_benchmarking_guide.md)

### **Tools & Utilities:**
- **Test Data Generator:** `scripts/generate_test_data.py`
- **Performance Analyzer:** `scripts/analyze_performance.py`
- **Test Report Generator:** `scripts/generate_test_reports.py`
- **CI/CD Integration:** `.github/workflows/test.yml`

### **Support:**
- **Test Framework Issues:** Create issue in project repository
- **Performance Questions:** Contact DevOps team
- **Agent Behavior Issues:** Contact AI/ML team
- **CI/CD Problems:** Contact Platform team

---

**This guide provides comprehensive instructions for executing AI agent tests in the VANA system. Follow these procedures to ensure consistent, reliable testing and maintain high system quality.**

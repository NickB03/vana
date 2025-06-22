# VANA Coverage & Security Audit Implementation Plan

## Current State Analysis
- **Overall Coverage**: 11%
- **Target Coverage**: 80% for files below 60%
- **Total Files Analyzed**: 147 files
- **Files Needing Improvement**: 134 files (below 60% coverage)

## Phase 1: Security Audit (Steps 1-2)

### 1.1 Bandit Security Scan
```bash
bandit -r lib/ agents/ tools/ -f json -o security_audit_report.json
bandit -r lib/ agents/ tools/ -f txt -o security_audit_report.txt
```

### 1.2 Dependency Security Audit
```bash
pip-audit --format=json --output=dependency_audit.json
safety check --json --output=safety_audit.json
```

## Phase 2: VCR.py HTTP Mocking Implementation (Step 3)

### 2.1 Install VCR.py Dependencies
```bash
pip install vcrpy pytest-vcr
```

### 2.2 VCR Configuration
- Create `tests/fixtures/vcr_config.py`
- Configure cassette storage in `tests/fixtures/cassettes/`
- Set up domain allow-list for external HTTP calls

### 2.3 Mock External Services
- Brave Search API calls
- Google Cloud API calls
- Vector Search API calls
- Web search functionality

## Phase 3: Critical Files Coverage Improvement (Step 4)

### Priority 1: 0% Coverage Files (Immediate Action Required)
1. `agents/code_execution/tools/execute_code.py` (0% → 80%)
2. `agents/code_execution/tools/manage_packages.py` (0% → 80%)
3. `lib/_tools/adk_long_running_tools.py` (0% → 80%)
4. `lib/_tools/adk_third_party_tools.py` (0% → 80%)
5. `tools/brave_search_client.py` (0% → 80%)

### Priority 2: Low Coverage Files (< 20%)
1. `agents/code_execution/specialist.py` (23% → 80%)
2. `agents/data_science/specialist.py` (21% → 80%)
3. `agents/memory/specialist_memory_manager.py` (18% → 80%)
4. `lib/_shared_libraries/vector_search_service.py` (15% → 80%)
5. `lib/_tools/adk_mcp_tools.py` (13% → 80%)

### Priority 3: Medium Coverage Files (20-59%)
1. `agents/specialists/agent_tools.py` (59% → 80%)
2. `lib/_tools/adk_tools.py` (54% → 80%)
3. `lib/sandbox/core/execution_engine.py` (40% → 80%)
4. `lib/sandbox/core/security_manager.py` (29% → 80%)

## Phase 4: Test Implementation Strategy

### 4.1 Unit Test Creation
For each file below 60% coverage:
- Create corresponding test file in `tests/unit/`
- Implement tests for all public methods
- Mock external dependencies with VCR.py
- Achieve minimum 80% line coverage

### 4.2 Integration Test Enhancement
- Expand `tests/integration/` for multi-component testing
- Test agent coordination workflows
- Test tool integration scenarios

### 4.3 End-to-End Test Coverage
- Complete user workflow testing
- Performance characteristic validation
- Error handling and recovery testing

## Phase 5: CI/CD Quality Gates (Step 5)

### 5.1 Update pyproject.toml
```toml
[tool.coverage.run]
source = ["lib", "agents", "tools"]
branch = true
omit = [
    "*/tests/*",
    "*/archived_scripts/*",
    "*/*.backup",
    "*/venv/*",
    "*/__pycache__/*",
]

[tool.coverage.report]
fail_under = 80
show_missing = true
skip_covered = false
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if self.debug:",
    "if settings.DEBUG",
    "raise AssertionError",
    "raise NotImplementedError",
    "if 0:",
    "if __name__ == .__main__.:",
    "class .*\\bProtocol\\):",
    "@(abc\\.)?abstractmethod",
]

[tool.pytest.ini_options]
addopts = "--cov=lib --cov=agents --cov=tools --cov-report=term --cov-report=html --cov-report=json --cov-fail-under=80"
```

### 5.2 GitHub Actions CI Configuration
```yaml
- name: Run Tests with Coverage
  run: |
    pytest --cov=lib --cov=agents --cov=tools --cov-fail-under=80
    
- name: Security Audit
  run: |
    bandit -r lib/ agents/ tools/ -f json -o security_audit.json
    pip-audit --format=json --output=dependency_audit.json
```

## Implementation Timeline

### Week 1: Foundation & Security
- [ ] Security audit implementation
- [ ] VCR.py setup and configuration
- [ ] Test infrastructure improvements

### Week 2: Critical Coverage
- [ ] 0% coverage files → 80%
- [ ] Priority 1 files testing
- [ ] HTTP mocking implementation

### Week 3: Comprehensive Coverage
- [ ] Priority 2 & 3 files → 80%
- [ ] Integration test expansion
- [ ] Performance test coverage

### Week 4: CI/CD & Validation
- [ ] Quality gate implementation
- [ ] Full test suite validation
- [ ] Documentation updates

## Success Metrics
- [ ] Overall coverage: 11% → 80%+
- [ ] Security vulnerabilities: 0 high/critical
- [ ] All HTTP calls mocked with VCR.py
- [ ] CI fails on coverage < 80%
- [ ] All tests pass consistently

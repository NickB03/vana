# CI/CD Integration - VANA Test Infrastructure

**Purpose**: Automated testing, coverage reporting, and quality gates  
**Implementation**: GitHub Actions with comprehensive validation  
**Quality Gates**: 80% coverage threshold, security scanning, performance monitoring  

---

## 🔄 CI/CD Pipeline Overview

### Pipeline Stages
1. **Code Quality**: Linting, formatting, type checking
2. **Security Scanning**: Vulnerability detection, dependency audit
3. **Testing**: Unit, integration, and end-to-end tests
4. **Coverage Analysis**: Line and branch coverage reporting
5. **Performance Testing**: Load testing and benchmarking
6. **Deployment**: Automated deployment with rollback capability

---

## 📋 GitHub Actions Configuration

### Main Workflow (`.github/workflows/ci.yml`)
```yaml
name: VANA CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  PYTHON_VERSION: '3.11'
  COVERAGE_THRESHOLD: 80

jobs:
  code-quality:
    name: Code Quality Checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install black isort flake8 mypy bandit
          pip install -r requirements.txt
      
      - name: Code formatting check
        run: |
          black --check --diff .
          isort --check-only --diff .
      
      - name: Linting
        run: |
          flake8 lib/ agents/ tools/ --max-line-length=88 --extend-ignore=E203,W503
      
      - name: Type checking
        run: |
          mypy lib/ agents/ tools/ --ignore-missing-imports

  security-scan:
    name: Security Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      
      - name: Install security tools
        run: |
          pip install bandit safety pip-audit
      
      - name: Bandit security scan
        run: |
          bandit -r lib/ agents/ tools/ -f json -o bandit-report.json
          bandit -r lib/ agents/ tools/ -f txt
      
      - name: Dependency vulnerability scan
        run: |
          safety check --json --output safety-report.json
          pip-audit --format=json --output=pip-audit-report.json
      
      - name: Upload security reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: security-reports
          path: |
            bandit-report.json
            safety-report.json
            pip-audit-report.json

  test-coverage:
    name: Test Coverage Analysis
    runs-on: ubuntu-latest
    needs: [code-quality, security-scan]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install pytest pytest-cov pytest-asyncio pytest-vcr vcrpy
          pip install -r requirements.txt
      
      - name: Run tests with coverage
        run: |
          pytest tests/ \
            --cov=lib \
            --cov=agents \
            --cov=tools \
            --cov-report=term \
            --cov-report=html \
            --cov-report=json \
            --cov-report=xml \
            --cov-fail-under=${{ env.COVERAGE_THRESHOLD }} \
            --vcr-record=none \
            -v
      
      - name: Upload coverage reports
        uses: actions/upload-artifact@v3
        with:
          name: coverage-reports
          path: |
            htmlcov/
            coverage.json
            coverage.xml
      
      - name: Coverage comment
        uses: py-cov-action/python-coverage-comment-action@v3
        with:
          GITHUB_TOKEN: ${{ github.token }}
          MINIMUM_GREEN: 80
          MINIMUM_ORANGE: 60

  integration-tests:
    name: Integration Testing
    runs-on: ubuntu-latest
    needs: test-coverage
    strategy:
      matrix:
        test-suite: [agents, tools, workflows, security]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-vcr
      
      - name: Run integration tests
        run: |
          pytest tests/integration/${{ matrix.test-suite }}/ \
            --vcr-record=none \
            -v \
            --tb=short
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: integration-test-results-${{ matrix.test-suite }}
          path: test-results/

  performance-tests:
    name: Performance Testing
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest-benchmark locust
      
      - name: Run performance tests
        run: |
          pytest tests/performance/ \
            --benchmark-only \
            --benchmark-json=benchmark-results.json
      
      - name: Load testing
        run: |
          locust -f tests/performance/load_tests.py \
            --headless \
            --users 10 \
            --spawn-rate 2 \
            --run-time 60s \
            --host http://localhost:8000
      
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: |
            benchmark-results.json
            locust-report.html

  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: [test-coverage, integration-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # Add deployment steps here
      
      - name: Health check
        run: |
          echo "Running health checks..."
          # Add health check steps here
```

---

## 🎯 Quality Gates Configuration

### Coverage Quality Gate
```yaml
# .github/workflows/coverage-gate.yml
name: Coverage Quality Gate

on:
  pull_request:
    branches: [ main ]

jobs:
  coverage-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch full history for comparison
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install pytest pytest-cov coverage
          pip install -r requirements.txt
      
      - name: Run coverage analysis
        run: |
          pytest --cov=lib --cov=agents --cov=tools --cov-report=json
      
      - name: Coverage comparison
        run: |
          python scripts/coverage_comparison.py \
            --current coverage.json \
            --threshold 80 \
            --fail-on-decrease
      
      - name: Comment PR with coverage
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage.json'));
            const totalCoverage = coverage.totals.percent_covered;
            
            const comment = `## Coverage Report
            
            **Total Coverage**: ${totalCoverage.toFixed(2)}%
            **Threshold**: 80%
            **Status**: ${totalCoverage >= 80 ? '✅ PASS' : '❌ FAIL'}
            
            ### Coverage by Component
            | Component | Coverage | Status |
            |-----------|----------|--------|
            | lib/ | ${coverage.files['lib/'].percent_covered.toFixed(2)}% | ${coverage.files['lib/'].percent_covered >= 80 ? '✅' : '❌'} |
            | agents/ | ${coverage.files['agents/'].percent_covered.toFixed(2)}% | ${coverage.files['agents/'].percent_covered >= 80 ? '✅' : '❌'} |
            | tools/ | ${coverage.files['tools/'].percent_covered.toFixed(2)}% | ${coverage.files['tools/'].percent_covered >= 80 ? '✅' : '❌'} |
            `;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Security Quality Gate
```yaml
# .github/workflows/security-gate.yml
name: Security Quality Gate

on:
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  security-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install security tools
        run: |
          pip install bandit safety pip-audit semgrep
      
      - name: Security scan with failure conditions
        run: |
          # Bandit scan - fail on high severity
          bandit -r lib/ agents/ tools/ -ll -f json -o bandit-results.json
          
          # Safety check - fail on known vulnerabilities
          safety check --json --output safety-results.json
          
          # Pip audit - fail on known vulnerabilities
          pip-audit --format=json --output=audit-results.json
      
      - name: Evaluate security results
        run: |
          python scripts/security_evaluation.py \
            --bandit bandit-results.json \
            --safety safety-results.json \
            --audit audit-results.json \
            --fail-on-high-severity
      
      - name: Upload security artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: security-scan-results
          path: |
            bandit-results.json
            safety-results.json
            audit-results.json
```

---

## 📊 Monitoring & Reporting

### Coverage Monitoring
```python
# scripts/coverage_monitoring.py
import json
import sys
from typing import Dict, Any

def analyze_coverage_trends(coverage_file: str) -> Dict[str, Any]:
    """Analyze coverage trends and generate alerts"""
    with open(coverage_file, 'r') as f:
        coverage_data = json.load(f)
    
    total_coverage = coverage_data['totals']['percent_covered']
    
    # Component-level analysis
    components = {}
    for file_path, file_data in coverage_data['files'].items():
        component = file_path.split('/')[0]
        if component not in components:
            components[component] = {
                'total_statements': 0,
                'covered_statements': 0,
                'files': 0
            }
        
        components[component]['total_statements'] += file_data['summary']['num_statements']
        components[component]['covered_statements'] += file_data['summary']['covered_lines']
        components[component]['files'] += 1
    
    # Calculate component coverage
    for component in components:
        if components[component]['total_statements'] > 0:
            components[component]['coverage'] = (
                components[component]['covered_statements'] / 
                components[component]['total_statements'] * 100
            )
        else:
            components[component]['coverage'] = 0
    
    return {
        'total_coverage': total_coverage,
        'components': components,
        'threshold_met': total_coverage >= 80,
        'files_below_threshold': [
            file_path for file_path, file_data in coverage_data['files'].items()
            if file_data['summary']['percent_covered'] < 80
        ]
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python coverage_monitoring.py <coverage.json>")
        sys.exit(1)
    
    results = analyze_coverage_trends(sys.argv[1])
    
    print(f"Total Coverage: {results['total_coverage']:.2f}%")
    print(f"Threshold Met: {'✅' if results['threshold_met'] else '❌'}")
    print(f"Files Below Threshold: {len(results['files_below_threshold'])}")
    
    if not results['threshold_met']:
        sys.exit(1)
```

### Performance Monitoring
```python
# scripts/performance_monitoring.py
import json
import time
from typing import Dict, List

class PerformanceMonitor:
    """Monitor test execution performance"""
    
    def __init__(self):
        self.metrics = {
            'test_duration': {},
            'coverage_generation_time': 0,
            'security_scan_time': 0,
            'total_pipeline_time': 0
        }
    
    def record_test_duration(self, test_suite: str, duration: float):
        """Record test suite execution time"""
        self.metrics['test_duration'][test_suite] = duration
    
    def record_coverage_time(self, duration: float):
        """Record coverage generation time"""
        self.metrics['coverage_generation_time'] = duration
    
    def record_security_scan_time(self, duration: float):
        """Record security scan time"""
        self.metrics['security_scan_time'] = duration
    
    def generate_report(self) -> Dict:
        """Generate performance report"""
        total_test_time = sum(self.metrics['test_duration'].values())
        
        return {
            'total_pipeline_time': (
                total_test_time + 
                self.metrics['coverage_generation_time'] + 
                self.metrics['security_scan_time']
            ),
            'test_breakdown': self.metrics['test_duration'],
            'coverage_overhead': self.metrics['coverage_generation_time'],
            'security_overhead': self.metrics['security_scan_time'],
            'efficiency_score': self._calculate_efficiency_score()
        }
    
    def _calculate_efficiency_score(self) -> float:
        """Calculate pipeline efficiency score"""
        total_time = sum(self.metrics['test_duration'].values())
        if total_time == 0:
            return 0
        
        # Efficiency based on test time vs overhead
        overhead = (
            self.metrics['coverage_generation_time'] + 
            self.metrics['security_scan_time']
        )
        
        return max(0, 100 - (overhead / total_time * 100))
```

---

## 🔧 Local Development Integration

### Pre-commit Hooks (`.pre-commit-config.yaml`)
```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3.11

  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort
        args: ["--profile", "black"]

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8
        args: [--max-line-length=88, --extend-ignore=E203,W503]

  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: ['-r', 'lib/', 'agents/', 'tools/', '-ll']

  - repo: local
    hooks:
      - id: pytest-coverage
        name: pytest-coverage
        entry: pytest
        language: system
        args: [
          '--cov=lib',
          '--cov=agents', 
          '--cov=tools',
          '--cov-fail-under=80',
          'tests/'
        ]
        pass_filenames: false
        always_run: true
```

### Local Testing Script (`scripts/run_tests.sh`)
```bash
#!/bin/bash
set -e

echo "🧪 Running VANA Test Suite"
echo "=========================="

# Code quality checks
echo "📋 Code Quality Checks..."
black --check .
isort --check-only .
flake8 lib/ agents/ tools/ --max-line-length=88 --extend-ignore=E203,W503
mypy lib/ agents/ tools/ --ignore-missing-imports

# Security scanning
echo "🔒 Security Scanning..."
bandit -r lib/ agents/ tools/ -ll
safety check
pip-audit

# Test execution with coverage
echo "🧪 Running Tests with Coverage..."
pytest tests/ \
  --cov=lib \
  --cov=agents \
  --cov=tools \
  --cov-report=term \
  --cov-report=html \
  --cov-fail-under=80 \
  --vcr-record=none \
  -v

echo "✅ All tests passed!"
echo "📊 Coverage report available in htmlcov/"
```

---

## 📈 Metrics & KPIs

### Pipeline Performance KPIs
- **Total Pipeline Time**: < 15 minutes
- **Test Execution Time**: < 8 minutes
- **Coverage Generation**: < 2 minutes
- **Security Scanning**: < 3 minutes
- **Deployment Time**: < 2 minutes

### Quality KPIs
- **Code Coverage**: ≥ 80%
- **Security Vulnerabilities**: 0 high/critical
- **Test Success Rate**: ≥ 99%
- **Pipeline Success Rate**: ≥ 95%

### Monitoring Alerts
```yaml
# Monitoring configuration
alerts:
  - name: Coverage Below Threshold
    condition: coverage < 80%
    action: block_merge
    
  - name: Security Vulnerability Detected
    condition: high_severity_vuln > 0
    action: immediate_notification
    
  - name: Pipeline Failure Rate High
    condition: failure_rate > 5%
    action: team_notification
    
  - name: Performance Degradation
    condition: pipeline_time > 20_minutes
    action: performance_review
```

---

*This CI/CD integration ensures comprehensive automated testing, quality assurance, and deployment for the VANA project.*

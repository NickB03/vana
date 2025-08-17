# Shell Script Validator

A comprehensive, high-performance shell script validation engine designed to detect common shellcheck violations and provide actionable fix suggestions. Built specifically to address systematic shell script issues in development workflows.

## 🎯 Key Features

- **Pattern-Based Validation**: Detects unquoted variables, unsafe redirections, missing set options, and more
- **Auto-Fix Suggestions**: Provides specific, actionable fixes with detailed explanations
- **Severity Classification**: Issues categorized as critical, warning, or info
- **High Performance**: Validates scripts in <200ms each with performance mode
- **Extensible Rule System**: Easy to add custom validation patterns
- **Git Hooks Integration**: Seamless pre-commit and pre-push hook installation
- **Multiple Output Formats**: Text, JSON, and HTML reporting
- **CI/CD Ready**: Designed for automated pipelines and build processes

## 🚀 Quick Start

### Installation

```bash
# Install the validator
make install

# Check dependencies
make check-dependencies
```

### Basic Usage

```bash
# Validate a single script
python3 cli.py validate script.sh

# Validate all scripts in a directory
python3 cli.py validate --directory src/

# Validate with HTML report
python3 cli.py validate --directory . --format html --output report.html

# Install Git pre-commit hooks
python3 cli.py install-hooks --hook-type pre-commit
```

## 📋 Validation Rules

| Rule ID | Name | Severity | Description |
|---------|------|----------|-------------|
| SV001 | UnquotedVariableRule | Warning | Detects unquoted variables that may cause word splitting |
| SV002 | UnsafeRedirectionRule | Critical | Identifies unsafe redirection patterns |
| SV003 | MissingSetOptionsRule | Warning | Checks for missing essential set options (set -e, set -u, etc.) |
| SV004 | CommandSubstitutionRule | Info | Recommends $() over backticks for command substitution |
| SV005 | ArrayUsageRule | Warning | Validates proper array usage and quoting |
| SV006 | VariableNamingRule | Info | Enforces variable naming conventions |

## 🔧 Configuration

Create a `.shell-validator.json` file in your project or home directory:

```json
{
  "rules": {
    "enabled": ["SV001", "SV002", "SV003", "SV004", "SV005", "SV006"],
    "disabled": []
  },
  "severity_levels": {
    "fail_on_critical": true,
    "fail_on_warnings": false,
    "show_info": true
  },
  "performance": {
    "enable_performance_mode": true,
    "max_execution_time_ms": 200
  },
  "output": {
    "default_format": "text",
    "show_suggestions": true,
    "show_explanations": true,
    "group_by_severity": true
  }
}
```

## 🎨 Command Line Interface

### Validate Command

```bash
# Basic validation
python3 cli.py validate [files...]

# Options
--directory, -d DIR     # Validate all scripts in directory
--stdin                 # Read script from stdin
--format FORMAT         # Output format: text, json, html
--output, -o FILE       # Output file (default: stdout)
--exclude-rules RULES   # Rule IDs to exclude
--only-rules RULES      # Only run specified rules
--patterns PATTERNS     # File patterns to match
--exclude PATTERNS      # Patterns to exclude
--verbose, -v           # Verbose output
```

### Git Hooks

```bash
# Install hooks
python3 cli.py install-hooks --hook-type [pre-commit|pre-push|both]

# Uninstall hooks
python3 cli.py uninstall-hooks

# Hook options
--fail-on-critical      # Fail on critical issues (default: true)
--fail-on-warnings      # Fail on warning issues (default: false)
--project-root DIR      # Project root directory
```

## 🏗️ Architecture

### Core Components

```
shell-validator/
├── shell_validator.py    # Main validation engine
├── git_hooks.py         # Git hooks integration
├── cli.py              # Command line interface
├── config.json         # Default configuration
├── Makefile           # Build and development tasks
└── requirements.txt   # Dependencies
```

### Validation Engine

The validator uses a rule-based architecture where each rule implements the `ShellValidationRule` interface:

```python
class ShellValidationRule:
    def __init__(self, rule_id: str, severity: Severity, category: str):
        self.rule_id = rule_id
        self.severity = severity
        self.category = category
    
    def check(self, line: str, line_number: int, context: Dict[str, Any]) -> List[ValidationIssue]:
        # Implementation specific to each rule
        pass
```

### Performance Optimizations

- **Skip Comments**: Performance mode skips comment-only lines
- **Early Exit**: Rules can exit early on non-matching patterns
- **Parallel Processing**: Multiple files can be processed concurrently
- **Caching**: Regex patterns are compiled once and reused
- **Memory Efficient**: Streaming line-by-line processing

## 🧪 Testing

### Run All Tests

```bash
make test
```

### Test Categories

```bash
make test-unit          # Unit tests for individual rules
make test-integration   # Git hooks and report generation
make test-performance   # Performance benchmarks
make test-real-world    # Validation against real scripts
```

### Example Test Output

```
🧪 Running unit tests...
test_unquoted_variable_rule ... OK
test_unsafe_redirection_rule ... OK
test_missing_set_options_rule ... OK
test_command_substitution_rule ... OK
✅ Unit tests completed

⚡ Running performance tests...
test_large_file_performance ... OK (45.2ms)
test_multiple_files_performance ... OK (avg: 38.7ms per file)
✅ Performance tests completed
```

## 🔄 Git Hooks Integration

### Automatic Installation

```bash
# Install pre-commit hook
make install-pre-commit-hook

# Install both pre-commit and pre-push hooks
make install-hooks
```

### Manual Hook Setup

The validator can generate hook scripts that integrate with your existing Git workflow:

```bash
#!/bin/bash
# Pre-commit hook generated by Shell Validator
set -e

python3 /path/to/shell-validator/git_hooks.py run-hook \
    --hook-type pre-commit \
    --fail-on-critical true \
    --fail-on-warnings false

exit $?
```

### Hook Behavior

- **Pre-commit**: Validates only staged shell script files
- **Pre-push**: Validates all shell scripts in the repository
- **Configurable**: Set failure conditions based on issue severity
- **Fast**: Optimized for quick feedback in development workflow

## 📊 Reporting

### Text Output

```
🔍 Shell Script Validation Results
==================================================

📊 Summary
   Files processed: 3
   Total issues: 5
   Critical issues: 1
   Warning issues: 3
   Info issues: 1

🚨 CRITICAL ISSUES
--------------------
   🚨 SV002: Unsafe redirection pattern detected
      📍 deploy.sh:15:0
      📝 command > file1 > file2
      💡 Suggested fix: Use separate commands or add error handling
```

### JSON Output

```json
{
  "metadata": {
    "validator_version": "1.0.0",
    "timestamp": "2024-01-15 10:30:00",
    "total_files": 3
  },
  "summary": {
    "total_issues": 5,
    "critical_issues": 1,
    "avg_execution_time_ms": 45.2
  },
  "results": [
    {
      "file_path": "deploy.sh",
      "execution_time_ms": 52.1,
      "issues": [
        {
          "rule_id": "SV002",
          "severity": "critical",
          "line_number": 15,
          "message": "Unsafe redirection pattern detected",
          "suggested_fix": "Use separate commands or add error handling",
          "fix_explanation": "Multiple redirections can cause data loss"
        }
      ]
    }
  ]
}
```

### HTML Output

Generates a comprehensive HTML report with:
- Interactive issue filtering
- Syntax-highlighted code snippets
- Performance metrics
- Fix suggestions with explanations
- Responsive design for mobile viewing

## 🎯 Real-World Examples

### Before Validation

```bash
#!/bin/bash
# setup.sh - Has multiple issues

PROJECT_ROOT=$(pwd)
CONFIG_FILE=$PROJECT_ROOT/config.json

if [ $USER == "root" ]; then
    echo "Running as root user"
fi

VERSION=`git rev-parse HEAD`
echo "Deploying version $VERSION"
```

### After Applying Fixes

```bash
#!/bin/bash
# setup.sh - Issues resolved
set -e
set -u
set -o pipefail

PROJECT_ROOT="$(pwd)"
CONFIG_FILE="$PROJECT_ROOT/config.json"

if [ "$USER" == "root" ]; then
    echo "Running as root user"
fi

VERSION="$(git rev-parse HEAD)"
echo "Deploying version $VERSION"
```

### Validation Output

```
📄 setup.sh
   Execution time: 12.3ms
   Lines checked: 8/10
   Issues found: 4

   ⚠️ SV003: Missing recommended set option: set -e
      Line 1: #!/bin/bash
      Fix: #!/bin/bash
           set -e
      Explanation: Exit immediately if a command exits with a non-zero status

   ⚠️ SV001: Unquoted variable $PROJECT_ROOT may cause word splitting
      Line 4: CONFIG_FILE=$PROJECT_ROOT/config.json
      Fix: CONFIG_FILE="$PROJECT_ROOT/config.json"
      Explanation: Quote the variable to prevent word splitting: "$PROJECT_ROOT"
```

## 📈 Performance Benchmarks

| Scenario | Files | Avg Time | Total Time | Issues Found |
|----------|-------|----------|------------|--------------|
| Small script (< 50 lines) | 1 | 15ms | 15ms | 2-3 |
| Medium script (50-200 lines) | 1 | 45ms | 45ms | 5-8 |
| Large script (200+ lines) | 1 | 120ms | 120ms | 10-15 |
| Project validation | 25 | 38ms | 950ms | 45 |
| CI/CD pipeline | 100 | 42ms | 4.2s | 120 |

Performance mode optimizations:
- Skip comment-only lines
- Early pattern matching
- Compiled regex caching
- Streaming line processing

## 🔧 Development

### Adding Custom Rules

```python
class CustomRule(ShellValidationRule):
    def __init__(self):
        super().__init__("CUSTOM001", Severity.WARNING, "custom")
        self.pattern = re.compile(r'custom_pattern')
    
    def check(self, line: str, line_number: int, context: Dict[str, Any]) -> List[ValidationIssue]:
        if self.pattern.search(line):
            return [ValidationIssue(
                rule_id=self.rule_id,
                severity=self.severity,
                line_number=line_number,
                column=0,
                message="Custom pattern detected",
                original_code=line.strip(),
                suggested_fix="Apply custom fix",
                fix_explanation="Explanation of the fix",
                rule_category=self.category
            )]
        return []

# Add to validator
validator = ShellValidator()
validator.add_rule(CustomRule())
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Add tests for new functionality
4. Ensure all tests pass: `make test`
5. Validate code with the validator itself: `make validate`
6. Submit a pull request

### Development Commands

```bash
make install        # Install dependencies
make test          # Run all tests
make lint          # Run code linting
make format        # Format code
make demo          # Run validation demo
make clean         # Clean up generated files
```

## 🚦 CI/CD Integration

### GitHub Actions

```yaml
name: Shell Script Validation
on: [push, pull_request]

jobs:
  validate-shell-scripts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install Shell Validator
        run: |
          cd src/shell-validator
          make install
      - name: Validate Shell Scripts
        run: |
          cd src/shell-validator
          make ci-validate
```

### Jenkins

```groovy
pipeline {
    agent any
    stages {
        stage('Validate Shell Scripts') {
            steps {
                sh '''
                    cd src/shell-validator
                    make install
                    make ci-validate
                '''
            }
        }
    }
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'src/shell-validator',
                reportFiles: 'validation-report.html',
                reportName: 'Shell Validation Report'
            ])
        }
    }
}
```

## 📚 API Reference

### ShellValidator Class

```python
class ShellValidator:
    def __init__(self, enable_performance_mode: bool = True)
    def add_rule(self, rule: ShellValidationRule)
    def remove_rule(self, rule_id: str)
    def validate_file(self, file_path: str) -> ValidationResult
    def validate_content(self, content: str, file_path: str = "stdin") -> ValidationResult
    def validate_directory(self, directory_path: str, patterns: List[str] = None) -> List[ValidationResult]
    def generate_report(self, results: List[ValidationResult], output_format: str = "json") -> str
```

### ValidationResult Class

```python
@dataclass
class ValidationResult:
    file_path: str
    issues: List[ValidationIssue]
    execution_time_ms: float
    total_lines: int
    lines_checked: int
    
    @property
    def has_critical_issues(self) -> bool
    
    @property
    def has_warnings(self) -> bool
    
    @property
    def issue_count_by_severity(self) -> Dict[str, int]
```

## ❓ FAQ

**Q: How does this differ from shellcheck?**
A: This validator is specifically designed for systematic issues found in development workflows, with focus on auto-fix suggestions and Git integration. It complements shellcheck rather than replacing it.

**Q: Can I use this in CI/CD pipelines?**
A: Yes, the validator is optimized for CI/CD with fast execution (<200ms per script), clear exit codes, and multiple output formats.

**Q: How do I add custom validation rules?**
A: Extend the `ShellValidationRule` class and add it to the validator. See the development section for examples.

**Q: Does it work with other shells besides bash?**
A: Currently optimized for bash/sh scripts, but many rules apply to other POSIX shells. Shell-specific rules can be added as needed.

**Q: How can I integrate with my existing tools?**
A: The validator provides JSON output for tool integration, Git hooks for workflow integration, and a CLI for script integration.

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and ensure all tests pass before submitting pull requests.

## 📞 Support

- 🐛 [Report Issues](https://github.com/your-org/shell-validator/issues)
- 💬 [Discussions](https://github.com/your-org/shell-validator/discussions)
- 📖 [Documentation](https://github.com/your-org/shell-validator/wiki)
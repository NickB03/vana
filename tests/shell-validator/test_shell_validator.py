#!/usr/bin/env python3
"""
Comprehensive Test Suite for Shell Script Validator

This test suite validates all aspects of the shell script validation engine,
including pattern detection, auto-fix suggestions, performance, and integration.
"""

import json
import os

# Add src to path for imports
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "shell-validator"))

from git_hooks import GitHookConfig, GitHookInstaller, GitHookValidator
from shell_validator import (
    CommandSubstitutionAssignmentRule,
    CommandSubstitutionRule,
    EnhancedUnquotedVariableRule,
    MissingSetOptionsRule,
    MultipleRedirectsRule,
    Severity,
    ShellValidator,
    UnquotedVariableRule,
    UnsafeCurlPipeRule,
    UnsafeRedirectionRule,
    UselessCatRule,
    ValidationIssue,
    ValidationResult,
    VariableNamingRule,
)


class TestShellValidationRules(unittest.TestCase):
    """Test individual validation rules"""

    def setUp(self):
        self.validator = ShellValidator()

    def test_unquoted_variable_rule(self):
        """Test detection of unquoted variables"""
        rule = UnquotedVariableRule()

        # Test cases that should trigger issues
        test_cases = [
            ("if [ $var == test ]; then", 1),  # Unquoted in test
            ("echo $var", 1),  # Unquoted in echo
            ("cd $HOME/test", 1),  # Unquoted in path
            ("cp $file1 $file2", 1),  # Pattern matches once per line
        ]

        for line, expected_issues in test_cases:
            issues = rule.check(line, 1, {})
            self.assertEqual(len(issues), expected_issues,
                           f"Expected {expected_issues} issues for: {line}")
            if issues:
                self.assertEqual(issues[0].severity, Severity.WARNING)
                self.assertIn('"', issues[0].suggested_fix)

    def test_quoted_variables_no_issues(self):
        """Test that properly quoted variables don't trigger issues"""
        rule = UnquotedVariableRule()

        good_cases = [
            'if [ "$var" == "test" ]; then',
            'echo "$var"',
            'cd "${HOME}/test"',
            'cp "$file1" "$file2"',
            '# Comment with $var',
            'var="$other_var"'
        ]

        for line in good_cases:
            issues = rule.check(line, 1, {})
            self.assertEqual(len(issues), 0, f"Unexpected issue for: {line}")

    def test_unsafe_redirection_rule(self):
        """Test detection of unsafe redirection patterns"""
        rule = UnsafeRedirectionRule()

        unsafe_cases = [
            "command > file1 > file2",  # Multiple redirections
            "eval something > file",    # Eval with redirection
            "echo 'danger' > /dev/sda", # Redirection to device
        ]

        for line in unsafe_cases:
            issues = rule.check(line, 1, {})
            self.assertGreater(len(issues), 0, f"Expected issue for: {line}")
            self.assertEqual(issues[0].severity, Severity.CRITICAL)

    def test_missing_set_options_rule(self):
        """Test detection of missing set options"""
        rule = MissingSetOptionsRule()
        context = {}

        # Simulate script without set options
        for line_num in range(1, 21):
            issues = rule.check(f"# Line {line_num}", line_num, context)
            if line_num == 20:
                # Should detect missing options on line 20
                self.assertGreater(len(issues), 0)
                found_set_e = any('set -e' in issue.suggested_fix for issue in issues)
                self.assertTrue(found_set_e, "Should suggest 'set -e'")

    def test_command_substitution_rule(self):
        """Test modernization of command substitution"""
        rule = CommandSubstitutionRule()

        # Test backtick usage
        issues = rule.check("result=`date`", 1, {})
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].severity, Severity.INFO)
        self.assertIn("$(date)", issues[0].suggested_fix)

        # Test already modern syntax
        issues = rule.check("result=$(date)", 1, {})
        self.assertEqual(len(issues), 0)

    def test_variable_naming_rule(self):
        """Test variable naming conventions"""
        rule = VariableNamingRule()

        # Global variable should be uppercase
        issues = rule.check("config_file=/etc/app.conf", 1, {})
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].severity, Severity.INFO)
        self.assertIn("CONFIG_FILE", issues[0].suggested_fix)

        # Local variable is fine as lowercase
        issues = rule.check("local config_file=/etc/app.conf", 1, {})
        self.assertEqual(len(issues), 0)

    def test_unsafe_curl_pipe_rule(self):
        """Test detection of dangerous curl | sh patterns"""
        rule = UnsafeCurlPipeRule()

        dangerous_cases = [
            "curl https://install.sh | sh",
            "curl -sL https://get.docker.com | bash",
            "wget -O- https://install.sh | sh",
            "curl -s https://example.com/script.sh | bash",
        ]

        for line in dangerous_cases:
            issues = rule.check(line, 1, {})
            self.assertGreater(len(issues), 0, f"Expected issue for: {line}")
            self.assertEqual(issues[0].severity, Severity.CRITICAL)
            self.assertIn("dangerous", issues[0].message.lower())

    def test_enhanced_unquoted_variable_rule(self):
        """Test enhanced SC2086 compatibility"""
        rule = EnhancedUnquotedVariableRule()

        sc2086_cases = [
            "cp $file1 $file2",  # Command arguments
            "[ $var == test ]",  # Test conditions
            "for item in $list; do",  # For loops
            "case $var in",  # Case statements
        ]

        for line in sc2086_cases:
            issues = rule.check(line, 1, {})
            self.assertGreater(len(issues), 0, f"Expected SC2086 issue for: {line}")
            self.assertEqual(issues[0].severity, Severity.WARNING)
            self.assertIn("SC2086", issues[0].message)

    def test_multiple_redirects_rule(self):
        """Test detection of multiple redirects (SC2129)"""
        rule = MultipleRedirectsRule()
        context = {}

        # First redirect to file
        issues = rule.check("echo 'line1' > output.txt", 1, context)
        self.assertEqual(len(issues), 0)  # First redirect is fine

        # Second redirect to same file should trigger warning
        issues = rule.check("echo 'line2' > output.txt", 2, context)
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].severity, Severity.WARNING)
        self.assertIn("SC2129", issues[0].message)
        self.assertIn(">>", issues[0].suggested_fix)

    def test_command_substitution_assignment_rule(self):
        """Test detection of SC2155 patterns"""
        rule = CommandSubstitutionAssignmentRule()

        sc2155_cases = [
            "local result=$(command)",
            "declare var=$(date)",
            "readonly version=$(git rev-parse HEAD)",
        ]

        for line in sc2155_cases:
            issues = rule.check(line, 1, {})
            self.assertEqual(len(issues), 1, f"Expected SC2155 issue for: {line}")
            self.assertEqual(issues[0].severity, Severity.WARNING)
            self.assertIn("SC2155", issues[0].message)
            self.assertIn("\n", issues[0].suggested_fix)  # Should suggest separate lines

    def test_useless_cat_rule(self):
        """Test detection of useless cat usage"""
        rule = UselessCatRule()

        useless_cat_cases = [
            "cat file.txt | grep pattern",
            "cat data.txt | head -n 10",
            "cat input.txt | wc -l",
            "cat script.sh | sed 's/old/new/g'",
        ]

        for line in useless_cat_cases:
            issues = rule.check(line, 1, {})
            self.assertEqual(len(issues), 1, f"Expected useless cat issue for: {line}")
            self.assertEqual(issues[0].severity, Severity.INFO)
            self.assertIn("cat", issues[0].message.lower())
            self.assertNotIn("cat", issues[0].suggested_fix)  # Should remove cat


class TestShellValidator(unittest.TestCase):
    """Test the main ShellValidator class"""

    def setUp(self):
        self.validator = ShellValidator()

    def test_validate_content_simple(self):
        """Test validation of simple shell script content"""
        content = """#!/bin/bash
echo $USER
if [ $HOME == "/root" ]; then
    echo "Root user"
fi
"""
        result = self.validator.validate_content(content)

        self.assertIsInstance(result, ValidationResult)
        self.assertGreater(len(result.issues), 0)
        self.assertTrue(any(issue.severity == Severity.WARNING for issue in result.issues))

    def test_validate_file_not_exists(self):
        """Test validation of non-existent file"""
        result = self.validator.validate_file("/nonexistent/file.sh")

        self.assertEqual(len(result.issues), 1)
        self.assertEqual(result.issues[0].severity, Severity.CRITICAL)
        self.assertIn("Failed to read file", result.issues[0].message)

    def test_performance_mode(self):
        """Test performance mode optimization"""
        # Create validator with performance mode
        validator = ShellValidator(enable_performance_mode=True)

        # Large script with many comments (should be fast)
        content = "#!/bin/bash\n" + "\n".join([f"# Comment {i}" for i in range(1000)])
        content += "\necho $USER"

        start_time = time.time()
        result = validator.validate_content(content)
        execution_time = (time.time() - start_time) * 1000

        # Should complete within performance target
        self.assertLess(execution_time, 200, "Validation should complete within 200ms")
        self.assertLess(result.lines_checked, result.total_lines,
                       "Performance mode should skip comment lines")

    def test_custom_rule_addition(self):
        """Test adding custom validation rules"""
        class CustomRule(rule_class := type('rule_class', (), {})):
            def __init__(self):
                self.rule_id = "CUSTOM001"
                self.severity = Severity.INFO
                self.category = "custom"

            def check(self, line, line_number, context):
                if "custom_pattern" in line:
                    return [ValidationIssue(
                        rule_id=self.rule_id,
                        severity=self.severity,
                        line_number=line_number,
                        column=0,
                        message="Custom pattern detected",
                        original_code=line.strip(),
                        suggested_fix="Fix custom pattern",
                        fix_explanation="This is a custom rule",
                        rule_category=self.category
                    )]
                return []

        # Add custom rule
        original_rule_count = len(self.validator.rules)
        self.validator.add_rule(CustomRule())
        self.assertEqual(len(self.validator.rules), original_rule_count + 1)

        # Test custom rule detection
        result = self.validator.validate_content("echo custom_pattern")
        custom_issues = [issue for issue in result.issues if issue.rule_id == "CUSTOM001"]
        self.assertEqual(len(custom_issues), 1)

    def test_rule_removal(self):
        """Test removing validation rules"""
        original_rule_count = len(self.validator.rules)

        # Remove a rule
        self.validator.remove_rule("SV001")  # UnquotedVariableRule
        self.assertEqual(len(self.validator.rules), original_rule_count - 1)

        # Verify rule is actually removed
        rule_ids = [rule.rule_id for rule in self.validator.rules]
        self.assertNotIn("SV001", rule_ids)


class TestValidationResult(unittest.TestCase):
    """Test ValidationResult data structure"""

    def test_severity_properties(self):
        """Test severity-based properties"""
        critical_issue = ValidationIssue(
            rule_id="TEST", severity=Severity.CRITICAL, line_number=1, column=0,
            message="Test", original_code="test", suggested_fix="fix",
            fix_explanation="explain", rule_category="test"
        )

        warning_issue = ValidationIssue(
            rule_id="TEST", severity=Severity.WARNING, line_number=2, column=0,
            message="Test", original_code="test", suggested_fix="fix",
            fix_explanation="explain", rule_category="test"
        )

        result = ValidationResult(
            file_path="test.sh",
            issues=[critical_issue, warning_issue],
            execution_time_ms=100.0,
            total_lines=10,
            lines_checked=8
        )

        self.assertTrue(result.has_critical_issues)
        self.assertTrue(result.has_warnings)

        counts = result.issue_count_by_severity
        self.assertEqual(counts[Severity.CRITICAL.value], 1)
        self.assertEqual(counts[Severity.WARNING.value], 1)
        self.assertEqual(counts[Severity.INFO.value], 0)


class TestReportGeneration(unittest.TestCase):
    """Test report generation functionality"""

    def setUp(self):
        self.validator = ShellValidator()

        # Create test result
        self.test_result = ValidationResult(
            file_path="test.sh",
            issues=[
                ValidationIssue(
                    rule_id="SV001", severity=Severity.WARNING, line_number=1, column=0,
                    message="Test issue", original_code="echo $var",
                    suggested_fix='echo "$var"', fix_explanation="Quote variable",
                    rule_category="quoting"
                )
            ],
            execution_time_ms=50.0,
            total_lines=5,
            lines_checked=3
        )

    def test_json_report_generation(self):
        """Test JSON report generation"""
        report = self.validator.generate_report([self.test_result], "json")

        # Parse and validate JSON
        report_data = json.loads(report)

        self.assertIn("metadata", report_data)
        self.assertIn("summary", report_data)
        self.assertIn("results", report_data)

        # Check structure
        self.assertEqual(len(report_data["results"]), 1)
        self.assertEqual(report_data["results"][0]["file_path"], "test.sh")
        self.assertEqual(len(report_data["results"][0]["issues"]), 1)

    def test_html_report_generation(self):
        """Test HTML report generation"""
        report = self.validator.generate_report([self.test_result], "html")

        # Check HTML structure
        self.assertIn("<!DOCTYPE html>", report)
        self.assertIn("<title>", report)
        self.assertIn("test.sh", report)
        self.assertIn("SV001", report)

    def test_text_report_generation(self):
        """Test text report generation"""
        report = self.validator.generate_report([self.test_result], "text")

        # Check text content
        self.assertIn("Shell Script Validation Report", report)
        self.assertIn("test.sh", report)
        self.assertIn("SV001", report)
        self.assertIn("Quote variable", report)


class TestGitHooksIntegration(unittest.TestCase):
    """Test Git hooks integration"""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.project_root = Path(self.temp_dir.name)

        # Create a mock Git repository structure
        self.git_dir = self.project_root / ".git"
        self.hooks_dir = self.git_dir / "hooks"
        self.git_dir.mkdir()
        self.hooks_dir.mkdir()

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_git_hook_installer(self):
        """Test Git hook installation"""
        installer = GitHookInstaller(str(self.project_root))

        # Test repository detection
        self.assertTrue(installer.is_git_repository())

        # Test pre-commit hook installation
        success = installer.install_pre_commit_hook()
        self.assertTrue(success)

        # Check hook file exists and is executable
        hook_file = self.hooks_dir / "pre-commit"
        self.assertTrue(hook_file.exists())
        self.assertTrue(os.access(hook_file, os.X_OK))

        # Check hook content
        content = hook_file.read_text()
        self.assertIn("Shell Script Validation", content)

    def test_git_hook_backup(self):
        """Test backing up existing hooks"""
        installer = GitHookInstaller(str(self.project_root))

        # Create existing hook
        existing_hook = self.hooks_dir / "pre-commit"
        existing_hook.write_text("#!/bin/bash\necho 'existing hook'")
        existing_hook.chmod(0o755)

        # Install new hook
        installer.install_pre_commit_hook()

        # Check backup was created
        backup_file = self.hooks_dir / "pre-commit.backup"
        self.assertTrue(backup_file.exists())
        self.assertIn("existing hook", backup_file.read_text())

    def test_git_hook_uninstall(self):
        """Test Git hook uninstallation"""
        installer = GitHookInstaller(str(self.project_root))

        # Install hooks
        installer.install_pre_commit_hook()
        installer.install_pre_push_hook()

        # Verify installation
        self.assertTrue((self.hooks_dir / "pre-commit").exists())
        self.assertTrue((self.hooks_dir / "pre-push").exists())

        # Uninstall
        installer.uninstall_hooks()

        # Verify removal
        self.assertFalse((self.hooks_dir / "pre-commit").exists())
        self.assertFalse((self.hooks_dir / "pre-push").exists())

    @patch('subprocess.run')
    def test_staged_files_detection(self, mock_run):
        """Test detection of staged shell script files"""
        # Mock git diff output
        mock_run.return_value.stdout = "script1.sh\nscript2.py\nscript3.bash\n"
        mock_run.return_value.returncode = 0

        config = GitHookConfig()
        hook_validator = GitHookValidator(config)

        with patch.object(hook_validator, '_is_shell_script') as mock_is_shell:
            mock_is_shell.side_effect = lambda f: f.endswith(('.sh', '.bash'))

            staged_files = hook_validator.get_staged_shell_files()

            self.assertIn("script1.sh", staged_files)
            self.assertIn("script3.bash", staged_files)
            self.assertNotIn("script2.py", staged_files)


class TestPerformanceBenchmarks(unittest.TestCase):
    """Test performance characteristics"""

    def test_large_file_performance(self):
        """Test validation performance on large files"""
        validator = ShellValidator(enable_performance_mode=True)

        # Create large script content
        lines = ["#!/bin/bash", "set -e"]
        lines.extend([f"# Comment line {i}" for i in range(500)])
        lines.extend([f"echo $var{i}" for i in range(100)])  # Issues to detect

        content = "\n".join(lines)

        start_time = time.time()
        result = validator.validate_content(content)
        execution_time = (time.time() - start_time) * 1000

        # Performance requirements
        self.assertLess(execution_time, 200, "Large file validation should complete in <200ms")
        self.assertGreater(len(result.issues), 0, "Should detect issues in large file")

    def test_multiple_files_performance(self):
        """Test performance when validating multiple files"""
        validator = ShellValidator(enable_performance_mode=True)

        # Create multiple test scripts
        scripts = []
        for i in range(10):
            content = f"""#!/bin/bash
echo $user_{i}
if [ $home_{i} == "/tmp" ]; then
    echo "Test {i}"
fi
"""
            scripts.append(content)

        start_time = time.time()
        results = [validator.validate_content(script, f"script{i}.sh")
                  for i, script in enumerate(scripts)]
        total_time = (time.time() - start_time) * 1000

        # Should average less than 200ms per file
        avg_time = total_time / len(scripts)
        self.assertLess(avg_time, 200, f"Average time per file: {avg_time:.1f}ms")

        # All scripts should have issues detected
        for result in results:
            self.assertGreater(len(result.issues), 0)


class TestRealWorldScripts(unittest.TestCase):
    """Test validation against real-world shell scripts"""

    def setUp(self):
        self.validator = ShellValidator()

    def test_setup_script_validation(self):
        """Test validation of a typical setup script"""
        setup_script = """#!/bin/bash
set -e

# Configuration
PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CONFIG_FILE=$PROJECT_ROOT/config.json

echo "Setting up project..."

# Check dependencies
if ! command -v node &> /dev/null; then
    echo "Node.js is required"
    exit 1
fi

# Install packages
npm install

# Create directories
mkdir -p logs
mkdir -p temp

echo "Setup complete!"
"""

        result = self.validator.validate_content(setup_script)

        # Should detect some quoting issues
        unquoted_issues = [issue for issue in result.issues
                          if issue.rule_id == "SV001"]
        self.assertGreater(len(unquoted_issues), 0)

        # Should suggest proper quoting
        for issue in unquoted_issues:
            self.assertIn('"', issue.suggested_fix)

    def test_deployment_script_validation(self):
        """Test validation of a deployment script"""
        deploy_script = """#!/bin/bash

# Deployment script
APP_NAME=myapp
VERSION=`git rev-parse HEAD`
DEPLOY_PATH=/opt/$APP_NAME

echo "Deploying $APP_NAME version $VERSION"

# Build application
npm run build

# Copy files
cp -r dist/* $DEPLOY_PATH/

# Restart service
systemctl restart $APP_NAME

echo "Deployment complete"
"""

        result = self.validator.validate_content(deploy_script)

        # Should detect missing set options
        set_option_issues = [issue for issue in result.issues
                           if issue.rule_id == "SV003"]
        self.assertGreater(len(set_option_issues), 0)

        # Should detect backtick usage
        backtick_issues = [issue for issue in result.issues
                         if issue.rule_id == "SV004"]
        self.assertGreater(len(backtick_issues), 0)


if __name__ == "__main__":
    # Set up test environment
    os.environ["PYTHONPATH"] = str(Path(__file__).parent.parent.parent / "src")

    # Run tests with verbose output
    unittest.main(verbosity=2, buffer=True)

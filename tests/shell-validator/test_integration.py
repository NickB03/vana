#!/usr/bin/env python3
"""
Integration Tests for Shell Script Validator

This test suite validates the integration between the shell validator and
the existing hook system, ensuring seamless operation in CI/CD pipelines.
"""

import json
import os

# Add src to path for imports
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "shell-validator"))

from cli import CLIInterface
from git_hooks import GitHookConfig, GitHookInstaller
from shell_validator import ShellValidator


class TestShellValidatorIntegration(unittest.TestCase):
    """Test integration with existing systems"""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.project_root = Path(self.temp_dir.name)

        # Create a mock Git repository structure
        self.git_dir = self.project_root / ".git"
        self.hooks_dir = self.git_dir / "hooks"
        self.git_dir.mkdir()
        self.hooks_dir.mkdir()

        # Create test scripts
        self.test_script_good = self.project_root / "good_script.sh"
        self.test_script_bad = self.project_root / "bad_script.sh"

        self.test_script_good.write_text("""#!/bin/bash
set -euo pipefail

echo "Hello, World!"
echo "User: $USER"
""")

        self.test_script_bad.write_text("""#!/bin/bash

echo $USER
curl https://install.sh | sh
echo "line1" > output.txt
echo "line2" > output.txt
local result=$(date)
""")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_end_to_end_validation_pipeline(self):
        """Test complete validation pipeline"""
        validator = ShellValidator()

        # Test good script
        result_good = validator.validate_file(str(self.test_script_good))
        self.assertFalse(result_good.has_critical_issues)
        self.assertLessEqual(result_good.execution_time_ms, 200)  # Performance requirement

        # Test bad script
        result_bad = validator.validate_file(str(self.test_script_bad))
        self.assertTrue(result_bad.has_critical_issues)
        self.assertGreater(len(result_bad.issues), 0)

        # Verify CodeRabbit patterns are detected
        rule_ids = [issue.rule_id for issue in result_bad.issues]
        self.assertIn("SV007", rule_ids)  # Unsafe curl pipe
        self.assertIn("SV009", rule_ids)  # Multiple redirects
        self.assertIn("SV010", rule_ids)  # Command substitution assignment

    def test_auto_fix_integration(self):
        """Test auto-fix functionality integration"""
        validator = ShellValidator()

        # Test auto-fix on bad script
        original_content = self.test_script_bad.read_text()

        success, fixes_applied, validation_result = validator.auto_fix_file(
            str(self.test_script_bad), backup=True
        )

        self.assertTrue(success)
        self.assertGreater(fixes_applied, 0)

        # Verify backup was created
        backup_path = Path(f"{self.test_script_bad}.shell-validator.backup")
        self.assertTrue(backup_path.exists())
        self.assertEqual(backup_path.read_text(), original_content)

        # Verify fixes were applied
        fixed_content = self.test_script_bad.read_text()
        self.assertNotEqual(fixed_content, original_content)

        # Re-validate to ensure issues were reduced
        new_result = validator.validate_file(str(self.test_script_bad))
        self.assertLessEqual(len(new_result.issues), len(validation_result.issues))

    def test_cli_integration(self):
        """Test CLI interface integration"""
        cli = CLIInterface()

        # Mock command line arguments
        class MockArgs:
            def __init__(self):
                self.command = 'validate'
                self.files = [str(self.test_script_bad)]
                self.directory = None
                self.stdin = False
                self.format = 'json'
                self.output = None
                self.auto_fix = False
                self.verbose = False
                self.performance = True

        args = MockArgs()

        # Test validation through CLI
        try:
            exit_code = cli.run_command(args)
            # Should fail because of critical issues
            self.assertNotEqual(exit_code, 0)
        except SystemExit as e:
            # CLI might call sys.exit
            self.assertNotEqual(e.code, 0)

    def test_report_generation_integration(self):
        """Test report generation integration"""
        validator = ShellValidator()

        results = [
            validator.validate_file(str(self.test_script_good)),
            validator.validate_file(str(self.test_script_bad))
        ]

        # Test JSON report
        json_report = validator.generate_report(results, "json")
        report_data = json.loads(json_report)

        self.assertIn("metadata", report_data)
        self.assertIn("summary", report_data)
        self.assertIn("results", report_data)
        self.assertEqual(len(report_data["results"]), 2)

        # Test HTML report
        html_report = validator.generate_report(results, "html")
        self.assertIn("<!DOCTYPE html>", html_report)
        self.assertIn("Shell Script Validation Report", html_report)

        # Test text report
        text_report = validator.generate_report(results, "text")
        self.assertIn("Shell Script Validation Report", text_report)

    def test_performance_benchmarks(self):
        """Test performance requirements are met"""
        validator = ShellValidator(enable_performance_mode=True)

        # Create larger test script
        large_script = self.project_root / "large_script.sh"
        lines = ["#!/bin/bash", "set -e"]
        lines.extend([f"# Comment line {i}" for i in range(500)])
        lines.extend([f"echo $var{i}" for i in range(50)])  # Issues to detect

        large_script.write_text("\n".join(lines))

        # Test performance
        import time
        start_time = time.time()
        result = validator.validate_file(str(large_script))
        execution_time = (time.time() - start_time) * 1000

        self.assertLess(execution_time, 200, "Validation should complete in <200ms")
        self.assertGreater(len(result.issues), 0, "Should detect issues in large file")
        self.assertLess(result.lines_checked, result.total_lines,
                       "Performance mode should skip lines")

    def test_git_hooks_integration(self):
        """Test Git hooks integration"""
        installer = GitHookInstaller(str(self.project_root))

        # Test repository detection
        self.assertTrue(installer.is_git_repository())

        # Test hook installation
        config = GitHookConfig(fail_on_critical=True, fail_on_warnings=False)
        success = installer.install_pre_commit_hook(config)
        self.assertTrue(success)

        # Verify hook file exists
        hook_file = self.hooks_dir / "pre-commit"
        self.assertTrue(hook_file.exists())
        self.assertTrue(os.access(hook_file, os.X_OK))

        # Test hook uninstallation
        success = installer.uninstall_hooks()
        self.assertTrue(success)

    def test_rule_configuration_integration(self):
        """Test rule configuration and customization"""
        validator = ShellValidator()

        original_rule_count = len(validator.rules)

        # Test rule removal
        validator.remove_rule("SV006")  # Variable naming rule
        self.assertEqual(len(validator.rules), original_rule_count - 1)

        # Test validation with reduced rules
        result = validator.validate_file(str(self.test_script_bad))
        rule_ids = [issue.rule_id for issue in result.issues]
        self.assertNotIn("SV006", rule_ids)

        # Test custom rule addition
        from shell_validator import Severity, ShellValidationRule, ValidationIssue

        class CustomTestRule(ShellValidationRule):
            def __init__(self):
                super().__init__("CUSTOM001", Severity.INFO, "test")

            def check(self, line, line_number, context):
                if "CUSTOM_PATTERN" in line:
                    return [ValidationIssue(
                        rule_id=self.rule_id,
                        severity=self.severity,
                        line_number=line_number,
                        column=0,
                        message="Custom pattern detected",
                        original_code=line.strip(),
                        suggested_fix="Fix custom pattern",
                        fix_explanation="This is a test rule",
                        rule_category=self.category
                    )]
                return []

        validator.add_rule(CustomTestRule())
        self.assertEqual(len(validator.rules), original_rule_count)

        # Test custom rule detection
        test_script = self.project_root / "custom_test.sh"
        test_script.write_text("#!/bin/bash\necho CUSTOM_PATTERN")

        result = validator.validate_file(str(test_script))
        custom_issues = [issue for issue in result.issues if issue.rule_id == "CUSTOM001"]
        self.assertEqual(len(custom_issues), 1)

    def test_error_handling_integration(self):
        """Test error handling and recovery"""
        validator = ShellValidator()

        # Test non-existent file
        result = validator.validate_file("/nonexistent/file.sh")
        self.assertEqual(len(result.issues), 1)
        self.assertEqual(result.issues[0].severity.value, "critical")

        # Test invalid content
        invalid_script = self.project_root / "invalid.sh"
        invalid_script.write_bytes(b'\xff\xfe\x00\x00')  # Invalid UTF-8

        result = validator.validate_file(str(invalid_script))
        self.assertEqual(len(result.issues), 1)
        self.assertIn("Failed to read file", result.issues[0].message)

    def test_concurrent_validation(self):
        """Test concurrent validation scenarios"""
        validator = ShellValidator()

        # Create multiple test scripts
        scripts = []
        for i in range(5):
            script = self.project_root / f"script_{i}.sh"
            script.write_text(f"""#!/bin/bash
echo $USER_{i}
curl https://example{i}.com | sh
""")
            scripts.append(str(script))

        # Validate all scripts
        results = []
        for script in scripts:
            result = validator.validate_file(script)
            results.append(result)

        # Verify all scripts were validated
        self.assertEqual(len(results), 5)
        for result in results:
            self.assertGreater(len(result.issues), 0)
            self.assertTrue(result.has_critical_issues)  # curl | sh


class TestCodeRabbitPatternCompatibility(unittest.TestCase):
    """Test compatibility with CodeRabbit patterns"""

    def setUp(self):
        self.validator = ShellValidator()

    def test_sc2086_compatibility(self):
        """Test SC2086 pattern detection compatibility"""
        test_cases = [
            "cp $file1 $file2",
            "[ $var == test ]",
            "for item in $list; do",
            "case $var in",
        ]

        for test_case in test_cases:
            result = self.validator.validate_content(test_case)
            # Should detect unquoted variable issues
            sc2086_issues = [issue for issue in result.issues
                           if "SC2086" in issue.message or issue.rule_id in ["SV001", "SV008"]]
            self.assertGreater(len(sc2086_issues), 0, f"Failed to detect SC2086 in: {test_case}")

    def test_sc2129_compatibility(self):
        """Test SC2129 pattern detection compatibility"""
        script_content = """#!/bin/bash
echo "line1" > output.txt
echo "line2" > output.txt
"""
        result = self.validator.validate_content(script_content)
        sc2129_issues = [issue for issue in result.issues
                        if "SC2129" in issue.message or issue.rule_id == "SV009"]
        self.assertGreater(len(sc2129_issues), 0)

    def test_sc2155_compatibility(self):
        """Test SC2155 pattern detection compatibility"""
        test_cases = [
            "local var=$(command)",
            "declare result=$(date)",
            "readonly version=$(git rev-parse HEAD)",
        ]

        for test_case in test_cases:
            result = self.validator.validate_content(test_case)
            sc2155_issues = [issue for issue in result.issues
                           if "SC2155" in issue.message or issue.rule_id == "SV010"]
            self.assertGreater(len(sc2155_issues), 0, f"Failed to detect SC2155 in: {test_case}")

    def test_curl_pipe_detection(self):
        """Test dangerous curl | sh pattern detection"""
        dangerous_patterns = [
            "curl https://install.sh | sh",
            "curl -sL https://get.docker.com | bash",
            "wget -O- https://install.sh | sh",
        ]

        for pattern in dangerous_patterns:
            result = self.validator.validate_content(pattern)
            curl_issues = [issue for issue in result.issues if issue.rule_id == "SV007"]
            self.assertGreater(len(curl_issues), 0, f"Failed to detect curl pipe in: {pattern}")
            self.assertEqual(curl_issues[0].severity.value, "critical")


if __name__ == "__main__":
    # Set up test environment
    os.environ["PYTHONPATH"] = str(Path(__file__).parent.parent.parent / "src")

    # Run integration tests
    unittest.main(verbosity=2, buffer=True)

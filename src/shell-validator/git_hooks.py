#!/usr/bin/env python3
"""
Git Hooks Integration for Shell Script Validator

This module provides seamless integration with Git hooks, enabling automatic
shell script validation during the development workflow.

Features:
- Pre-commit hook integration
- Pre-push validation
- Staged file detection
- Automatic installation/configuration
- Performance optimized for CI/CD pipelines
"""

import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from shell_validator import Severity, ShellValidator, ValidationResult


@dataclass
class GitHookConfig:
    """Configuration for Git hook integration"""

    hook_type: str = "pre-commit"
    fail_on_critical: bool = True
    fail_on_warnings: bool = False
    exclude_patterns: list[str] = None
    max_execution_time_ms: float = 10000  # 10 seconds total
    generate_report: bool = True
    report_path: str = ".git/shell-validation-report.json"

    def __post_init__(self):
        if self.exclude_patterns is None:
            self.exclude_patterns = [
                "node_modules/**",
                ".git/**",
                "vendor/**",
                "build/**",
                "dist/**",
            ]


class GitHookValidator:
    """Git hook integration for shell script validation"""

    def __init__(self, config: GitHookConfig = None):
        self.config = config or GitHookConfig()
        self.validator = ShellValidator(enable_performance_mode=True)

    def get_staged_shell_files(self) -> list[str]:
        """Get list of staged shell script files"""
        try:
            # Get staged files
            result = subprocess.run(
                ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
                capture_output=True,
                text=True,
                check=True,
            )

            staged_files = (
                result.stdout.strip().split("\n") if result.stdout.strip() else []
            )

            # Filter for shell scripts
            shell_files = []
            for file_path in staged_files:
                if self._is_shell_script(file_path):
                    shell_files.append(file_path)

            return shell_files

        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to get staged files: {e}")
            return []

    def _is_shell_script(self, file_path: str) -> bool:
        """Check if a file is a shell script"""
        path = Path(file_path)

        # Check file extension
        if path.suffix in [".sh", ".bash", ".zsh"]:
            return True

        # Check shebang for files without extension
        try:
            if path.exists() and path.is_file():
                with open(path, encoding="utf-8") as f:
                    first_line = f.readline().strip()
                    if first_line.startswith("#!") and any(
                        shell in first_line for shell in ["bash", "sh", "zsh"]
                    ):
                        return True
        except (UnicodeDecodeError, PermissionError):
            pass

        return False

    def _should_exclude_file(self, file_path: str) -> bool:
        """Check if file should be excluded from validation"""
        import fnmatch

        for pattern in self.config.exclude_patterns:
            if fnmatch.fnmatch(file_path, pattern):
                return True
        return False

    def validate_staged_files(self) -> tuple[list[ValidationResult], bool]:
        """Validate staged shell script files"""
        staged_files = self.get_staged_shell_files()

        if not staged_files:
            print("ℹ️  No staged shell script files found.")
            return [], True

        print(f"🔍 Validating {len(staged_files)} staged shell script(s)...")

        results = []
        should_pass = True

        for file_path in staged_files:
            if self._should_exclude_file(file_path):
                continue

            # Skip if file doesn't exist (deleted)
            if not Path(file_path).exists():
                continue

            result = self.validator.validate_file(file_path)
            results.append(result)

            # Check if this file should cause hook failure
            if result.has_critical_issues and self.config.fail_on_critical:
                should_pass = False
            if result.has_warnings and self.config.fail_on_warnings:
                should_pass = False

        return results, should_pass

    def run_pre_commit_hook(self) -> int:
        """Run pre-commit validation hook"""
        print("🔗 Running shell script validation pre-commit hook...")

        results, should_pass = self.validate_staged_files()

        if not results:
            return 0

        # Generate summary
        total_issues = sum(len(result.issues) for result in results)
        critical_issues = sum(
            len([i for i in result.issues if i.severity == Severity.CRITICAL])
            for result in results
        )
        warning_issues = sum(
            len([i for i in result.issues if i.severity == Severity.WARNING])
            for result in results
        )

        print("📊 Validation Summary:")
        print(f"   Files checked: {len(results)}")
        print(f"   Total issues: {total_issues}")
        print(f"   Critical issues: {critical_issues}")
        print(f"   Warning issues: {warning_issues}")

        # Display issues with enhanced formatting
        for result in results:
            if result.issues:
                print(f"\n📄 {result.file_path} ({result.execution_time_ms:.1f}ms):")

                # Group issues by severity for better readability
                critical_issues = [
                    i for i in result.issues if i.severity == Severity.CRITICAL
                ]
                warning_issues = [
                    i for i in result.issues if i.severity == Severity.WARNING
                ]
                info_issues = [i for i in result.issues if i.severity == Severity.INFO]

                if critical_issues:
                    print("   🚨 CRITICAL ISSUES:")
                    for issue in critical_issues:
                        print(f"      Line {issue.line_number}: {issue.message}")
                        print(f"      Code: {issue.original_code}")
                        print(f"      Fix:  {issue.suggested_fix}")
                        print()

                if warning_issues:
                    print("   ⚠️  WARNING ISSUES:")
                    for issue in warning_issues:
                        print(f"      Line {issue.line_number}: {issue.message}")
                        if issue.rule_id.startswith("SC"):
                            print(f"      Rule: {issue.rule_id}")
                        print(f"      Fix:  {issue.suggested_fix}")
                        print()

                if info_issues:
                    print("   ℹ️  INFO ISSUES:")
                    for issue in info_issues:
                        print(f"      Line {issue.line_number}: {issue.message}")
                        print(f"      Fix:  {issue.suggested_fix}")
                        print()

        # Generate report if configured
        if self.config.generate_report:
            report = self.validator.generate_report(results, "json")
            os.makedirs(os.path.dirname(self.config.report_path), exist_ok=True)
            with open(self.config.report_path, "w") as f:
                f.write(report)
            print(f"\n📄 Detailed report saved to: {self.config.report_path}")

        if should_pass:
            print("\n✅ Shell script validation passed!")
            if total_issues > 0:
                print(
                    f"   📊 Found {total_issues} non-critical issues that can be addressed later."
                )
            return 0
        else:
            print("\n❌ Shell script validation failed!")
            print("💡 Fix the issues above and try committing again.")
            if critical_issues:
                print("🚨 Critical issues MUST be resolved before committing.")
                print("   These pose security risks or could break functionality.")
            if warning_issues and self.config.fail_on_warnings:
                print("⚠️  Warning issues are configured to block commits.")
                print("   Review and fix these issues or adjust validation settings.")

            # Provide helpful tips
            print("\n🔧 Quick fixes:")
            print('   • Quote variables: echo "$var" instead of echo $var')
            print("   • Use $() instead of backticks: $(command) instead of `command`")
            print("   • Add set options: set -euo pipefail at script start")
            print(
                '   • Use >> for append: echo "text" >> file instead of > for subsequent writes'
            )

            return 1

    def run_pre_push_hook(self) -> int:
        """Run pre-push validation hook"""
        print("🔗 Running shell script validation pre-push hook...")

        # For pre-push, validate all shell scripts in the repository
        try:
            # Get all tracked files
            result = subprocess.run(
                ["git", "ls-files"], capture_output=True, text=True, check=True
            )

            all_files = (
                result.stdout.strip().split("\n") if result.stdout.strip() else []
            )
            shell_files = [
                f
                for f in all_files
                if self._is_shell_script(f) and not self._should_exclude_file(f)
            ]

            if not shell_files:
                print("ℹ️  No shell script files found in repository.")
                return 0

            print(f"🔍 Validating {len(shell_files)} shell script(s) in repository...")

            results = []
            for file_path in shell_files:
                if Path(file_path).exists():
                    result = self.validator.validate_file(file_path)
                    results.append(result)

            # Generate summary
            total_issues = sum(len(result.issues) for result in results)
            critical_issues = sum(
                len([i for i in result.issues if i.severity == Severity.CRITICAL])
                for result in results
            )

            print("📊 Repository Validation Summary:")
            print(f"   Files checked: {len(results)}")
            print(f"   Total issues: {total_issues}")
            print(f"   Critical issues: {critical_issues}")

            # Only fail on critical issues for pre-push
            if critical_issues > 0 and self.config.fail_on_critical:
                print("\n❌ Critical issues found in repository!")
                print("🚨 Please fix critical issues before pushing.")
                return 1
            else:
                print("\n✅ Repository shell script validation passed!")
                return 0

        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to get repository files: {e}")
            return 1


class GitHookInstaller:
    """Utility for installing Git hooks"""

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.git_dir = self.project_root / ".git"
        self.hooks_dir = self.git_dir / "hooks"

    def is_git_repository(self) -> bool:
        """Check if current directory is a Git repository"""
        return self.git_dir.exists() and self.git_dir.is_dir()

    def install_pre_commit_hook(self, config: GitHookConfig = None) -> bool:
        """Install pre-commit hook for shell script validation"""
        if not self.is_git_repository():
            print("❌ Not a Git repository")
            return False

        hook_file = self.hooks_dir / "pre-commit"
        config = config or GitHookConfig()

        # Create hooks directory if it doesn't exist
        self.hooks_dir.mkdir(exist_ok=True)

        # Generate hook script
        hook_script = self._generate_pre_commit_script(config)

        # Handle existing hook
        if hook_file.exists():
            # Backup existing hook
            backup_file = hook_file.with_suffix(".backup")
            hook_file.rename(backup_file)
            print(f"📋 Existing pre-commit hook backed up to {backup_file.name}")

        # Write new hook
        hook_file.write_text(hook_script)
        hook_file.chmod(0o755)  # Make executable

        print(f"✅ Pre-commit hook installed: {hook_file}")
        return True

    def install_pre_push_hook(self, config: GitHookConfig = None) -> bool:
        """Install pre-push hook for shell script validation"""
        if not self.is_git_repository():
            print("❌ Not a Git repository")
            return False

        hook_file = self.hooks_dir / "pre-push"
        config = config or GitHookConfig(hook_type="pre-push")

        self.hooks_dir.mkdir(exist_ok=True)

        hook_script = self._generate_pre_push_script(config)

        if hook_file.exists():
            backup_file = hook_file.with_suffix(".backup")
            hook_file.rename(backup_file)
            print(f"📋 Existing pre-push hook backed up to {backup_file.name}")

        hook_file.write_text(hook_script)
        hook_file.chmod(0o755)

        print(f"✅ Pre-push hook installed: {hook_file}")
        return True

    def _generate_pre_commit_script(self, config: GitHookConfig) -> str:
        """Generate pre-commit hook script"""
        validator_path = Path(__file__).parent / "shell_validator.py"
        git_hooks_path = Path(__file__)

        return f"""#!/bin/bash
# Shell Script Validation Pre-Commit Hook
# Generated by Shell Validator

set -e

# Configuration
FAIL_ON_CRITICAL={str(config.fail_on_critical).lower()}
FAIL_ON_WARNINGS={str(config.fail_on_warnings).lower()}
GENERATE_REPORT={str(config.generate_report).lower()}
REPORT_PATH="{config.report_path}"

# Run shell script validation
python3 "{git_hooks_path}" --hook-type pre-commit \\
    --fail-on-critical "$FAIL_ON_CRITICAL" \\
    --fail-on-warnings "$FAIL_ON_WARNINGS" \\
    --generate-report "$GENERATE_REPORT" \\
    --report-path "$REPORT_PATH"

exit $?
"""

    def _generate_pre_push_script(self, config: GitHookConfig) -> str:
        """Generate pre-push hook script"""
        git_hooks_path = Path(__file__)

        return f"""#!/bin/bash
# Shell Script Validation Pre-Push Hook
# Generated by Shell Validator

set -e

# Configuration
FAIL_ON_CRITICAL={str(config.fail_on_critical).lower()}
GENERATE_REPORT={str(config.generate_report).lower()}
REPORT_PATH="{config.report_path}"

# Run shell script validation for entire repository
python3 "{git_hooks_path}" --hook-type pre-push \\
    --fail-on-critical "$FAIL_ON_CRITICAL" \\
    --generate-report "$GENERATE_REPORT" \\
    --report-path "$REPORT_PATH"

exit $?
"""

    def uninstall_hooks(self) -> bool:
        """Remove installed validation hooks"""
        if not self.is_git_repository():
            print("❌ Not a Git repository")
            return False

        hooks_to_remove = ["pre-commit", "pre-push"]
        removed_count = 0

        for hook_name in hooks_to_remove:
            hook_file = self.hooks_dir / hook_name
            backup_file = self.hooks_dir / f"{hook_name}.backup"

            if hook_file.exists():
                # Check if it's our hook by looking for signature
                content = hook_file.read_text()
                if "Shell Script Validation" in content:
                    hook_file.unlink()
                    removed_count += 1
                    print(f"🗑️  Removed {hook_name} hook")

                    # Restore backup if exists
                    if backup_file.exists():
                        backup_file.rename(hook_file)
                        print(f"📋 Restored {hook_name} backup")

        if removed_count > 0:
            print(f"✅ Removed {removed_count} validation hook(s)")
        else:
            print("ℹ️  No validation hooks found to remove")

        return True


def main():
    """Command-line interface for Git hooks integration"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Git Hooks Integration for Shell Script Validator"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Install command
    install_parser = subparsers.add_parser("install", help="Install Git hooks")
    install_parser.add_argument(
        "--hook-type",
        choices=["pre-commit", "pre-push", "both"],
        default="pre-commit",
        help="Type of hook to install",
    )
    install_parser.add_argument(
        "--fail-on-critical",
        action="store_true",
        default=True,
        help="Fail on critical issues",
    )
    install_parser.add_argument(
        "--fail-on-warnings", action="store_true", help="Fail on warning issues"
    )
    install_parser.add_argument(
        "--project-root", default=".", help="Project root directory"
    )

    # Uninstall command
    uninstall_parser = subparsers.add_parser("uninstall", help="Uninstall Git hooks")
    uninstall_parser.add_argument(
        "--project-root", default=".", help="Project root directory"
    )

    # Hook execution commands (called by Git)
    hook_parser = subparsers.add_parser(
        "run-hook", help="Run validation hook (internal)"
    )
    hook_parser.add_argument(
        "--hook-type",
        choices=["pre-commit", "pre-push"],
        required=True,
        help="Type of hook to run",
    )
    hook_parser.add_argument("--fail-on-critical", type=bool, default=True)
    hook_parser.add_argument("--fail-on-warnings", type=bool, default=False)
    hook_parser.add_argument("--generate-report", type=bool, default=True)
    hook_parser.add_argument(
        "--report-path", default=".git/shell-validation-report.json"
    )

    args = parser.parse_args()

    if args.command == "install":
        installer = GitHookInstaller(args.project_root)
        config = GitHookConfig(
            fail_on_critical=args.fail_on_critical,
            fail_on_warnings=args.fail_on_warnings,
        )

        if args.hook_type in ["pre-commit", "both"]:
            installer.install_pre_commit_hook(config)

        if args.hook_type in ["pre-push", "both"]:
            config.hook_type = "pre-push"
            installer.install_pre_push_hook(config)

    elif args.command == "uninstall":
        installer = GitHookInstaller(args.project_root)
        installer.uninstall_hooks()

    elif args.command == "run-hook":
        config = GitHookConfig(
            hook_type=args.hook_type,
            fail_on_critical=args.fail_on_critical,
            fail_on_warnings=args.fail_on_warnings,
            generate_report=args.generate_report,
            report_path=args.report_path,
        )

        hook_validator = GitHookValidator(config)

        if args.hook_type == "pre-commit":
            return hook_validator.run_pre_commit_hook()
        elif args.hook_type == "pre-push":
            return hook_validator.run_pre_push_hook()

    else:
        parser.print_help()

    return 0


if __name__ == "__main__":
    sys.exit(main())

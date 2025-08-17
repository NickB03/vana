#!/usr/bin/env python3
"""
Command Line Interface for Shell Script Validator

Provides a comprehensive CLI for shell script validation with support for
multiple output formats, batch processing, and integration with development workflows.
"""

import argparse
import json
import logging
import sys
from pathlib import Path

from git_hooks import GitHookConfig, GitHookInstaller, GitHookValidator
from shell_validator import Severity, ShellValidator, ValidationResult


class ColorFormatter:
    """ANSI color formatting for terminal output"""

    # Color codes
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    PURPLE = "\033[95m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    END = "\033[0m"

    @classmethod
    def colorize(cls, text: str, color: str) -> str:
        """Apply color to text if stdout is a TTY"""
        if sys.stdout.isatty():
            return f"{color}{text}{cls.END}"
        return text

    @classmethod
    def critical(cls, text: str) -> str:
        return cls.colorize(text, cls.RED + cls.BOLD)

    @classmethod
    def warning(cls, text: str) -> str:
        return cls.colorize(text, cls.YELLOW)

    @classmethod
    def info(cls, text: str) -> str:
        return cls.colorize(text, cls.BLUE)

    @classmethod
    def success(cls, text: str) -> str:
        return cls.colorize(text, cls.GREEN)

    @classmethod
    def header(cls, text: str) -> str:
        return cls.colorize(text, cls.CYAN + cls.BOLD)


class CLIInterface:
    """Main CLI interface for shell script validator"""

    def __init__(self):
        self.validator = None
        self.config = self._load_config()
        self.stats = {
            "files_processed": 0,
            "total_issues": 0,
            "critical_issues": 0,
            "warning_issues": 0,
            "info_issues": 0,
        }

    def _load_config(self) -> dict:
        """Load configuration from file or use defaults"""
        config_paths = [
            Path.cwd() / ".shell-validator.json",
            Path.home() / ".shell-validator.json",
            Path(__file__).parent / "config.json",
        ]

        for config_path in config_paths:
            if config_path.exists():
                try:
                    with open(config_path) as f:
                        return json.load(f)
                except (OSError, json.JSONDecodeError) as e:
                    logging.warning(f"Failed to load config from {config_path}: {e}")

        # Default configuration
        return {
            "rules": {
                "enabled": ["SV001", "SV002", "SV003", "SV004", "SV005", "SV006"],
                "disabled": [],
            },
            "severity_levels": {
                "fail_on_critical": True,
                "fail_on_warnings": False,
                "show_info": True,
            },
            "performance": {
                "enable_performance_mode": True,
                "max_execution_time_ms": 200,
            },
            "output": {
                "default_format": "text",
                "show_suggestions": True,
                "show_explanations": True,
                "group_by_severity": True,
            },
            "git_integration": {
                "auto_install_hooks": False,
                "hook_types": ["pre-commit"],
                "fail_on_critical": True,
                "fail_on_warnings": False,
            },
        }

    def setup_validator(self, args) -> ShellValidator:
        """Set up validator with configuration"""
        enable_performance = getattr(
            args, "performance", self.config["performance"]["enable_performance_mode"]
        )

        validator = ShellValidator(enable_performance_mode=enable_performance)

        # Apply rule filtering
        if hasattr(args, "exclude_rules") and args.exclude_rules:
            for rule_id in args.exclude_rules:
                validator.remove_rule(rule_id)

        if hasattr(args, "only_rules") and args.only_rules:
            validator.rules = [
                rule for rule in validator.rules if rule.rule_id in args.only_rules
            ]

        return validator

    def validate_files(self, file_paths: list[str], args) -> list[ValidationResult]:
        """Validate multiple files"""
        results = []

        for file_path in file_paths:
            if not Path(file_path).exists():
                print(ColorFormatter.critical(f"❌ File not found: {file_path}"))
                continue

            if args.verbose:
                print(f"🔍 Validating {file_path}...")

            result = self.validator.validate_file(file_path)
            results.append(result)

            # Update statistics
            self.stats["files_processed"] += 1
            self.stats["total_issues"] += len(result.issues)
            self.stats["critical_issues"] += len(
                [i for i in result.issues if i.severity == Severity.CRITICAL]
            )
            self.stats["warning_issues"] += len(
                [i for i in result.issues if i.severity == Severity.WARNING]
            )
            self.stats["info_issues"] += len(
                [i for i in result.issues if i.severity == Severity.INFO]
            )

        return results

    def validate_directory(self, directory: str, args) -> list[ValidationResult]:
        """Validate all shell scripts in a directory"""
        patterns = getattr(args, "patterns", ["*.sh", "*.bash", "*.zsh"])
        exclude_patterns = getattr(args, "exclude", [])

        if args.verbose:
            print(f"🔍 Scanning directory: {directory}")
            print(f"   Patterns: {', '.join(patterns)}")
            if exclude_patterns:
                print(f"   Excluding: {', '.join(exclude_patterns)}")

        # Find files
        directory_path = Path(directory)
        files_to_validate = []

        for pattern in patterns:
            for file_path in directory_path.rglob(pattern):
                if file_path.is_file():
                    # Check exclude patterns
                    should_exclude = False
                    for exclude_pattern in exclude_patterns:
                        if exclude_pattern in str(file_path):
                            should_exclude = True
                            break

                    if not should_exclude:
                        files_to_validate.append(str(file_path))

        if args.verbose:
            print(f"📋 Found {len(files_to_validate)} shell script(s)")

        return self.validate_files(files_to_validate, args)

    def validate_stdin(self, args) -> list[ValidationResult]:
        """Validate script content from stdin"""
        if args.verbose:
            print("🔍 Reading script from stdin...")

        content = sys.stdin.read()
        result = self.validator.validate_content(content, "stdin")

        self.stats["files_processed"] = 1
        self.stats["total_issues"] = len(result.issues)
        self.stats["critical_issues"] = len(
            [i for i in result.issues if i.severity == Severity.CRITICAL]
        )
        self.stats["warning_issues"] = len(
            [i for i in result.issues if i.severity == Severity.WARNING]
        )
        self.stats["info_issues"] = len(
            [i for i in result.issues if i.severity == Severity.INFO]
        )

        return [result]

    def display_results(self, results: list[ValidationResult], args):
        """Display validation results in specified format"""
        if args.format == "json":
            print(self.validator.generate_report(results, "json"))
        elif args.format == "html":
            html_report = self.validator.generate_report(results, "html")
            if args.output:
                with open(args.output, "w") as f:
                    f.write(html_report)
                print(f"📄 HTML report saved to: {args.output}")
            else:
                print(html_report)
        else:
            self._display_text_results(results, args)

    def _display_text_results(self, results: list[ValidationResult], args):
        """Display results in human-readable text format"""
        if not results:
            print(ColorFormatter.info("ℹ️  No files to validate"))
            return

        # Header
        print(ColorFormatter.header("🔍 Shell Script Validation Results"))
        print(ColorFormatter.header("=" * 50))
        print()

        # Summary statistics
        print(ColorFormatter.header("📊 Summary"))
        print(f"   Files processed: {self.stats['files_processed']}")
        print(f"   Total issues: {self.stats['total_issues']}")

        if self.stats["critical_issues"] > 0:
            print(
                f"   Critical issues: {ColorFormatter.critical(str(self.stats['critical_issues']))}"
            )
        else:
            print(f"   Critical issues: {self.stats['critical_issues']}")

        if self.stats["warning_issues"] > 0:
            print(
                f"   Warning issues: {ColorFormatter.warning(str(self.stats['warning_issues']))}"
            )
        else:
            print(f"   Warning issues: {self.stats['warning_issues']}")

        if self.stats["info_issues"] > 0:
            print(
                f"   Info issues: {ColorFormatter.info(str(self.stats['info_issues']))}"
            )
        else:
            print(f"   Info issues: {self.stats['info_issues']}")

        print()

        # Group results by severity if configured
        if self.config["output"]["group_by_severity"]:
            self._display_grouped_results(results, args)
        else:
            self._display_file_by_file_results(results, args)

        # Performance summary
        if args.verbose:
            total_time = sum(r.execution_time_ms for r in results)
            avg_time = total_time / len(results) if results else 0
            print(ColorFormatter.header("\n⚡ Performance"))
            print(f"   Total validation time: {total_time:.1f}ms")
            print(f"   Average time per file: {avg_time:.1f}ms")

    def _display_grouped_results(self, results: list[ValidationResult], args):
        """Display results grouped by severity"""
        all_issues = []
        for result in results:
            for issue in result.issues:
                all_issues.append((result.file_path, issue))

        # Group by severity
        critical_issues = [
            (f, i) for f, i in all_issues if i.severity == Severity.CRITICAL
        ]
        warning_issues = [
            (f, i) for f, i in all_issues if i.severity == Severity.WARNING
        ]
        info_issues = [(f, i) for f, i in all_issues if i.severity == Severity.INFO]

        # Display critical issues
        if critical_issues:
            print(ColorFormatter.critical("🚨 CRITICAL ISSUES"))
            print(ColorFormatter.critical("-" * 20))
            for file_path, issue in critical_issues:
                self._display_issue(file_path, issue, args)
            print()

        # Display warning issues
        if warning_issues:
            print(ColorFormatter.warning("⚠️  WARNING ISSUES"))
            print(ColorFormatter.warning("-" * 20))
            for file_path, issue in warning_issues:
                self._display_issue(file_path, issue, args)
            print()

        # Display info issues if configured
        if info_issues and self.config["severity_levels"]["show_info"]:
            print(ColorFormatter.info("ℹ️  INFORMATIONAL ISSUES"))
            print(ColorFormatter.info("-" * 25))
            for file_path, issue in info_issues:
                self._display_issue(file_path, issue, args)
            print()

    def _display_file_by_file_results(self, results: list[ValidationResult], args):
        """Display results file by file"""
        for result in results:
            if not result.issues:
                if args.verbose:
                    print(f"✅ {result.file_path}: No issues found")
                continue

            print(ColorFormatter.header(f"📄 {result.file_path}"))
            print(f"   Execution time: {result.execution_time_ms:.1f}ms")
            print(f"   Lines checked: {result.lines_checked}/{result.total_lines}")
            print(f"   Issues found: {len(result.issues)}")
            print()

            for issue in result.issues:
                self._display_issue(result.file_path, issue, args)

            print()

    def _display_issue(self, file_path: str, issue, args):
        """Display a single validation issue"""
        # Severity icon and color
        if issue.severity == Severity.CRITICAL:
            icon = "🚨"
            color_func = ColorFormatter.critical
        elif issue.severity == Severity.WARNING:
            icon = "⚠️"
            color_func = ColorFormatter.warning
        else:
            icon = "ℹ️"
            color_func = ColorFormatter.info

        # Issue header
        print(f"   {icon} {color_func(f'{issue.rule_id}')}: {issue.message}")
        print(f"      📍 {file_path}:{issue.line_number}:{issue.column}")
        print(f"      📝 {issue.original_code}")

        # Show suggestions if configured
        if self.config["output"]["show_suggestions"]:
            print(f"      💡 Suggested fix: {issue.suggested_fix}")

        # Show explanations if configured
        if self.config["output"]["show_explanations"]:
            print(f"      📖 {issue.fix_explanation}")

        print()

    def run_command(self, args) -> int:
        """Execute the main command"""
        try:
            self.validator = self.setup_validator(args)

            # Determine what to validate
            if args.command == "validate":
                if args.stdin:
                    results = self.validate_stdin(args)
                elif args.directory:
                    results = self.validate_directory(args.directory, args)
                elif args.files:
                    results = self.validate_files(args.files, args)
                else:
                    print(
                        ColorFormatter.critical(
                            "❌ No input specified. Use --files, --directory, or --stdin"
                        )
                    )
                    return 1

                # Apply auto-fixes if requested
                if hasattr(args, "auto_fix") and args.auto_fix:
                    self._apply_auto_fixes(results, args)

                # Display results
                self.display_results(results, args)

                # Determine exit code
                if any(result.has_critical_issues for result in results):
                    if self.config["severity_levels"]["fail_on_critical"]:
                        return 1

                if any(result.has_warnings for result in results):
                    if self.config["severity_levels"]["fail_on_warnings"]:
                        return 1

                return 0

            elif args.command == "install-hooks":
                return self._install_git_hooks(args)

            elif args.command == "uninstall-hooks":
                return self._uninstall_git_hooks(args)

            elif args.command == "run-hook":
                return self._run_git_hook(args)

            else:
                print(ColorFormatter.critical(f"❌ Unknown command: {args.command}"))
                return 1

        except KeyboardInterrupt:
            print(ColorFormatter.warning("\n⚠️  Validation interrupted by user"))
            return 130
        except Exception as e:
            print(ColorFormatter.critical(f"❌ Validation failed: {e!s}"))
            if args.verbose:
                import traceback

                traceback.print_exc()
            return 1

    def _apply_auto_fixes(self, results: list[ValidationResult], args):
        """Apply automatic fixes to files"""

        total_fixes = 0
        files_fixed = 0

        print(ColorFormatter.header("\n🔧 Applying Automatic Fixes"))
        print(ColorFormatter.header("-" * 30))

        for result in results:
            if result.file_path == "stdin":
                # Can't auto-fix stdin input
                continue

            # Check if there are any auto-fixable issues
            auto_fixable = [
                issue
                for issue in result.issues
                if self.validator.auto_fixer.can_auto_fix(issue)
            ]

            if not auto_fixable:
                continue

            print(f"🔧 Fixing {result.file_path}...")

            # Apply fixes
            backup = not (hasattr(args, "no_backup") and args.no_backup)
            success, fixes_applied, _ = self.validator.auto_fix_file(
                result.file_path, backup
            )

            if success and fixes_applied > 0:
                total_fixes += fixes_applied
                files_fixed += 1
                print(f"   ✅ Applied {fixes_applied} fix(es)")
                if backup:
                    print(
                        f"   💾 Backup created: {result.file_path}.shell-validator.backup"
                    )
            elif not success:
                print("   ❌ Failed to apply fixes")

        if files_fixed > 0:
            print(f"\n🎉 Applied {total_fixes} fixes to {files_fixed} file(s)")
        else:
            print("\nℹ️  No auto-fixable issues found")

    def _install_git_hooks(self, args) -> int:
        """Install Git hooks"""
        installer = GitHookInstaller(args.project_root)

        if not installer.is_git_repository():
            print(ColorFormatter.critical("❌ Not a Git repository"))
            return 1

        config = GitHookConfig(
            fail_on_critical=args.fail_on_critical,
            fail_on_warnings=args.fail_on_warnings,
        )

        success = True
        if args.hook_type in ["pre-commit", "both"]:
            if installer.install_pre_commit_hook(config):
                print(ColorFormatter.success("✅ Pre-commit hook installed"))
            else:
                success = False

        if args.hook_type in ["pre-push", "both"]:
            config.hook_type = "pre-push"
            if installer.install_pre_push_hook(config):
                print(ColorFormatter.success("✅ Pre-push hook installed"))
            else:
                success = False

        return 0 if success else 1

    def _uninstall_git_hooks(self, args) -> int:
        """Uninstall Git hooks"""
        installer = GitHookInstaller(args.project_root)

        if installer.uninstall_hooks():
            print(ColorFormatter.success("✅ Git hooks uninstalled"))
            return 0
        else:
            print(ColorFormatter.critical("❌ Failed to uninstall hooks"))
            return 1

    def _run_git_hook(self, args) -> int:
        """Run Git hook validation"""
        config = GitHookConfig(
            hook_type=args.hook_type,
            fail_on_critical=args.fail_on_critical,
            fail_on_warnings=args.fail_on_warnings,
        )

        hook_validator = GitHookValidator(config)

        if args.hook_type == "pre-commit":
            return hook_validator.run_pre_commit_hook()
        elif args.hook_type == "pre-push":
            return hook_validator.run_pre_push_hook()
        else:
            print(ColorFormatter.critical(f"❌ Unknown hook type: {args.hook_type}"))
            return 1


def create_argument_parser():
    """Create and configure argument parser"""
    parser = argparse.ArgumentParser(
        description="Comprehensive Shell Script Validator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s validate script.sh                     # Validate single file
  %(prog)s validate --directory src/              # Validate directory
  %(prog)s validate --stdin < script.sh           # Validate from stdin
  %(prog)s validate script.sh --format html       # Generate HTML report
  %(prog)s install-hooks --hook-type pre-commit   # Install pre-commit hook
  %(prog)s validate --only-rules SV001,SV002      # Run specific rules only

Configuration:
  Create .shell-validator.json in your project or home directory for custom settings.
        """,
    )

    # Global options
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--version", action="version", version="Shell Validator 1.0.0")

    # Subcommands
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate shell scripts")
    validate_parser.add_argument(
        "files", nargs="*", help="Shell script files to validate"
    )
    validate_parser.add_argument(
        "--directory", "-d", help="Directory to scan for shell scripts"
    )
    validate_parser.add_argument(
        "--stdin", action="store_true", help="Read script from stdin"
    )
    validate_parser.add_argument(
        "--format",
        choices=["text", "json", "html"],
        default="text",
        help="Output format (default: text)",
    )
    validate_parser.add_argument("--output", "-o", help="Output file (default: stdout)")
    validate_parser.add_argument(
        "--exclude-rules", nargs="+", help="Rule IDs to exclude"
    )
    validate_parser.add_argument(
        "--only-rules", nargs="+", help="Only run specified rule IDs"
    )
    validate_parser.add_argument(
        "--patterns",
        nargs="+",
        default=["*.sh", "*.bash", "*.zsh"],
        help="File patterns to match (default: *.sh *.bash *.zsh)",
    )
    validate_parser.add_argument(
        "--exclude", nargs="+", default=[], help="Patterns to exclude"
    )
    validate_parser.add_argument(
        "--performance",
        action="store_true",
        default=True,
        help="Enable performance mode (default: enabled)",
    )
    validate_parser.add_argument(
        "--auto-fix",
        action="store_true",
        help="Automatically fix issues where possible",
    )
    validate_parser.add_argument(
        "--no-backup",
        action="store_true",
        help="Do not create backup files when auto-fixing",
    )

    # Install hooks command
    install_parser = subparsers.add_parser("install-hooks", help="Install Git hooks")
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

    # Uninstall hooks command
    uninstall_parser = subparsers.add_parser(
        "uninstall-hooks", help="Uninstall Git hooks"
    )
    uninstall_parser.add_argument(
        "--project-root", default=".", help="Project root directory"
    )

    # Run hook command (internal use)
    hook_parser = subparsers.add_parser("run-hook", help="Run Git hook (internal use)")
    hook_parser.add_argument(
        "--hook-type", choices=["pre-commit", "pre-push"], required=True
    )
    hook_parser.add_argument("--fail-on-critical", type=bool, default=True)
    hook_parser.add_argument("--fail-on-warnings", type=bool, default=False)

    return parser


def main():
    """Main entry point"""
    parser = create_argument_parser()
    args = parser.parse_args()

    # Set up logging
    log_level = logging.INFO if args.verbose else logging.WARNING
    logging.basicConfig(
        level=log_level, format="%(levelname)s: %(message)s", stream=sys.stderr
    )

    # Default to validate command if no command specified
    if not args.command:
        if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
            # Assume files are provided for validation
            args.command = "validate"
            args.files = [arg for arg in sys.argv[1:] if not arg.startswith("-")]
        else:
            parser.print_help()
            return 1

    # Execute command
    cli = CLIInterface()
    return cli.run_command(args)


if __name__ == "__main__":
    sys.exit(main())

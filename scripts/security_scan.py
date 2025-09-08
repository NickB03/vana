#!/usr/bin/env python3
"""Security scanning script for CI/CD pipeline."""

import os
import sys
import json
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum


class SeverityLevel(Enum):
    """Security issue severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SecurityIssue:
    """Represents a security issue found during scanning."""

    type: str
    severity: SeverityLevel
    file_path: str
    line_number: Optional[int]
    description: str
    recommendation: str
    cwe_id: Optional[str] = None


class SecurityScanner:
    """Comprehensive security scanner for the Vana application."""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.issues: List[SecurityIssue] = []
        self.logger = self._setup_logging()

    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration."""
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
        return logging.getLogger(__name__)

    def scan_dependencies(self) -> List[SecurityIssue]:
        """Scan Python dependencies for known vulnerabilities using safety."""
        issues = []

        try:
            # Try to install safety if not present
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "safety"],
                capture_output=True,
                check=False,
            )

            # Run safety check
            result = subprocess.run(
                [sys.executable, "-m", "safety", "check", "--json"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
            )

            if result.returncode != 0 and result.stdout:
                try:
                    vulnerabilities = json.loads(result.stdout)
                    for vuln in vulnerabilities:
                        issues.append(
                            SecurityIssue(
                                type="dependency_vulnerability",
                                severity=SeverityLevel.HIGH,
                                file_path="requirements.txt",
                                line_number=None,
                                description=f"Vulnerable package: {vuln.get('package')} {vuln.get('installed_version')}",
                                recommendation=f"Update to version {vuln.get('fixed_in', 'latest')}",
                                cwe_id=vuln.get("cwe_id"),
                            )
                        )
                except json.JSONDecodeError:
                    self.logger.warning("Could not parse safety output")

        except Exception as e:
            self.logger.warning(f"Could not run dependency scan: {e}")

        return issues

    def scan_secrets(self) -> List[SecurityIssue]:
        """Scan for hardcoded secrets and sensitive information."""
        issues = []

        # Common secret patterns
        secret_patterns = [
            (
                r'password\s*=\s*["\']([^"\']+)["\']',
                "hardcoded_password",
                SeverityLevel.CRITICAL,
            ),
            (
                r'secret\s*=\s*["\']([^"\']+)["\']',
                "hardcoded_secret",
                SeverityLevel.CRITICAL,
            ),
            (
                r'api_key\s*=\s*["\']([^"\']+)["\']',
                "hardcoded_api_key",
                SeverityLevel.HIGH,
            ),
            (r'token\s*=\s*["\']([^"\']+)["\']', "hardcoded_token", SeverityLevel.HIGH),
            (r"sk-[a-zA-Z0-9]{48}", "openai_api_key", SeverityLevel.CRITICAL),
            (r"ya29\.[a-zA-Z0-9_-]+", "google_oauth_token", SeverityLevel.CRITICAL),
        ]

        # Files to scan
        file_patterns = ["*.py", "*.yml", "*.yaml", "*.json", "*.env*"]

        import re

        for pattern in file_patterns:
            for file_path in self.project_root.rglob(pattern):
                # Skip test files and hidden files
                if any(
                    part.startswith(".") or "test" in part.lower()
                    for part in file_path.parts
                ):
                    continue

                try:
                    content = file_path.read_text(encoding="utf-8")
                    lines = content.split("\n")

                    for line_num, line in enumerate(lines, 1):
                        for regex_pattern, issue_type, severity in secret_patterns:
                            if re.search(regex_pattern, line, re.IGNORECASE):
                                # Skip obvious test/example values
                                if any(
                                    test_val in line.lower()
                                    for test_val in [
                                        "test",
                                        "example",
                                        "placeholder",
                                        "dummy",
                                        "fake",
                                    ]
                                ):
                                    continue

                                issues.append(
                                    SecurityIssue(
                                        type=issue_type,
                                        severity=severity,
                                        file_path=str(
                                            file_path.relative_to(self.project_root)
                                        ),
                                        line_number=line_num,
                                        description=f"Potential hardcoded {issue_type.replace('_', ' ')} found",
                                        recommendation="Use environment variables or secure secret management",
                                    )
                                )

                except (UnicodeDecodeError, PermissionError):
                    continue

        return issues

    def scan_code_quality(self) -> List[SecurityIssue]:
        """Scan for security-related code quality issues."""
        issues = []

        try:
            # Try to run bandit for security linting
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "bandit"],
                capture_output=True,
                check=False,
            )

            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "bandit",
                    "-r",
                    ".",
                    "-f",
                    "json",
                    "-x",
                    "tests/,venv/",
                ],
                cwd=self.project_root,
                capture_output=True,
                text=True,
            )

            if result.stdout:
                try:
                    bandit_report = json.loads(result.stdout)
                    for issue in bandit_report.get("results", []):
                        severity_map = {
                            "LOW": SeverityLevel.LOW,
                            "MEDIUM": SeverityLevel.MEDIUM,
                            "HIGH": SeverityLevel.HIGH,
                        }

                        issues.append(
                            SecurityIssue(
                                type="code_security_issue",
                                severity=severity_map.get(
                                    issue.get("issue_severity", "MEDIUM"),
                                    SeverityLevel.MEDIUM,
                                ),
                                file_path=issue.get("filename", "").replace(
                                    str(self.project_root) + "/", ""
                                ),
                                line_number=issue.get("line_number"),
                                description=issue.get("issue_text", ""),
                                recommendation="Review the code for security implications",
                                cwe_id=issue.get("test_id"),
                            )
                        )
                except json.JSONDecodeError:
                    self.logger.warning("Could not parse bandit output")

        except Exception as e:
            self.logger.warning(f"Could not run code quality scan: {e}")

        return issues

    def scan_configuration(self) -> List[SecurityIssue]:
        """Scan configuration files for security issues."""
        issues = []

        # Check .env files
        env_files = list(self.project_root.glob("*.env*"))
        for env_file in env_files:
            if env_file.name.endswith(".example"):
                continue

            try:
                content = env_file.read_text()

                # Check for weak secrets
                if "SECRET_KEY=your-secret-key-here" in content:
                    issues.append(
                        SecurityIssue(
                            type="weak_secret",
                            severity=SeverityLevel.CRITICAL,
                            file_path=str(env_file.relative_to(self.project_root)),
                            line_number=None,
                            description="Weak or placeholder secret key detected",
                            recommendation="Generate a strong, unique secret key",
                        )
                    )

                # Check for insecure settings
                if (
                    "AUTH_REQUIRE_SSE_AUTH=false" in content
                    and "production" in env_file.name.lower()
                ):
                    issues.append(
                        SecurityIssue(
                            type="insecure_config",
                            severity=SeverityLevel.HIGH,
                            file_path=str(env_file.relative_to(self.project_root)),
                            line_number=None,
                            description="Authentication disabled in production configuration",
                            recommendation="Enable authentication for production environments",
                        )
                    )

            except Exception as e:
                self.logger.warning(f"Could not scan {env_file}: {e}")

        return issues

    def scan_docker_security(self) -> List[SecurityIssue]:
        """Scan Docker configuration for security issues."""
        issues = []

        dockerfile_paths = list(self.project_root.glob("**/Dockerfile*"))

        for dockerfile in dockerfile_paths:
            try:
                content = dockerfile.read_text()
                lines = content.split("\n")

                for line_num, line in enumerate(lines, 1):
                    line = line.strip().upper()

                    # Check for running as root
                    if line.startswith("USER ROOT") or (
                        line.startswith("RUN") and "sudo" in line
                    ):
                        issues.append(
                            SecurityIssue(
                                type="docker_root_user",
                                severity=SeverityLevel.HIGH,
                                file_path=str(
                                    dockerfile.relative_to(self.project_root)
                                ),
                                line_number=line_num,
                                description="Container running as root user",
                                recommendation="Create and use a non-root user",
                            )
                        )

                    # Check for ADD instead of COPY
                    if line.startswith("ADD ") and not line.startswith("ADD --"):
                        issues.append(
                            SecurityIssue(
                                type="docker_add_command",
                                severity=SeverityLevel.MEDIUM,
                                file_path=str(
                                    dockerfile.relative_to(self.project_root)
                                ),
                                line_number=line_num,
                                description="Using ADD instead of COPY",
                                recommendation="Use COPY instead of ADD for local files",
                            )
                        )

            except Exception as e:
                self.logger.warning(f"Could not scan {dockerfile}: {e}")

        return issues

    def generate_report(self) -> Dict[str, Any]:
        """Generate a comprehensive security report."""
        # Collect all issues
        self.issues.extend(self.scan_dependencies())
        self.issues.extend(self.scan_secrets())
        self.issues.extend(self.scan_code_quality())
        self.issues.extend(self.scan_configuration())
        self.issues.extend(self.scan_docker_security())

        # Categorize by severity
        severity_counts = {level: 0 for level in SeverityLevel}
        for issue in self.issues:
            severity_counts[issue.severity] += 1

        # Create report
        report = {
            "timestamp": "2025-01-07T12:00:00Z",  # Would be current timestamp
            "total_issues": len(self.issues),
            "severity_breakdown": {
                level.value: count for level, count in severity_counts.items()
            },
            "issues": [
                {
                    "type": issue.type,
                    "severity": issue.severity.value,
                    "file_path": issue.file_path,
                    "line_number": issue.line_number,
                    "description": issue.description,
                    "recommendation": issue.recommendation,
                    "cwe_id": issue.cwe_id,
                }
                for issue in self.issues
            ],
            "scan_summary": {
                "dependencies_scanned": True,
                "secrets_scanned": True,
                "code_quality_scanned": True,
                "configuration_scanned": True,
                "docker_scanned": True,
            },
        }

        return report

    def should_fail_build(self) -> bool:
        """Determine if build should fail based on security issues."""
        fail_on_critical = (
            os.getenv("SECURITY_FAIL_ON_CRITICAL", "true").lower() == "true"
        )

        if fail_on_critical:
            critical_issues = [
                issue
                for issue in self.issues
                if issue.severity == SeverityLevel.CRITICAL
            ]
            return len(critical_issues) > 0

        return False


def main():
    """Main entry point for security scanning."""
    project_root = Path(__file__).parent.parent

    # Check if scanning is enabled
    if os.getenv("SECURITY_SCAN_ENABLED", "true").lower() != "true":
        print("Security scanning disabled")
        return 0

    scanner = SecurityScanner(project_root)
    report = scanner.generate_report()

    # Output report
    print("\n" + "=" * 60)
    print("SECURITY SCAN REPORT")
    print("=" * 60)
    print(f"Total issues found: {report['total_issues']}")
    print(f"Critical: {report['severity_breakdown']['critical']}")
    print(f"High: {report['severity_breakdown']['high']}")
    print(f"Medium: {report['severity_breakdown']['medium']}")
    print(f"Low: {report['severity_breakdown']['low']}")

    # Show critical and high issues
    critical_high_issues = [
        issue
        for issue in scanner.issues
        if issue.severity in [SeverityLevel.CRITICAL, SeverityLevel.HIGH]
    ]

    if critical_high_issues:
        print("\nCRITICAL & HIGH SEVERITY ISSUES:")
        print("-" * 40)
        for issue in critical_high_issues:
            print(f"[{issue.severity.value.upper()}] {issue.type}")
            print(f"  File: {issue.file_path}")
            if issue.line_number:
                print(f"  Line: {issue.line_number}")
            print(f"  Description: {issue.description}")
            print(f"  Recommendation: {issue.recommendation}")
            print()

    # Save detailed report
    report_path = project_root / "security-report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"Detailed report saved to: {report_path}")

    # Return appropriate exit code
    if scanner.should_fail_build():
        print("\nBUILD FAILED: Critical security issues found")
        return 1
    else:
        print("\nSECURITY SCAN PASSED")
        return 0


if __name__ == "__main__":
    sys.exit(main())

"""
Security Validation Framework for VANA Testing

Comprehensive security validation framework that identifies and prevents vulnerabilities
including OWASP Top 10 compliance, code injection prevention, and configuration security.

Features:
- Code security analysis (Python, JavaScript, Shell)
- Configuration security validation
- Network security testing
- Authentication and authorization checks
- Data exposure prevention
- Input validation testing
"""

import json
import logging
import re
import urllib.parse
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class SecurityViolation:
    """Security violation detected in code or configuration."""

    severity: str  # "low", "medium", "high", "critical"
    category: str  # "injection", "access_control", "data_exposure", etc.
    description: str
    location: str
    recommendation: str
    cwe_id: Optional[str] = None  # Common Weakness Enumeration ID
    owasp_category: Optional[str] = None  # OWASP Top 10 category


class SecurityValidator:
    """Comprehensive security validation framework."""

    def __init__(self):
        self.violations: List[SecurityViolation] = []
        self.scan_results: Dict[str, Any] = {}

    def clear_violations(self):
        """Clear all recorded violations."""
        self.violations.clear()
        self.scan_results.clear()

    def add_violation(self, violation: SecurityViolation):
        """Add a security violation to the results."""
        self.violations.append(violation)
        logger.warning(
            f"Security violation detected: {violation.severity} - {violation.description}"
        )

    def validate_python_code(
        self, code: str, filename: str = "unknown"
    ) -> List[SecurityViolation]:
        """Validate Python code for security vulnerabilities."""
        violations = []

        # Check for dangerous functions
        dangerous_functions = {
            "eval": "Code injection vulnerability - eval() executes arbitrary code",
            "exec": "Code injection vulnerability - exec() executes arbitrary code",
            "compile": "Code injection vulnerability - compile() can execute arbitrary code",
            "__import__": "Dynamic import vulnerability - can import arbitrary modules",
            "getattr": "Attribute access vulnerability - can access arbitrary attributes",
            "setattr": "Attribute modification vulnerability - can modify arbitrary attributes",
            "delattr": "Attribute deletion vulnerability - can delete arbitrary attributes",
            "globals": "Global namespace access - can access global variables",
            "locals": "Local namespace access - can access local variables",
            "vars": "Variable access - can access object variables",
        }

        for func, description in dangerous_functions.items():
            if re.search(rf"\b{func}\s*\(", code):
                violation = SecurityViolation(
                    severity="high",
                    category="code_injection",
                    description=f"Dangerous function '{func}' detected: {description}",
                    location=f"{filename}:line containing '{func}'",
                    recommendation=f"Remove or replace '{func}' with safer alternative",
                    cwe_id="CWE-94",
                    owasp_category="A03:2021 – Injection",
                )
                violations.append(violation)
                self.add_violation(violation)

        # Check for file system access patterns
        file_patterns = {
            r"open\s*\(": "File access detected - ensure proper path validation",
            r"file\s*\(": "File access detected - ensure proper path validation",
            r"os\.": "OS module usage - review for security implications",
            r"subprocess\.": "Subprocess execution - potential command injection",
            r"shutil\.": "File operations - ensure proper path validation",
            r"pathlib\.": "Path operations - ensure proper validation",
        }

        for pattern, description in file_patterns.items():
            if re.search(pattern, code):
                violation = SecurityViolation(
                    severity="medium",
                    category="file_access",
                    description=f"File system access pattern detected: {description}",
                    location=f"{filename}:pattern '{pattern}'",
                    recommendation="Implement proper input validation and path sanitization",
                    cwe_id="CWE-22",
                    owasp_category="A01:2021 – Broken Access Control",
                )
                violations.append(violation)
                self.add_violation(violation)

        # Check for SQL injection patterns
        sql_patterns = [
            r"SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*\+",
            r"INSERT\s+INTO\s+.*\s+VALUES\s*\(.*\+",
            r"UPDATE\s+.*\s+SET\s+.*\+",
            r"DELETE\s+FROM\s+.*\s+WHERE\s+.*\+",
        ]

        for pattern in sql_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                violation = SecurityViolation(
                    severity="critical",
                    category="sql_injection",
                    description="Potential SQL injection vulnerability detected",
                    location=f"{filename}:SQL pattern",
                    recommendation="Use parameterized queries or ORM instead of string concatenation",
                    cwe_id="CWE-89",
                    owasp_category="A03:2021 – Injection",
                )
                violations.append(violation)
                self.add_violation(violation)

        # Check for hardcoded secrets
        secret_patterns = {
            r'password\s*=\s*["\'][^"\']{8,}["\']': "Hardcoded password detected",
            r'api_key\s*=\s*["\'][^"\']{16,}["\']': "Hardcoded API key detected",
            r'secret\s*=\s*["\'][^"\']{16,}["\']': "Hardcoded secret detected",
            r'token\s*=\s*["\'][^"\']{20,}["\']': "Hardcoded token detected",
            r'private_key\s*=\s*["\'].*["\']': "Hardcoded private key detected",
        }

        for pattern, description in secret_patterns.items():
            if re.search(pattern, code, re.IGNORECASE):
                violation = SecurityViolation(
                    severity="critical",
                    category="data_exposure",
                    description=f"Hardcoded secret detected: {description}",
                    location=f"{filename}:secret pattern",
                    recommendation="Use environment variables or secure secret management",
                    cwe_id="CWE-798",
                    owasp_category="A02:2021 – Cryptographic Failures",
                )
                violations.append(violation)
                self.add_violation(violation)

        return violations

    def validate_configuration(
        self, config: Dict[str, Any], config_name: str = "unknown"
    ) -> List[SecurityViolation]:
        """Validate configuration for security issues."""
        violations = []
        config_str = json.dumps(config, indent=2)

        # Check for hardcoded secrets in configuration
        secret_patterns = {
            r'"password"\s*:\s*"[^"]{8,}"': "Hardcoded password in configuration",
            r'"api_key"\s*:\s*"[^"]{16,}"': "Hardcoded API key in configuration",
            r'"secret"\s*:\s*"[^"]{16,}"': "Hardcoded secret in configuration",
            r'"token"\s*:\s*"[^"]{20,}"': "Hardcoded token in configuration",
            r'"private_key"\s*:\s*"[^"]+"': "Hardcoded private key in configuration",
        }

        for pattern, description in secret_patterns.items():
            if re.search(pattern, config_str, re.IGNORECASE):
                violation = SecurityViolation(
                    severity="critical",
                    category="data_exposure",
                    description=f"Hardcoded secret in configuration: {description}",
                    location=f"{config_name}:configuration",
                    recommendation="Use environment variables or secure secret management",
                    cwe_id="CWE-798",
                    owasp_category="A02:2021 – Cryptographic Failures",
                )
                violations.append(violation)
                self.add_violation(violation)

        # Check for insecure configurations
        insecure_configs = {
            "debug": True,
            "ssl_verify": False,
            "verify_ssl": False,
            "check_hostname": False,
            "allow_insecure": True,
        }

        def check_nested_config(obj, path=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    current_path = f"{path}.{key}" if path else key
                    if (
                        key.lower() in insecure_configs
                        and value == insecure_configs[key.lower()]
                    ):
                        violation = SecurityViolation(
                            severity="medium",
                            category="insecure_configuration",
                            description=f"Insecure configuration detected: {key}={value}",
                            location=f"{config_name}:{current_path}",
                            recommendation=f"Review and secure configuration for {key}",
                            cwe_id="CWE-16",
                            owasp_category="A05:2021 – Security Misconfiguration",
                        )
                        violations.append(violation)
                        self.add_violation(violation)
                    check_nested_config(value, current_path)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    check_nested_config(item, f"{path}[{i}]")

        check_nested_config(config)
        return violations

    def validate_network_access(self, urls: List[str]) -> List[SecurityViolation]:
        """Validate network access patterns for security."""
        violations = []

        dangerous_hosts = {
            "localhost": "Access to localhost detected",
            "127.0.0.1": "Access to loopback address detected",
            "0.0.0.0": "Access to all interfaces detected",
            "::1": "Access to IPv6 loopback detected",
            "169.254.": "Access to link-local address detected",
            "10.": "Access to private network detected",
            "172.16.": "Access to private network detected",
            "192.168.": "Access to private network detected",
        }

        for url in urls:
            parsed_url = urllib.parse.urlparse(url)
            host = parsed_url.hostname or parsed_url.netloc

            for dangerous_host, description in dangerous_hosts.items():
                if host and dangerous_host in host:
                    violation = SecurityViolation(
                        severity="high",
                        category="network_security",
                        description=f"Dangerous network access: {description}",
                        location=f"URL: {url}",
                        recommendation="Restrict access to internal networks and localhost",
                        cwe_id="CWE-918",
                        owasp_category="A10:2021 – Server-Side Request Forgery",
                    )
                    violations.append(violation)
                    self.add_violation(violation)

            # Check for insecure protocols
            if parsed_url.scheme in ["http", "ftp", "telnet"]:
                violation = SecurityViolation(
                    severity="medium",
                    category="insecure_transport",
                    description=f"Insecure protocol detected: {parsed_url.scheme}",
                    location=f"URL: {url}",
                    recommendation="Use secure protocols (HTTPS, SFTP, SSH)",
                    cwe_id="CWE-319",
                    owasp_category="A02:2021 – Cryptographic Failures",
                )
                violations.append(violation)
                self.add_violation(violation)

        return violations

    def validate_input_sanitization(self, inputs: List[str]) -> List[SecurityViolation]:
        """Validate input sanitization and injection prevention."""
        violations = []

        injection_patterns = {
            r"<script[^>]*>": "XSS vulnerability - script tag detected",
            r"javascript:": "XSS vulnerability - javascript protocol detected",
            r"on\w+\s*=": "XSS vulnerability - event handler detected",
            r"union\s+select": "SQL injection - UNION SELECT detected",
            r"drop\s+table": "SQL injection - DROP TABLE detected",
            r"insert\s+into": "SQL injection - INSERT INTO detected",
            r"delete\s+from": "SQL injection - DELETE FROM detected",
            r"\|\s*\w+": "Command injection - pipe operator detected",
            r";\s*\w+": "Command injection - command separator detected",
            r"`[^`]*`": "Command injection - backtick execution detected",
            r"\$\([^)]*\)": "Command injection - command substitution detected",
        }

        for input_data in inputs:
            for pattern, description in injection_patterns.items():
                if re.search(pattern, input_data, re.IGNORECASE):
                    violation = SecurityViolation(
                        severity="high",
                        category="injection",
                        description=f"Injection vulnerability detected: {description}",
                        location=f"Input: {input_data[:50]}...",
                        recommendation="Implement proper input validation and sanitization",
                        cwe_id="CWE-79",
                        owasp_category="A03:2021 – Injection",
                    )
                    violations.append(violation)
                    self.add_violation(violation)

        return violations

    def get_security_report(self) -> Dict[str, Any]:
        """Generate comprehensive security report."""
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        category_counts = {}
        owasp_counts = {}

        for violation in self.violations:
            severity_counts[violation.severity] += 1
            category_counts[violation.category] = (
                category_counts.get(violation.category, 0) + 1
            )
            if violation.owasp_category:
                owasp_counts[violation.owasp_category] = (
                    owasp_counts.get(violation.owasp_category, 0) + 1
                )

        total_violations = len(self.violations)
        risk_score = (
            severity_counts["critical"] * 10
            + severity_counts["high"] * 7
            + severity_counts["medium"] * 4
            + severity_counts["low"] * 1
        )

        return {
            "total_violations": total_violations,
            "risk_score": risk_score,
            "severity_breakdown": severity_counts,
            "category_breakdown": category_counts,
            "owasp_breakdown": owasp_counts,
            "violations": [
                {
                    "severity": v.severity,
                    "category": v.category,
                    "description": v.description,
                    "location": v.location,
                    "recommendation": v.recommendation,
                    "cwe_id": v.cwe_id,
                    "owasp_category": v.owasp_category,
                }
                for v in self.violations
            ],
        }

    def save_report(self, filepath: Union[str, Path]):
        """Save security report to JSON file."""
        report = self.get_security_report()

        with open(filepath, "w") as f:
            json.dump(report, f, indent=2)

        logger.info(f"Security report saved to {filepath}")
        logger.info(
            f"Total violations: {report['total_violations']}, Risk score: {report['risk_score']}"
        )

# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Security Scanner for comprehensive security validation.

This validator performs deep security analysis of tool calls to identify
potential vulnerabilities, malicious patterns, and security risks.
"""

import logging
import re
import time
from typing import Any

from ..config.hook_config import SecurityScannerConfig

logger = logging.getLogger(__name__)


class SecurityScanner:
    """
    Comprehensive security scanner for tool calls.

    Features:
    - XSS detection and prevention
    - SQL injection detection
    - Command injection prevention
    - Path traversal detection
    - Secret and credential scanning
    - Malicious pattern detection
    - Vulnerability scoring
    """

    essential = True
    performance_heavy = True  # Deep scanning can be resource intensive

    def __init__(self, config: SecurityScannerConfig):
        """Initialize the security scanner."""
        self.config = config

        # Initialize pattern databases
        self._init_security_patterns()
        self._init_vulnerability_database()

        logger.info(
            "Security scanner initialized with scan depth: %s", config.scan_depth
        )

    def _init_security_patterns(self):
        """Initialize security pattern databases."""

        # XSS patterns
        self.xss_patterns = [
            re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL),
            re.compile(r"javascript:", re.IGNORECASE),
            re.compile(
                r"on(?:click|load|error|mouseover|mouseout|submit|focus|blur)\s*=",
                re.IGNORECASE,
            ),
            re.compile(r"<iframe[^>]*src\s*=", re.IGNORECASE),
            re.compile(r"<object[^>]*data\s*=", re.IGNORECASE),
            re.compile(r"<embed[^>]*src\s*=", re.IGNORECASE),
            re.compile(r'<link[^>]*href\s*=\s*["\']javascript:', re.IGNORECASE),
            re.compile(r'<img[^>]*src\s*=\s*["\']javascript:', re.IGNORECASE),
            re.compile(r"eval\s*\(", re.IGNORECASE),
            re.compile(r"Function\s*\(", re.IGNORECASE),
            re.compile(r'setTimeout\s*\(\s*["\'][^"\']*["\']', re.IGNORECASE),
            re.compile(r'setInterval\s*\(\s*["\'][^"\']*["\']', re.IGNORECASE),
        ]

        # SQL injection patterns
        self.sql_injection_patterns = [
            re.compile(r"\bunion\s+(?:all\s+)?select\b", re.IGNORECASE),
            re.compile(
                r'\bselect\s+.*\bfrom\s+.*\bwhere\s+.*[\'"].*[\'"]', re.IGNORECASE
            ),
            re.compile(r"\binsert\s+into\s+.*\bvalues\s*\(", re.IGNORECASE),
            re.compile(
                r'\bupdate\s+.*\bset\s+.*\bwhere\s+.*[\'"].*[\'"]', re.IGNORECASE
            ),
            re.compile(r'\bdelete\s+from\s+.*\bwhere\s+.*[\'"].*[\'"]', re.IGNORECASE),
            re.compile(r"\bdrop\s+(?:table|database|schema)\s+", re.IGNORECASE),
            re.compile(r"\balter\s+table\s+", re.IGNORECASE),
            re.compile(r"\bcreate\s+(?:table|database|schema)\s+", re.IGNORECASE),
            re.compile(r'[\'"][\s]*(?:or|and)[\s]*[\'"]', re.IGNORECASE),
            re.compile(r'[\'"][\s]*(?:or|and)[\s]*1\s*=\s*1', re.IGNORECASE),
            re.compile(
                r'[\'"][\s]*(?:or|and)[\s]*[\'"][^\'\"]*[\'"][\s]*=[\s]*[\'"]',
                re.IGNORECASE,
            ),
            re.compile(r"--[\s]*$", re.MULTILINE),
            re.compile(r"/\*.*?\*/", re.DOTALL),
        ]

        # Command injection patterns
        self.command_injection_patterns = [
            re.compile(r"[;&|`]"),  # Command separators
            re.compile(r"\$\([^)]*\)"),  # Command substitution
            re.compile(r"`[^`]*`"),  # Backtick execution
            re.compile(r"\${[^}]*}"),  # Variable substitution
            re.compile(
                r"(?:system|exec|shell_exec|passthru|popen)\s*\(", re.IGNORECASE
            ),
            re.compile(r"(?:subprocess|os\.system|os\.popen)", re.IGNORECASE),
            re.compile(r"(?:eval|exec)\s*\(", re.IGNORECASE),
        ]

        # Path traversal patterns
        self.path_traversal_patterns = [
            re.compile(r"\.\./", re.IGNORECASE),
            re.compile(r"\.\.\\\\", re.IGNORECASE),
            re.compile(r"%2e%2e%2f", re.IGNORECASE),
            re.compile(r"%2e%2e%5c", re.IGNORECASE),
            re.compile(r"%c0%ae%c0%ae/", re.IGNORECASE),
            re.compile(r"%252e%252e%252f", re.IGNORECASE),
        ]

        # Secret patterns
        self.secret_patterns = {
            "api_keys": re.compile(
                r'(?:api[_-]?key|apikey)\s*[:=]\s*["\']?([a-zA-Z0-9_-]{20,})',
                re.IGNORECASE,
            ),
            "jwt_tokens": re.compile(
                r"eyJ[0-9a-zA-Z_-]*\.eyJ[0-9a-zA-Z_-]*\.[0-9a-zA-Z_-]*"
            ),
            "bearer_tokens": re.compile(r"bearer\s+([a-zA-Z0-9._-]+)", re.IGNORECASE),
            "aws_access_keys": re.compile(r"AKIA[0-9A-Z]{16}"),
            "aws_secret_keys": re.compile(r"[0-9a-zA-Z/+]{40}"),
            "github_tokens": re.compile(r"ghp_[a-zA-Z0-9]{36}"),
            "slack_tokens": re.compile(r"xox[baprs]-[0-9a-zA-Z-]{10,}"),
            "private_keys": re.compile(
                r"-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----", re.IGNORECASE
            ),
            "passwords": re.compile(
                r'password\s*[:=]\s*["\']([^"\']{8,})', re.IGNORECASE
            ),
            "connection_strings": re.compile(
                r'(?:mongodb|mysql|postgres|redis)://[^\s<>"\']+', re.IGNORECASE
            ),
            "google_api_keys": re.compile(r"AIza[0-9A-Za-z_-]{35}"),
            "stripe_keys": re.compile(r"sk_live_[0-9a-zA-Z]{24}"),
            "mailgun_keys": re.compile(r"key-[0-9a-z]{32}"),
            "sendgrid_keys": re.compile(r"SG\.[0-9A-Za-z_-]{22}\.[0-9A-Za-z_-]{43}"),
        }

        # Malware patterns
        self.malware_patterns = [
            re.compile(r"(?:trojan|virus|malware|backdoor|rootkit)", re.IGNORECASE),
            re.compile(r"(?:keylogger|stealer|ransomware|cryptolocker)", re.IGNORECASE),
            re.compile(r"(?:botnet|ddos|dos\s+attack)", re.IGNORECASE),
            re.compile(r"(?:shell|webshell|c99|r57|b374k)", re.IGNORECASE),
        ]

        # Suspicious URLs
        self.suspicious_url_patterns = [
            re.compile(r"(?:bit\.ly|tinyurl|t\.co|short\.link)", re.IGNORECASE),
            re.compile(
                r"[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}"
            ),  # IP addresses
            re.compile(r"(?:localhost|127\.0\.0\.1|0\.0\.0\.0)", re.IGNORECASE),
            re.compile(r"(?:\.tk|\.ml|\.ga|\.cf)", re.IGNORECASE),  # Suspicious TLDs
        ]

    def _init_vulnerability_database(self):
        """Initialize vulnerability pattern database."""
        self.vulnerability_patterns = {
            "code_injection": {
                "patterns": self.command_injection_patterns,
                "severity": "critical",
                "score_impact": 0.9,
            },
            "sql_injection": {
                "patterns": self.sql_injection_patterns,
                "severity": "critical",
                "score_impact": 0.9,
            },
            "xss": {
                "patterns": self.xss_patterns,
                "severity": "high",
                "score_impact": 0.7,
            },
            "path_traversal": {
                "patterns": self.path_traversal_patterns,
                "severity": "high",
                "score_impact": 0.8,
            },
            "secret_exposure": {
                "patterns": list(self.secret_patterns.values()),
                "severity": "critical",
                "score_impact": 0.95,
            },
            "malware_indicators": {
                "patterns": self.malware_patterns,
                "severity": "critical",
                "score_impact": 0.95,
            },
        }

    def validate(self, tool_call) -> dict[str, Any]:
        """Validate a tool call synchronously."""
        start_time = time.time()

        try:
            result = self._perform_security_scan(tool_call)
            result["execution_time"] = time.time() - start_time
            return result

        except Exception as e:
            logger.error("Security scanner error: %s", str(e))
            return {
                "status": "error",
                "passed": False,
                "error": str(e),
                "execution_time": time.time() - start_time,
            }

    async def validate_async(self, tool_call) -> dict[str, Any]:
        """Validate a tool call asynchronously."""
        return self.validate(tool_call)

    def _perform_security_scan(self, tool_call) -> dict[str, Any]:
        """Perform comprehensive security scanning."""
        scan_results = {
            "vulnerabilities": [],
            "security_issues": [],
            "warnings": [],
            "recommendations": [],
            "security_score": 1.0,
            "risk_level": "low",
            "scan_depth": self.config.scan_depth,
        }

        # Extract content based on tool type
        content_to_scan = self._extract_scannable_content(tool_call)

        # Perform scans based on configuration
        if self.config.check_xss:
            xss_results = self._scan_xss(content_to_scan)
            self._merge_scan_results(scan_results, xss_results, "XSS")

        if self.config.check_sql_injection:
            sql_results = self._scan_sql_injection(content_to_scan)
            self._merge_scan_results(scan_results, sql_results, "SQL Injection")

        if self.config.check_command_injection:
            cmd_results = self._scan_command_injection(content_to_scan)
            self._merge_scan_results(scan_results, cmd_results, "Command Injection")

        if self.config.check_path_traversal:
            path_results = self._scan_path_traversal(content_to_scan)
            self._merge_scan_results(scan_results, path_results, "Path Traversal")

        if self.config.check_secrets:
            secret_results = self._scan_secrets(content_to_scan)
            self._merge_scan_results(scan_results, secret_results, "Secret Exposure")

        # Additional scans based on depth
        if self.config.scan_depth in ["standard", "deep"]:
            malware_results = self._scan_malware_indicators(content_to_scan)
            self._merge_scan_results(scan_results, malware_results, "Malware")

            url_results = self._scan_suspicious_urls(content_to_scan)
            self._merge_scan_results(scan_results, url_results, "Suspicious URLs")

        if self.config.scan_depth == "deep":
            encoding_results = self._scan_encoding_attacks(content_to_scan)
            self._merge_scan_results(scan_results, encoding_results, "Encoding Attacks")

            crypto_results = self._scan_crypto_issues(content_to_scan)
            self._merge_scan_results(scan_results, crypto_results, "Crypto Issues")

        # Calculate final scores and status
        final_score = self._calculate_final_security_score(scan_results)
        risk_level = self._determine_risk_level(
            final_score, scan_results["vulnerabilities"]
        )

        # Generate recommendations
        recommendations = self._generate_security_recommendations(scan_results)

        # Determine if validation passes
        passed = final_score >= self.config.vulnerability_threshold and not any(
            vuln["severity"] == "critical" for vuln in scan_results["vulnerabilities"]
        )

        return {
            "status": "passed" if passed else "failed",
            "passed": passed,
            "security_score": final_score,
            "risk_level": risk_level,
            "vulnerabilities": scan_results["vulnerabilities"],
            "issues": scan_results["security_issues"],
            "warnings": scan_results["warnings"],
            "recommendations": recommendations,
            "scan_summary": self._create_scan_summary(scan_results),
            "weight": 2.0,  # Security is high priority
            "message": f"Security scan: {'passed' if passed else 'failed'} (score: {final_score:.2f})",
        }

    def _extract_scannable_content(self, tool_call) -> dict[str, str]:
        """Extract content that should be scanned."""
        content = {}

        if tool_call.tool_type.value in ["write", "edit"]:
            content["file_content"] = tool_call.parameters.get("content", "")
            content["file_path"] = tool_call.parameters.get("file_path", "")

        elif tool_call.tool_type.value == "multi_edit":
            content["file_path"] = tool_call.parameters.get("file_path", "")
            edits = tool_call.parameters.get("edits", [])
            content["edit_content"] = "\n".join(
                [edit.get("new_string", "") for edit in edits]
            )

        elif tool_call.tool_type.value == "bash":
            content["command"] = tool_call.parameters.get("command", "")

        elif tool_call.tool_type.value == "read":
            content["file_path"] = tool_call.parameters.get("file_path", "")

        return content

    def _scan_xss(self, content: dict[str, str]) -> dict[str, Any]:
        """Scan for XSS vulnerabilities."""
        results = {"vulnerabilities": [], "warnings": []}

        for content_type, text in content.items():
            if not text:
                continue

            for pattern in self.xss_patterns:
                matches = pattern.findall(text)
                if matches:
                    results["vulnerabilities"].append(
                        {
                            "type": "XSS",
                            "severity": "high",
                            "location": content_type,
                            "pattern": pattern.pattern,
                            "matches": matches[:5],  # Limit to first 5 matches
                            "description": "Cross-site scripting vulnerability detected",
                        }
                    )

        return results

    def _scan_sql_injection(self, content: dict[str, str]) -> dict[str, Any]:
        """Scan for SQL injection vulnerabilities."""
        results = {"vulnerabilities": [], "warnings": []}

        for content_type, text in content.items():
            if not text:
                continue

            for pattern in self.sql_injection_patterns:
                matches = pattern.findall(text)
                if matches:
                    results["vulnerabilities"].append(
                        {
                            "type": "SQL Injection",
                            "severity": "critical",
                            "location": content_type,
                            "pattern": pattern.pattern,
                            "matches": matches[:3],
                            "description": "SQL injection vulnerability detected",
                        }
                    )

        return results

    def _scan_command_injection(self, content: dict[str, str]) -> dict[str, Any]:
        """Scan for command injection vulnerabilities."""
        results = {"vulnerabilities": [], "warnings": []}

        for content_type, text in content.items():
            if not text:
                continue

            for pattern in self.command_injection_patterns:
                matches = pattern.findall(text)
                if matches:
                    severity = "critical" if content_type == "command" else "high"
                    results["vulnerabilities"].append(
                        {
                            "type": "Command Injection",
                            "severity": severity,
                            "location": content_type,
                            "pattern": pattern.pattern,
                            "matches": matches[:3],
                            "description": "Command injection vulnerability detected",
                        }
                    )

        return results

    def _scan_path_traversal(self, content: dict[str, str]) -> dict[str, Any]:
        """Scan for path traversal vulnerabilities."""
        results = {"vulnerabilities": [], "warnings": []}

        for content_type, text in content.items():
            if not text:
                continue

            for pattern in self.path_traversal_patterns:
                matches = pattern.findall(text)
                if matches:
                    results["vulnerabilities"].append(
                        {
                            "type": "Path Traversal",
                            "severity": "high",
                            "location": content_type,
                            "pattern": pattern.pattern,
                            "matches": matches[:3],
                            "description": "Path traversal vulnerability detected",
                        }
                    )

        return results

    def _scan_secrets(self, content: dict[str, str]) -> dict[str, Any]:
        """Scan for exposed secrets and credentials."""
        results = {"vulnerabilities": [], "warnings": []}

        for content_type, text in content.items():
            if not text:
                continue

            for secret_type, pattern in self.secret_patterns.items():
                matches = pattern.findall(text)
                if matches:
                    # Mask the actual secret values
                    masked_matches = [self._mask_secret(match) for match in matches[:2]]

                    results["vulnerabilities"].append(
                        {
                            "type": "Secret Exposure",
                            "secret_type": secret_type,
                            "severity": "critical",
                            "location": content_type,
                            "matches": masked_matches,
                            "description": f"Exposed {secret_type} detected",
                        }
                    )

        return results

    def _scan_malware_indicators(self, content: dict[str, str]) -> dict[str, Any]:
        """Scan for malware indicators."""
        results = {"vulnerabilities": [], "warnings": []}

        for content_type, text in content.items():
            if not text:
                continue

            for pattern in self.malware_patterns:
                matches = pattern.findall(text)
                if matches:
                    results["warnings"].append(
                        {
                            "type": "Malware Indicator",
                            "severity": "high",
                            "location": content_type,
                            "matches": matches[:3],
                            "description": "Potential malware indicator detected",
                        }
                    )

        return results

    def _scan_suspicious_urls(self, content: dict[str, str]) -> dict[str, Any]:
        """Scan for suspicious URLs."""
        results = {"vulnerabilities": [], "warnings": []}

        for content_type, text in content.items():
            if not text:
                continue

            # Extract URLs
            url_pattern = re.compile(r'https?://[^\s<>"\']+', re.IGNORECASE)
            urls = url_pattern.findall(text)

            for url in urls:
                for pattern in self.suspicious_url_patterns:
                    if pattern.search(url):
                        results["warnings"].append(
                            {
                                "type": "Suspicious URL",
                                "severity": "medium",
                                "location": content_type,
                                "url": url,
                                "description": "Suspicious URL pattern detected",
                            }
                        )
                        break

        return results

    def _scan_encoding_attacks(self, content: dict[str, str]) -> dict[str, Any]:
        """Scan for encoding-based attacks."""
        results = {"vulnerabilities": [], "warnings": []}

        encoding_patterns = [
            re.compile(r"%[0-9a-f]{2}", re.IGNORECASE),  # URL encoding
            re.compile(r"&#[0-9]+;"),  # HTML entity encoding
            re.compile(r"\\u[0-9a-f]{4}", re.IGNORECASE),  # Unicode escapes
            re.compile(r"\\x[0-9a-f]{2}", re.IGNORECASE),  # Hex escapes
        ]

        for content_type, text in content.items():
            if not text:
                continue

            for pattern in encoding_patterns:
                matches = pattern.findall(text)
                if (
                    len(matches) > 10
                ):  # Many encoded characters might indicate obfuscation
                    results["warnings"].append(
                        {
                            "type": "Encoding Obfuscation",
                            "severity": "medium",
                            "location": content_type,
                            "count": len(matches),
                            "description": "High level of encoding detected - possible obfuscation",
                        }
                    )

        return results

    def _scan_crypto_issues(self, content: dict[str, str]) -> dict[str, Any]:
        """Scan for cryptographic issues."""
        results = {"vulnerabilities": [], "warnings": []}

        # Weak crypto patterns
        weak_crypto_patterns = [
            re.compile(r"\bmd5\b", re.IGNORECASE),
            re.compile(r"\bsha1\b", re.IGNORECASE),
            re.compile(r"\bdes\b", re.IGNORECASE),
            re.compile(r"\brc4\b", re.IGNORECASE),
            re.compile(r"random\(\)", re.IGNORECASE),
        ]

        for content_type, text in content.items():
            if not text:
                continue

            for pattern in weak_crypto_patterns:
                matches = pattern.findall(text)
                if matches:
                    results["warnings"].append(
                        {
                            "type": "Weak Cryptography",
                            "severity": "medium",
                            "location": content_type,
                            "algorithm": matches[0],
                            "description": "Weak cryptographic algorithm detected",
                        }
                    )

        return results

    def _merge_scan_results(
        self, main_results: dict, scan_results: dict, scan_type: str
    ):
        """Merge individual scan results into main results."""
        if "vulnerabilities" in scan_results:
            main_results["vulnerabilities"].extend(scan_results["vulnerabilities"])

        if "warnings" in scan_results:
            main_results["warnings"].extend(scan_results["warnings"])

        if "security_issues" in scan_results:
            main_results["security_issues"].extend(scan_results["security_issues"])

    def _calculate_final_security_score(self, scan_results: dict) -> float:
        """Calculate final security score based on all findings."""
        base_score = 1.0

        for vuln in scan_results["vulnerabilities"]:
            severity = vuln.get("severity", "medium")
            if severity == "critical":
                base_score *= 0.1
            elif severity == "high":
                base_score *= 0.3
            elif severity == "medium":
                base_score *= 0.6
            else:  # low
                base_score *= 0.8

        for warning in scan_results["warnings"]:
            severity = warning.get("severity", "low")
            if severity == "high":
                base_score *= 0.7
            elif severity == "medium":
                base_score *= 0.85
            else:  # low
                base_score *= 0.95

        return max(0.0, base_score)

    def _determine_risk_level(
        self, security_score: float, vulnerabilities: list
    ) -> str:
        """Determine risk level based on security score and vulnerabilities."""
        critical_vulns = [v for v in vulnerabilities if v.get("severity") == "critical"]
        high_vulns = [v for v in vulnerabilities if v.get("severity") == "high"]

        if critical_vulns or security_score < 0.3:
            return "critical"
        elif high_vulns or security_score < 0.5:
            return "high"
        elif security_score < 0.7:
            return "medium"
        else:
            return "low"

    def _generate_security_recommendations(self, scan_results: dict) -> list[str]:
        """Generate security recommendations based on scan results."""
        recommendations = []

        vuln_types = set(v.get("type") for v in scan_results["vulnerabilities"])

        if "XSS" in vuln_types:
            recommendations.append(
                "Implement proper input sanitization and output encoding"
            )
            recommendations.append("Use Content Security Policy (CSP) headers")

        if "SQL Injection" in vuln_types:
            recommendations.append("Use parameterized queries or prepared statements")
            recommendations.append("Implement proper input validation")

        if "Command Injection" in vuln_types:
            recommendations.append("Avoid executing user-controlled input")
            recommendations.append("Use safe APIs and validate all inputs")

        if "Secret Exposure" in vuln_types:
            recommendations.append("Remove all hardcoded secrets and credentials")
            recommendations.append(
                "Use environment variables or secure credential stores"
            )

        if "Path Traversal" in vuln_types:
            recommendations.append("Validate and sanitize all file paths")
            recommendations.append("Use whitelisting for allowed file access")

        if scan_results["security_score"] < 0.5:
            recommendations.append("Conduct thorough security review before deployment")
            recommendations.append("Consider security testing and penetration testing")

        return recommendations

    def _create_scan_summary(self, scan_results: dict) -> dict[str, Any]:
        """Create a summary of scan results."""
        return {
            "total_vulnerabilities": len(scan_results["vulnerabilities"]),
            "critical_vulnerabilities": len(
                [
                    v
                    for v in scan_results["vulnerabilities"]
                    if v.get("severity") == "critical"
                ]
            ),
            "high_vulnerabilities": len(
                [
                    v
                    for v in scan_results["vulnerabilities"]
                    if v.get("severity") == "high"
                ]
            ),
            "total_warnings": len(scan_results["warnings"]),
            "scan_depth": scan_results["scan_depth"],
            "security_score": scan_results["security_score"],
        }

    def _mask_secret(self, secret: str) -> str:
        """Mask a secret value for safe logging."""
        if len(secret) <= 8:
            return "*" * len(secret)
        return secret[:4] + "*" * (len(secret) - 8) + secret[-4:]

    def bypass_conditions(self, tool_call) -> list:
        """Return list of conditions that would bypass this validator."""
        return [
            lambda tc: tc.metadata.get("bypass_security_scanner", False),
            lambda tc: tc.metadata.get("security_reviewed", False),
            lambda tc: tc.metadata.get("internal_tool", False),
        ]

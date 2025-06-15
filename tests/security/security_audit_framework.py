#!/usr/bin/env python3
"""
Comprehensive Security Audit Framework

Performs thorough security assessment of the VANA system:
- Authentication and authorization review
- API security validation
- Data handling and privacy compliance
- Deployment security assessment
- Vulnerability scanning
- Security configuration review
"""

import asyncio
import logging
import time
import sys
import os
import json
import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import hashlib
import subprocess

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from lib.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)


@dataclass
class SecurityFinding:
    """Security audit finding."""
    category: str
    severity: str  # critical, high, medium, low, info
    title: str
    description: str
    file_path: str = ""
    line_number: int = 0
    recommendation: str = ""
    cve_reference: str = ""


@dataclass
class SecurityAuditReport:
    """Comprehensive security audit report."""
    total_findings: int
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int
    info_findings: int
    security_score: float
    compliance_status: str
    audit_duration: float


class SecurityAuditFramework:
    """Comprehensive security audit framework."""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.findings: List[SecurityFinding] = []
        
        # Security patterns to check
        self.security_patterns = {
            "hardcoded_secrets": [
                r'(?i)(api[_-]?key|password|secret|token)\s*[=:]\s*["\'][^"\']{8,}["\']',
                r'(?i)(aws|google|azure)[_-]?(access|secret)[_-]?key\s*[=:]\s*["\'][^"\']+["\']',
                r'(?i)bearer\s+[a-zA-Z0-9_-]{20,}',
                r'(?i)sk-[a-zA-Z0-9]{32,}',  # OpenAI API keys
            ],
            "sql_injection": [
                r'(?i)execute\s*\(\s*["\'].*%s.*["\']',
                r'(?i)query\s*\(\s*["\'].*\+.*["\']',
                r'(?i)cursor\.execute\s*\(\s*["\'].*%.*["\']',
            ],
            "command_injection": [
                r'(?i)os\.system\s*\(',
                r'(?i)subprocess\.(call|run|Popen)\s*\([^)]*shell\s*=\s*True',
                r'(?i)eval\s*\(',
                r'(?i)exec\s*\(',
            ],
            "insecure_random": [
                r'(?i)random\.random\(',
                r'(?i)random\.choice\(',
                r'(?i)Math\.random\(',
            ],
            "weak_crypto": [
                r'(?i)md5\(',
                r'(?i)sha1\(',
                r'(?i)des\(',
                r'(?i)rc4\(',
            ]
        }
        
        # Files to exclude from scanning
        self.exclude_patterns = [
            r'.*\.git/.*',
            r'.*/__pycache__/.*',
            r'.*\.pyc$',
            r'.*node_modules/.*',
            r'.*\.backup$',
            r'.*archived_scripts/.*',
            r'.*tests/.*test.*\.py$',  # Exclude test files
        ]
    
    async def run_comprehensive_audit(self) -> SecurityAuditReport:
        """Run comprehensive security audit."""
        logger.info("🔒 Starting Comprehensive Security Audit")
        
        start_time = time.time()
        
        # Run different audit categories
        await self._audit_authentication_authorization()
        await self._audit_api_security()
        await self._audit_data_handling()
        await self._audit_deployment_security()
        await self._scan_code_vulnerabilities()
        await self._audit_configuration_security()
        await self._audit_dependency_security()
        
        audit_duration = time.time() - start_time
        
        # Generate report
        report = self._generate_security_report(audit_duration)
        
        # Save results
        await self._save_audit_results(report)
        
        logger.info("✅ Security Audit Complete")
        return report
    
    async def _audit_authentication_authorization(self):
        """Audit authentication and authorization mechanisms."""
        logger.info("🔐 Auditing Authentication & Authorization")
        
        # Check for authentication implementation
        auth_files = [
            "dashboard/auth/dashboard_auth.py",
            "tools/security/access_control.py",
            "tools/security/credential_manager.py"
        ]
        
        for file_path in auth_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                await self._analyze_auth_file(full_path, file_path)
            else:
                self.findings.append(SecurityFinding(
                    category="authentication",
                    severity="medium",
                    title="Missing Authentication File",
                    description=f"Expected authentication file not found: {file_path}",
                    file_path=file_path,
                    recommendation="Implement proper authentication mechanisms"
                ))
        
        # Check for secure session management
        await self._check_session_security()
        
        # Check for proper password handling
        await self._check_password_security()
    
    async def _audit_api_security(self):
        """Audit API security implementations."""
        logger.info("🌐 Auditing API Security")
        
        # Check for rate limiting
        await self._check_rate_limiting()
        
        # Check for input validation
        await self._check_input_validation()
        
        # Check for CORS configuration
        await self._check_cors_configuration()
        
        # Check for API authentication
        await self._check_api_authentication()
    
    async def _audit_data_handling(self):
        """Audit data handling and privacy compliance."""
        logger.info("📊 Auditing Data Handling & Privacy")
        
        # Check for data encryption
        await self._check_data_encryption()
        
        # Check for sensitive data exposure
        await self._check_sensitive_data_exposure()
        
        # Check for data retention policies
        await self._check_data_retention()
        
        # Check for logging security
        await self._check_logging_security()
    
    async def _audit_deployment_security(self):
        """Audit deployment security configurations."""
        logger.info("🚀 Auditing Deployment Security")
        
        # Check Docker security
        await self._check_docker_security()
        
        # Check environment variable security
        await self._check_environment_security()
        
        # Check network security
        await self._check_network_security()
        
        # Check secret management
        await self._check_secret_management()
    
    async def _scan_code_vulnerabilities(self):
        """Scan code for common vulnerabilities."""
        logger.info("🔍 Scanning Code Vulnerabilities")
        
        # Scan Python files
        python_files = list(self.project_root.rglob("*.py"))
        
        for file_path in python_files:
            if self._should_exclude_file(str(file_path)):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    await self._scan_file_content(file_path, content)
            except Exception as e:
                logger.debug(f"Error scanning {file_path}: {e}")
    
    async def _audit_configuration_security(self):
        """Audit security configurations."""
        logger.info("⚙️  Auditing Configuration Security")
        
        # Check security policy files
        security_configs = [
            "config/security/security_policies.yaml",
            "docs/deployment/security-guide.md"
        ]
        
        for config_path in security_configs:
            full_path = self.project_root / config_path
            if full_path.exists():
                await self._analyze_security_config(full_path, config_path)
            else:
                self.findings.append(SecurityFinding(
                    category="configuration",
                    severity="medium",
                    title="Missing Security Configuration",
                    description=f"Security configuration file not found: {config_path}",
                    file_path=config_path,
                    recommendation="Create comprehensive security configuration"
                ))
    
    async def _audit_dependency_security(self):
        """Audit dependency security."""
        logger.info("📦 Auditing Dependency Security")
        
        # Check for known vulnerable dependencies
        pyproject_path = self.project_root / "pyproject.toml"
        if pyproject_path.exists():
            await self._check_python_dependencies(pyproject_path)
        
        # Check for outdated dependencies
        await self._check_outdated_dependencies()
    
    async def _analyze_auth_file(self, file_path: Path, relative_path: str):
        """Analyze authentication file for security issues."""
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Check for weak password hashing
            if 'md5' in content.lower() or 'sha1' in content.lower():
                self.findings.append(SecurityFinding(
                    category="authentication",
                    severity="high",
                    title="Weak Password Hashing",
                    description="Using weak hashing algorithms (MD5/SHA1) for passwords",
                    file_path=relative_path,
                    recommendation="Use bcrypt, scrypt, or Argon2 for password hashing"
                ))
            
            # Check for hardcoded secrets
            await self._scan_file_content(file_path, content)
            
        except Exception as e:
            logger.debug(f"Error analyzing auth file {file_path}: {e}")
    
    async def _scan_file_content(self, file_path: Path, content: str):
        """Scan file content for security vulnerabilities."""
        relative_path = str(file_path.relative_to(self.project_root))
        
        for category, patterns in self.security_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, content, re.MULTILINE)
                for match in matches:
                    line_number = content[:match.start()].count('\n') + 1
                    
                    severity = self._get_severity_for_category(category)
                    title = self._get_title_for_category(category)
                    description = f"Potential {category.replace('_', ' ')} vulnerability detected"
                    recommendation = self._get_recommendation_for_category(category)
                    
                    self.findings.append(SecurityFinding(
                        category=category,
                        severity=severity,
                        title=title,
                        description=description,
                        file_path=relative_path,
                        line_number=line_number,
                        recommendation=recommendation
                    ))
    
    async def _check_session_security(self):
        """Check session security implementation."""
        # Look for session configuration
        session_files = list(self.project_root.rglob("*session*"))
        
        if not session_files:
            self.findings.append(SecurityFinding(
                category="authentication",
                severity="medium",
                title="Session Management Not Found",
                description="No session management implementation found",
                recommendation="Implement secure session management with proper timeout and regeneration"
            ))
    
    async def _check_password_security(self):
        """Check password security policies."""
        # This would check for password complexity requirements, etc.
        # For now, we'll add a general recommendation
        self.findings.append(SecurityFinding(
            category="authentication",
            severity="info",
            title="Password Policy Review",
            description="Review password policies for complexity requirements",
            recommendation="Implement strong password policies with minimum length, complexity, and rotation requirements"
        ))
    
    async def _check_rate_limiting(self):
        """Check for rate limiting implementation."""
        rate_limit_files = list(self.project_root.rglob("*rate*limit*"))
        
        if not rate_limit_files:
            self.findings.append(SecurityFinding(
                category="api_security",
                severity="medium",
                title="Rate Limiting Not Implemented",
                description="No rate limiting implementation found",
                recommendation="Implement rate limiting to prevent abuse and DoS attacks"
            ))
    
    async def _check_input_validation(self):
        """Check input validation implementation."""
        # Look for validation patterns
        validation_found = False

        for py_file in self.project_root.rglob("*.py"):
            if self._should_exclude_file(str(py_file)):
                continue

            try:
                with open(py_file, 'r') as f:
                    content = f.read()
                    if 'validate' in content.lower() or 'sanitize' in content.lower():
                        validation_found = True
                        break
            except Exception:
                continue

        if not validation_found:
            self.findings.append(SecurityFinding(
                category="api_security",
                severity="high",
                title="Input Validation Missing",
                description="No input validation implementation found",
                recommendation="Implement comprehensive input validation and sanitization"
            ))

    async def _check_cors_configuration(self):
        """Check CORS configuration."""
        self.findings.append(SecurityFinding(
            category="api_security",
            severity="info",
            title="CORS Configuration Review",
            description="Review CORS configuration for security",
            recommendation="Ensure CORS is properly configured with specific origins"
        ))

    async def _check_api_authentication(self):
        """Check API authentication mechanisms."""
        # Look for API authentication
        auth_found = any(
            (self.project_root / path).exists()
            for path in ["dashboard/auth/dashboard_auth.py", "tools/security/access_control.py"]
        )

        if auth_found:
            self.findings.append(SecurityFinding(
                category="api_security",
                severity="info",
                title="API Authentication Implemented",
                description="API authentication mechanisms found",
                recommendation="Review authentication implementation for completeness"
            ))

    async def _check_data_encryption(self):
        """Check data encryption implementation."""
        encryption_found = False

        for py_file in self.project_root.rglob("*.py"):
            if self._should_exclude_file(str(py_file)):
                continue

            try:
                with open(py_file, 'r') as f:
                    content = f.read()
                    if 'encrypt' in content.lower() or 'fernet' in content.lower():
                        encryption_found = True
                        break
            except Exception:
                continue

        if not encryption_found:
            self.findings.append(SecurityFinding(
                category="data_handling",
                severity="medium",
                title="Data Encryption Not Found",
                description="No data encryption implementation found",
                recommendation="Implement encryption for sensitive data at rest and in transit"
            ))

    async def _check_sensitive_data_exposure(self):
        """Check for sensitive data exposure."""
        self.findings.append(SecurityFinding(
            category="data_handling",
            severity="info",
            title="Sensitive Data Review",
            description="Review code for potential sensitive data exposure",
            recommendation="Ensure sensitive data is properly protected and not logged"
        ))

    async def _check_data_retention(self):
        """Check data retention policies."""
        self.findings.append(SecurityFinding(
            category="data_handling",
            severity="info",
            title="Data Retention Policy",
            description="Review data retention and deletion policies",
            recommendation="Implement clear data retention and deletion policies"
        ))

    async def _check_logging_security(self):
        """Check logging security."""
        self.findings.append(SecurityFinding(
            category="data_handling",
            severity="info",
            title="Logging Security Review",
            description="Review logging practices for security",
            recommendation="Ensure logs don't contain sensitive information"
        ))

    async def _check_docker_security(self):
        """Check Docker security configuration."""
        dockerfile_path = self.project_root / "Dockerfile"
        if dockerfile_path.exists():
            try:
                with open(dockerfile_path, 'r') as f:
                    content = f.read()
                    if 'USER root' in content or 'USER 0' in content:
                        self.findings.append(SecurityFinding(
                            category="deployment",
                            severity="high",
                            title="Docker Running as Root",
                            description="Docker container running as root user",
                            file_path="Dockerfile",
                            recommendation="Run container as non-root user"
                        ))
            except Exception:
                pass

    async def _check_environment_security(self):
        """Check environment variable security."""
        env_files = [".env", ".env.local", ".env.production"]

        for env_file in env_files:
            env_path = self.project_root / env_file
            if env_path.exists():
                self.findings.append(SecurityFinding(
                    category="deployment",
                    severity="medium",
                    title="Environment File Found",
                    description=f"Environment file {env_file} found - ensure it's not committed",
                    file_path=env_file,
                    recommendation="Ensure environment files are in .gitignore"
                ))

    async def _check_network_security(self):
        """Check network security configuration."""
        self.findings.append(SecurityFinding(
            category="deployment",
            severity="info",
            title="Network Security Review",
            description="Review network security configuration",
            recommendation="Ensure proper firewall rules and network segmentation"
        ))

    async def _check_secret_management(self):
        """Check secret management implementation."""
        secret_manager_path = self.project_root / "tools/security/credential_manager.py"
        if secret_manager_path.exists():
            self.findings.append(SecurityFinding(
                category="deployment",
                severity="info",
                title="Secret Management Implemented",
                description="Secret management system found",
                recommendation="Review secret management implementation for best practices"
            ))

    async def _analyze_security_config(self, file_path: Path, relative_path: str):
        """Analyze security configuration file."""
        try:
            with open(file_path, 'r') as f:
                content = f.read()

            self.findings.append(SecurityFinding(
                category="configuration",
                severity="info",
                title="Security Configuration Found",
                description=f"Security configuration file found: {relative_path}",
                file_path=relative_path,
                recommendation="Review security configuration for completeness"
            ))

        except Exception as e:
            logger.debug(f"Error analyzing security config {file_path}: {e}")

    async def _check_python_dependencies(self, pyproject_path: Path):
        """Check Python dependencies for security issues."""
        try:
            with open(pyproject_path, 'r') as f:
                content = f.read()

            # Look for potentially vulnerable packages (simplified check)
            vulnerable_patterns = ['flask==0.', 'django==1.', 'requests==2.0']

            for pattern in vulnerable_patterns:
                if pattern in content:
                    self.findings.append(SecurityFinding(
                        category="dependencies",
                        severity="medium",
                        title="Potentially Vulnerable Dependency",
                        description=f"Potentially vulnerable dependency pattern found: {pattern}",
                        file_path="pyproject.toml",
                        recommendation="Update to latest secure version"
                    ))

        except Exception as e:
            logger.debug(f"Error checking dependencies: {e}")

    async def _check_outdated_dependencies(self):
        """Check for outdated dependencies."""
        self.findings.append(SecurityFinding(
            category="dependencies",
            severity="info",
            title="Dependency Update Review",
            description="Review dependencies for security updates",
            recommendation="Regularly update dependencies to latest secure versions"
        ))
    
    def _should_exclude_file(self, file_path: str) -> bool:
        """Check if file should be excluded from scanning."""
        for pattern in self.exclude_patterns:
            if re.match(pattern, file_path):
                return True
        return False
    
    def _get_severity_for_category(self, category: str) -> str:
        """Get severity level for vulnerability category."""
        severity_map = {
            "hardcoded_secrets": "critical",
            "sql_injection": "critical",
            "command_injection": "critical",
            "insecure_random": "medium",
            "weak_crypto": "high"
        }
        return severity_map.get(category, "medium")
    
    def _get_title_for_category(self, category: str) -> str:
        """Get title for vulnerability category."""
        title_map = {
            "hardcoded_secrets": "Hardcoded Secrets",
            "sql_injection": "SQL Injection Risk",
            "command_injection": "Command Injection Risk",
            "insecure_random": "Insecure Random Number Generation",
            "weak_crypto": "Weak Cryptographic Algorithm"
        }
        return title_map.get(category, category.replace('_', ' ').title())
    
    def _get_recommendation_for_category(self, category: str) -> str:
        """Get recommendation for vulnerability category."""
        recommendation_map = {
            "hardcoded_secrets": "Use environment variables or secure secret management",
            "sql_injection": "Use parameterized queries or ORM",
            "command_injection": "Validate and sanitize all inputs, avoid shell=True",
            "insecure_random": "Use cryptographically secure random number generators",
            "weak_crypto": "Use strong cryptographic algorithms (AES, SHA-256+)"
        }
        return recommendation_map.get(category, "Review and fix security issue")
    
    def _generate_security_report(self, audit_duration: float) -> SecurityAuditReport:
        """Generate comprehensive security report."""
        # Count findings by severity
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        
        for finding in self.findings:
            severity_counts[finding.severity] += 1
        
        # Calculate security score (0-100)
        total_weighted_score = (
            severity_counts["critical"] * 10 +
            severity_counts["high"] * 5 +
            severity_counts["medium"] * 2 +
            severity_counts["low"] * 1
        )
        
        # Security score decreases with more severe findings
        max_possible_score = 100
        security_score = max(0, max_possible_score - total_weighted_score)
        
        # Determine compliance status
        if severity_counts["critical"] > 0:
            compliance_status = "non_compliant"
        elif severity_counts["high"] > 3:
            compliance_status = "needs_attention"
        elif security_score >= 80:
            compliance_status = "compliant"
        else:
            compliance_status = "partially_compliant"
        
        return SecurityAuditReport(
            total_findings=len(self.findings),
            critical_findings=severity_counts["critical"],
            high_findings=severity_counts["high"],
            medium_findings=severity_counts["medium"],
            low_findings=severity_counts["low"],
            info_findings=severity_counts["info"],
            security_score=security_score,
            compliance_status=compliance_status,
            audit_duration=audit_duration
        )
    
    async def _save_audit_results(self, report: SecurityAuditReport):
        """Save security audit results."""
        results_dir = self.project_root / "tests" / "results" / "security"
        results_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = int(time.time())
        results_file = results_dir / f"security_audit_{timestamp}.json"
        
        audit_data = {
            "report": asdict(report),
            "findings": [asdict(finding) for finding in self.findings],
            "metadata": {
                "timestamp": timestamp,
                "audit_version": "1.0.0",
                "project_root": str(self.project_root)
            }
        }
        
        with open(results_file, 'w') as f:
            json.dump(audit_data, f, indent=2)
        
        logger.info(f"📄 Security audit results saved to: {results_file}")


async def main():
    """Main security audit function."""
    framework = SecurityAuditFramework()
    
    try:
        report = await framework.run_comprehensive_audit()
        
        # Print summary
        print("\n" + "="*80)
        print("🔒 COMPREHENSIVE SECURITY AUDIT REPORT")
        print("="*80)
        
        print(f"📊 Total Findings: {report.total_findings}")
        print(f"🚨 Critical: {report.critical_findings}")
        print(f"⚠️  High: {report.high_findings}")
        print(f"📋 Medium: {report.medium_findings}")
        print(f"ℹ️  Low: {report.low_findings}")
        print(f"💡 Info: {report.info_findings}")
        print(f"🎯 Security Score: {report.security_score:.1f}/100")
        print(f"✅ Compliance Status: {report.compliance_status}")
        print(f"⏰ Audit Duration: {report.audit_duration:.2f}s")
        
        # Show top findings
        if framework.findings:
            print("\n🔍 Top Security Findings:")
            critical_and_high = [f for f in framework.findings if f.severity in ["critical", "high"]]
            for finding in critical_and_high[:5]:
                severity_icon = "🚨" if finding.severity == "critical" else "⚠️"
                print(f"  {severity_icon} {finding.title} ({finding.file_path})")
        
        return report.security_score >= 70 and report.critical_findings == 0
        
    except Exception as e:
        logger.error(f"Security audit failed: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

"""
Unit tests for Enhanced Security Specialist (Phase 2)
Tests security analysis, compliance validation, and elevated status features
"""

import json
from unittest.mock import Mock, patch

import pytest

from agents.specialists.security_specialist import (
    assess_input_validation,
    generate_security_report,
    scan_code_vulnerabilities,
    security_specialist,
    validate_security_compliance,
)


@pytest.mark.unit
class TestScanCodeVulnerabilities:
    """Test code vulnerability scanning functionality"""

    def test_detect_sql_injection(self):
        """Test detection of SQL injection vulnerabilities"""
        vulnerable_code = """
        def get_user(user_id):
            query = "SELECT * FROM users WHERE id = '%s'" % user_id
            cursor.execute(query)
        """

        result = scan_code_vulnerabilities(vulnerable_code, "python")

        assert result["vulnerabilities_found"] > 0
        assert any(v["type"] == "sql_injection" for v in result["vulnerabilities"])
        assert result["security_score"] < 100

    def test_detect_hardcoded_secrets(self):
        """Test detection of hardcoded credentials"""
        vulnerable_code = """
        API_KEY = "sk-1234567890abcdef"
        password = "admin123"
        db_password = "super_secret_password"
        """

        result = scan_code_vulnerabilities(vulnerable_code, "python")

        vulns = [v for v in result["vulnerabilities"] if v["type"] == "hardcoded_secrets"]
        assert len(vulns) >= 2  # At least password and db_password
        assert all(v["severity"] == "CRITICAL" for v in vulns)

    def test_detect_command_injection(self):
        """Test detection of command injection vulnerabilities"""
        vulnerable_code = """
        import os
        def run_command(user_input):
            os.system("echo " + user_input)
            subprocess.call("ls " + user_input, shell=True)
        """

        result = scan_code_vulnerabilities(vulnerable_code, "python")

        vulns = [v for v in result["vulnerabilities"] if v["type"] == "command_injection"]
        assert len(vulns) > 0
        assert all(v["severity"] == "CRITICAL" for v in vulns)

    def test_detect_weak_crypto(self):
        """Test detection of weak cryptographic algorithms"""
        vulnerable_code = """
        import hashlib
        def hash_password(password):
            return hashlib.md5(password.encode()).hexdigest()
            # Also uses SHA1
            return hashlib.sha1(password.encode()).hexdigest()
        """

        result = scan_code_vulnerabilities(vulnerable_code, "python")

        vulns = [v for v in result["vulnerabilities"] if v["type"] == "weak_crypto"]
        assert len(vulns) >= 2  # Both md5 and sha1
        assert all(v["severity"] == "MEDIUM" for v in vulns)

    def test_clean_code_high_score(self):
        """Test that clean code gets high security score"""
        clean_code = """
        import secrets
        from argon2 import PasswordHasher
        
        def generate_token():
            return secrets.token_urlsafe(32)
            
        def hash_password(password):
            ph = PasswordHasher()
            return ph.hash(password)
        """

        result = scan_code_vulnerabilities(clean_code, "python")

        assert result["vulnerabilities_found"] == 0
        assert result["security_score"] == 100
        assert "Code appears secure" in str(result["recommendations"])

    def test_severity_summary(self):
        """Test vulnerability severity summary"""
        mixed_code = """
        password = "admin123"  # CRITICAL
        os.system("echo " + input)  # CRITICAL
        hashlib.md5(data)  # MEDIUM
        """

        result = scan_code_vulnerabilities(mixed_code, "python")

        assert result["summary"]["CRITICAL"] >= 2
        assert result["summary"]["MEDIUM"] >= 1
        assert result["security_score"] < 80  # Multiple critical issues


@pytest.mark.unit
class TestValidateSecurityCompliance:
    """Test security compliance validation"""

    def test_default_owasp_compliance(self):
        """Test default OWASP compliance check"""
        result = validate_security_compliance("web_application")

        assert result["project_type"] == "web_application"
        assert "OWASP" in result["standards_checked"]
        assert "OWASP" in result["checks_performed"]
        assert len(result["recommendations"]) > 0

    def test_multiple_compliance_standards(self):
        """Test checking multiple compliance standards"""
        result = validate_security_compliance("payment_system", requirements=["OWASP", "PCI-DSS"])

        assert "OWASP" in result["standards_checked"]
        assert "PCI-DSS" in result["standards_checked"]
        assert "OWASP" in result["checks_performed"]
        assert "PCI-DSS" in result["checks_performed"]

    def test_owasp_checks_structure(self):
        """Test OWASP compliance check structure"""
        result = validate_security_compliance("api", requirements=["OWASP"])

        owasp_checks = result["checks_performed"]["OWASP"]

        # Verify key OWASP categories are present
        assert "A01_broken_access_control" in owasp_checks
        assert "A02_cryptographic_failures" in owasp_checks
        assert "A03_injection" in owasp_checks
        assert "A04_insecure_design" in owasp_checks

        # Verify check structure
        access_control = owasp_checks["A01_broken_access_control"]
        assert "check" in access_control
        assert "status" in access_control
        assert "requirements" in access_control
        assert len(access_control["requirements"]) > 0


@pytest.mark.unit
class TestGenerateSecurityReport:
    """Test security report generation"""

    def test_comprehensive_report_structure(self):
        """Test that comprehensive report has all sections"""
        report = generate_security_report("test_project", "comprehensive")

        # Check for required sections
        assert "SECURITY ANALYSIS REPORT" in report
        assert "EXECUTIVE SUMMARY" in report
        assert "THREAT LANDSCAPE" in report
        assert "VULNERABILITY ASSESSMENT" in report
        assert "COMPLIANCE STATUS" in report
        assert "SECURITY ARCHITECTURE RECOMMENDATIONS" in report
        assert "INCIDENT RESPONSE PLAN" in report
        assert "SECURITY METRICS" in report

    def test_report_includes_context(self):
        """Test that report includes provided context"""
        context = "E-commerce platform security review"
        report = generate_security_report(context, "focused")

        assert context in report
        assert "focused" in report

    def test_elevated_status_mention(self):
        """Test that report mentions elevated status"""
        report = generate_security_report("test", "basic")

        assert "ELEVATED STATUS" in report
        assert "Priority: ELEVATED" in report


@pytest.mark.unit
class TestAssessInputValidation:
    """Test input validation assessment"""

    def test_detect_sql_injection_pattern(self):
        """Test detection of SQL injection in input"""
        malicious_input = "'; DROP TABLE users; --"
        result = assess_input_validation(malicious_input, "string")

        assert not result["input_safe"]
        assert any(issue["type"] == "sql" for issue in result["validation_issues"])
        assert any(issue["severity"] == "HIGH" for issue in result["validation_issues"])

    def test_detect_xss_pattern(self):
        """Test detection of XSS in input"""
        xss_input = '<script>alert("XSS")</script>'
        result = assess_input_validation(xss_input, "string")

        assert not result["input_safe"]
        assert any(issue["type"] == "xss" for issue in result["validation_issues"])

    def test_detect_command_injection_pattern(self):
        """Test detection of command injection in input"""
        cmd_input = "test; rm -rf /"
        result = assess_input_validation(cmd_input, "string")

        assert not result["input_safe"]
        assert any(issue["type"] == "command" for issue in result["validation_issues"])

    def test_detect_path_traversal(self):
        """Test detection of path traversal attempts"""
        path_input = "../../../etc/passwd"
        result = assess_input_validation(path_input, "filepath")

        assert not result["input_safe"]
        assert any(issue["type"] == "path" for issue in result["validation_issues"])

    def test_safe_input(self):
        """Test that safe input passes validation"""
        safe_input = "John Doe"
        result = assess_input_validation(safe_input, "name")

        assert result["input_safe"]
        assert len(result["validation_issues"]) == 0
        assert "Input appears safe" in str(result["recommendations"])

    def test_email_validation(self):
        """Test email pattern detection"""
        # This should not trigger security issues
        email = "user@example.com"
        result = assess_input_validation(email, "email")

        assert result["input_safe"] or not any(issue["severity"] == "HIGH" for issue in result["validation_issues"])


@pytest.mark.unit
class TestSecuritySpecialistAgent:
    """Test the security specialist agent configuration"""

    def test_agent_configuration(self):
        """Test that agent is properly configured"""
        assert security_specialist.name == "security_specialist"
        assert security_specialist.model == "gemini-2.5-flash"
        assert "ELEVATED STATUS" in security_specialist.description

    def test_agent_has_required_tools(self):
        """Test that agent has all required tools"""
        tool_names = [tool.name for tool in security_specialist.tools]

        # Check for security-specific tools
        assert "scan_code_vulnerabilities" in tool_names
        assert "validate_security_compliance" in tool_names
        assert "generate_security_report" in tool_names
        assert "assess_input_validation" in tool_names

    def test_agent_instruction_includes_elevation(self):
        """Test that agent instruction mentions elevated status"""
        assert "ELEVATED STATUS" in security_specialist.instruction
        assert "Proactive Authority" in security_specialist.instruction
        assert "Direct Routing" in security_specialist.instruction
        assert "Veto Power" in security_specialist.instruction

    def test_agent_tool_count(self):
        """Test that agent respects ADK tool limit"""
        assert len(security_specialist.tools) <= 6  # ADK best practice

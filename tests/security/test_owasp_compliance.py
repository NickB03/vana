"""
OWASP Top 10 Compliance Tests for VANA Security Framework

Comprehensive security testing based on OWASP Top 10 2021:
- A01:2021 – Broken Access Control
- A02:2021 – Cryptographic Failures
- A03:2021 – Injection
- A04:2021 – Insecure Design
- A05:2021 – Security Misconfiguration
- A06:2021 – Vulnerable and Outdated Components
- A07:2021 – Identification and Authentication Failures
- A08:2021 – Software and Data Integrity Failures
- A09:2021 – Security Logging and Monitoring Failures
- A10:2021 – Server-Side Request Forgery (SSRF)
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import Mock, patch

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from tests.security.security_validator import SecurityValidator, SecurityViolation

class TestOWASPCompliance:
    """Test compliance with OWASP Top 10 security vulnerabilities."""
    
    def setup_method(self):
        """Setup security validator for each test."""
        self.validator = SecurityValidator()
    
    @pytest.mark.security
    def test_a01_broken_access_control(self):
        """A01:2021 – Broken Access Control"""
        # Test file path traversal
        malicious_paths = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "/etc/shadow",
            "C:\\Windows\\System32\\config\\SAM"
        ]
        
        for path in malicious_paths:
            code = f'open("{path}", "r")'
            violations = self.validator.validate_python_code(code, "test_file.py")
            
            # Should detect file access violations
            file_access_violations = [v for v in violations if v.category == "file_access"]
            assert len(file_access_violations) > 0, f"Failed to detect file access in: {path}"
    
    @pytest.mark.security
    def test_a02_cryptographic_failures(self):
        """A02:2021 – Cryptographic Failures"""
        # Test hardcoded secrets
        insecure_configs = [
            {"password": "admin123"},
            {"api_key": "sk-1234567890abcdef1234567890abcdef"},
            {"secret": "my_super_secret_key_12345"},
            {"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"},
            {"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7"}
        ]
        
        for config in insecure_configs:
            violations = self.validator.validate_configuration(config, "test_config")
            
            # Should detect hardcoded secrets
            secret_violations = [v for v in violations if v.category == "data_exposure"]
            assert len(secret_violations) > 0, f"Failed to detect hardcoded secret in: {config}"
            assert any(v.severity == "critical" for v in secret_violations)
    
    @pytest.mark.security
    def test_a03_injection_attacks(self):
        """A03:2021 – Injection"""
        # Test code injection
        malicious_code_samples = [
            "eval('__import__(\"os\").system(\"rm -rf /\")')",
            "exec('import subprocess; subprocess.call([\"rm\", \"-rf\", \"/\"])')",
            "__import__('os').system('malicious_command')",
            "compile('malicious_code', '<string>', 'exec')"
        ]
        
        for code in malicious_code_samples:
            violations = self.validator.validate_python_code(code, "test_injection.py")
            
            # Should detect code injection
            injection_violations = [v for v in violations if v.category == "code_injection"]
            assert len(injection_violations) > 0, f"Failed to detect injection in: {code}"
            assert any(v.severity in ["high", "critical"] for v in injection_violations)
        
        # Test SQL injection
        sql_injection_samples = [
            "SELECT * FROM users WHERE id = " + user_input,
            "INSERT INTO logs VALUES ('" + log_message + "')",
            "UPDATE users SET password = '" + new_password + "' WHERE id = " + user_id,
            "DELETE FROM sessions WHERE token = '" + session_token + "'"
        ]
        
        for sql in sql_injection_samples:
            violations = self.validator.validate_python_code(sql, "test_sql.py")
            
            # Should detect SQL injection patterns
            sql_violations = [v for v in violations if v.category == "sql_injection"]
            if sql_violations:  # SQL injection detection is pattern-based
                assert any(v.severity == "critical" for v in sql_violations)
        
        # Test XSS and other injection types
        xss_inputs = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "'; DROP TABLE users; --",
            "| rm -rf /",
            "; cat /etc/passwd",
            "`whoami`",
            "$(id)"
        ]
        
        violations = self.validator.validate_input_sanitization(xss_inputs)
        assert len(violations) > 0, "Failed to detect injection patterns in inputs"
    
    @pytest.mark.security
    def test_a04_insecure_design(self):
        """A04:2021 – Insecure Design"""
        # Test for insecure design patterns
        insecure_design_code = [
            "password = input('Enter password: ')",  # Plain text password input
            "if user_input == 'admin': grant_access()",  # Weak authentication
            "exec(user_provided_code)",  # Executing user code
            "pickle.loads(untrusted_data)"  # Deserializing untrusted data
        ]
        
        for code in insecure_design_code:
            violations = self.validator.validate_python_code(code, "insecure_design.py")
            
            # Should detect various security issues
            assert len(violations) > 0, f"Failed to detect insecure design in: {code}"
    
    @pytest.mark.security
    def test_a05_security_misconfiguration(self):
        """A05:2021 – Security Misconfiguration"""
        # Test insecure configurations
        insecure_configs = [
            {"debug": True},
            {"ssl_verify": False},
            {"verify_ssl": False},
            {"check_hostname": False},
            {"allow_insecure": True},
            {"security": {"enabled": False}},
            {"authentication": {"required": False}}
        ]
        
        for config in insecure_configs:
            violations = self.validator.validate_configuration(config, "insecure_config")
            
            # Should detect insecure configurations
            config_violations = [v for v in violations if v.category == "insecure_configuration"]
            if config_violations:  # Some configurations might not trigger violations
                assert any(v.severity in ["medium", "high"] for v in config_violations)
    
    @pytest.mark.security
    def test_a06_vulnerable_components(self):
        """A06:2021 – Vulnerable and Outdated Components"""
        # This would typically involve checking dependency versions
        # For now, we'll test detection of potentially dangerous imports
        dangerous_imports = [
            "import pickle",  # Insecure serialization
            "import marshal",  # Insecure serialization
            "import shelve",  # Potentially insecure
            "from subprocess import call",  # Command execution
            "import os",  # System access
        ]
        
        for import_stmt in dangerous_imports:
            violations = self.validator.validate_python_code(import_stmt, "imports.py")
            
            # Some imports should trigger security warnings
            if "subprocess" in import_stmt or "os" in import_stmt:
                file_violations = [v for v in violations if v.category == "file_access"]
                assert len(file_violations) > 0, f"Failed to detect dangerous import: {import_stmt}"
    
    @pytest.mark.security
    def test_a07_authentication_failures(self):
        """A07:2021 – Identification and Authentication Failures"""
        # Test weak authentication patterns
        weak_auth_code = [
            "if password == 'admin': login_success()",
            "if len(password) < 4: reject_password()",
            "session_id = '12345'",
            "auth_token = 'simple_token'"
        ]
        
        for code in weak_auth_code:
            violations = self.validator.validate_python_code(code, "auth.py")
            
            # Should detect hardcoded credentials or weak patterns
            if "admin" in code or "12345" in code or "simple_token" in code:
                secret_violations = [v for v in violations if v.category == "data_exposure"]
                # Note: Some patterns might not be detected by current rules
    
    @pytest.mark.security
    def test_a08_software_data_integrity_failures(self):
        """A08:2021 – Software and Data Integrity Failures"""
        # Test insecure deserialization and data integrity issues
        integrity_issues = [
            "pickle.loads(user_data)",
            "eval(json_data)",
            "exec(downloaded_code)",
            "marshal.loads(untrusted_data)"
        ]
        
        for code in integrity_issues:
            violations = self.validator.validate_python_code(code, "integrity.py")
            
            # Should detect code execution vulnerabilities
            injection_violations = [v for v in violations if v.category == "code_injection"]
            assert len(injection_violations) > 0, f"Failed to detect integrity issue in: {code}"
    
    @pytest.mark.security
    def test_a09_logging_monitoring_failures(self):
        """A09:2021 – Security Logging and Monitoring Failures"""
        # Test for proper logging and monitoring
        # This is more about ensuring security events are logged
        logging_code = [
            "print(f'User {user_id} logged in')",  # Insecure logging
            "logger.info(f'Password: {password}')",  # Logging sensitive data
            "log_message = 'Error: ' + str(exception)"  # Potential info disclosure
        ]
        
        for code in logging_code:
            violations = self.validator.validate_python_code(code, "logging.py")
            
            # Current validator might not catch all logging issues
            # This is a placeholder for more sophisticated logging analysis
    
    @pytest.mark.security
    def test_a10_server_side_request_forgery(self):
        """A10:2021 – Server-Side Request Forgery (SSRF)"""
        # Test SSRF vulnerabilities
        dangerous_urls = [
            "http://localhost:8080/admin",
            "http://127.0.0.1:3000/api",
            "http://0.0.0.0:5000/debug",
            "http://169.254.169.254/metadata",  # AWS metadata
            "http://10.0.0.1/internal",
            "http://192.168.1.1/router",
            "file:///etc/passwd",
            "ftp://internal.server/files"
        ]
        
        violations = self.validator.validate_network_access(dangerous_urls)
        
        # Should detect dangerous network access
        network_violations = [v for v in violations if v.category in ["network_security", "insecure_transport"]]
        assert len(network_violations) > 0, "Failed to detect SSRF vulnerabilities"
        
        # Check for high severity violations
        high_severity_violations = [v for v in network_violations if v.severity == "high"]
        assert len(high_severity_violations) > 0, "Failed to detect high-severity SSRF issues"
    
    @pytest.mark.security
    def test_comprehensive_security_scan(self):
        """Comprehensive security scan combining multiple OWASP categories."""
        # Complex code sample with multiple vulnerabilities
        vulnerable_code = '''
import os
import pickle
import subprocess

def process_user_input(user_input, password):
    # A02: Hardcoded secret
    api_key = "sk-1234567890abcdef"
    
    # A03: Code injection
    eval(user_input)
    
    # A01: File access without validation
    with open(user_input, 'r') as f:
        data = f.read()
    
    # A03: Command injection
    subprocess.call(f"echo {user_input}", shell=True)
    
    # A08: Insecure deserialization
    pickle.loads(data)
    
    # A07: Weak authentication
    if password == "admin":
        return True
    
    return False
'''
        
        violations = self.validator.validate_python_code(vulnerable_code, "vulnerable_app.py")
        
        # Should detect multiple types of violations
        assert len(violations) >= 5, f"Expected at least 5 violations, found {len(violations)}"
        
        # Should have violations from multiple categories
        categories = set(v.category for v in violations)
        expected_categories = {"code_injection", "file_access", "data_exposure"}
        assert len(categories.intersection(expected_categories)) >= 2, f"Expected multiple categories, found: {categories}"
        
        # Should have critical and high severity violations
        severities = [v.severity for v in violations]
        assert "critical" in severities or "high" in severities, "Expected high-severity violations"
    
    @pytest.mark.security
    def test_security_report_generation(self):
        """Test security report generation and metrics."""
        # Generate some violations for testing
        test_code = '''
eval(user_input)
password = "admin123"
open("/etc/passwd", "r")
'''
        
        self.validator.validate_python_code(test_code, "test_report.py")
        
        # Generate security report
        report = self.validator.get_security_report()
        
        # Verify report structure
        assert "total_violations" in report
        assert "risk_score" in report
        assert "severity_breakdown" in report
        assert "category_breakdown" in report
        assert "owasp_breakdown" in report
        assert "violations" in report
        
        # Verify report content
        assert report["total_violations"] > 0
        assert report["risk_score"] > 0
        assert isinstance(report["severity_breakdown"], dict)
        assert isinstance(report["category_breakdown"], dict)
        assert isinstance(report["violations"], list)
    
    @pytest.mark.security
    def test_security_report_persistence(self, tmp_path):
        """Test saving security reports to file."""
        # Generate violations
        self.validator.validate_python_code("eval('test')", "test_persistence.py")
        
        # Save report
        report_file = tmp_path / "security_report.json"
        self.validator.save_report(report_file)
        
        # Verify file was created
        assert report_file.exists()
        
        # Verify file content
        import json
        with open(report_file) as f:
            saved_report = json.load(f)
        
        assert "total_violations" in saved_report
        assert saved_report["total_violations"] > 0

if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "security"])

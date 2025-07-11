"""
Unit tests for Security Specialist (Phase 3)
Tests vulnerability scanning and security analysis tools
"""

import pytest
from agents.specialists.security_tools import (
    scan_security_vulnerabilities,
    generate_security_report,
    check_security_headers,
    analyze_authentication_security
)


class TestSecurityTools:
    """Test suite for security analysis tools"""
    
    def test_scan_sql_injection_vulnerability(self):
        """Test SQL injection detection"""
        code = '''
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    cursor.execute(query)
    return cursor.fetchone()
'''
        result = scan_security_vulnerabilities(code, "python")
        
        assert "Security Vulnerabilities Found" in result
        assert "SQL Injection" in result
        assert "HIGH SEVERITY" in result
        assert "Line 3" in result
    
    def test_scan_command_injection(self):
        """Test command injection detection"""
        code = '''
import os
def run_command(user_input):
    os.system(f"echo {user_input}")
'''
        result = scan_security_vulnerabilities(code, "python")
        
        assert "Command Injection Risk" in result
        assert "HIGH" in result
        assert "os.system" in result
    
    def test_scan_hardcoded_secrets(self):
        """Test hardcoded secret detection"""
        code = '''
API_KEY = "sk-1234567890abcdef"
password = "admin123"
database_url = "postgresql://user:pass@localhost/db"
'''
        result = scan_security_vulnerabilities(code, "python")
        
        assert "Hardcoded Secret" in result
        assert "HIGH" in result
        assert "password" in result.lower()
    
    def test_scan_weak_crypto(self):
        """Test weak cryptography detection"""
        code = '''
import hashlib
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()
'''
        result = scan_security_vulnerabilities(code, "python")
        
        assert "Weak Hash Function" in result
        assert "md5" in result
    
    def test_scan_path_traversal(self):
        """Test path traversal detection"""
        code = '''
def read_file(filename):
    with open("/var/data/" + filename, 'r') as f:
        return f.read()
'''
        result = scan_security_vulnerabilities(code, "python")
        
        assert "Path Traversal Risk" in result
        assert "MEDIUM" in result
    
    def test_scan_javascript_xss(self):
        """Test XSS detection in JavaScript"""
        code = '''
function displayUser(name) {
    document.getElementById('user').innerHTML = name;
}
'''
        result = scan_security_vulnerabilities(code, "javascript")
        
        assert "XSS Risk" in result
        assert "innerHTML" in result
        assert "HIGH" in result
    
    def test_scan_no_vulnerabilities(self):
        """Test code with no vulnerabilities"""
        code = '''
def add_numbers(a, b):
    return a + b

def get_user_safe(user_id):
    query = "SELECT * FROM users WHERE id = ?"
    cursor.execute(query, (user_id,))
    return cursor.fetchone()
'''
        result = scan_security_vulnerabilities(code, "python")
        
        assert "No security vulnerabilities detected" in result
    
    def test_generate_security_report_with_issues(self):
        """Test security report generation"""
        scan_results = """## Security Vulnerabilities Found
### HIGH SEVERITY (2 issues)
- Line 5: SQL Injection Risk
- Line 10: Hardcoded Secret
"""
        result = generate_security_report(scan_results, "Web application security scan")
        
        assert "Security Assessment Report" in result
        assert "Web application security scan" in result
        assert "Remediation Guidelines" in result
        assert "For SQL Injection" in result
        assert "Parameterized queries" in result
    
    def test_check_security_headers_nginx(self):
        """Test security headers check for nginx config"""
        config = '''
server {
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000" always;
}
'''
        result = check_security_headers(config, "nginx")
        
        assert "Security Headers Assessment" in result
        assert "Headers Found" in result
        assert "X-Frame-Options" in result
        assert "Missing Headers" in result
        assert "Content-Security-Policy" in result
    
    def test_check_security_headers_express(self):
        """Test security headers check for Express.js"""
        config = '''
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"]
        }
    }
}));
'''
        result = check_security_headers(config, "express")
        
        assert "Security Headers Assessment" in result
        assert "contentSecurityPolicy" in result or "Content-Security-Policy" in result
    
    def test_check_security_headers_score(self):
        """Test security headers scoring"""
        config = '''
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
'''
        result = check_security_headers(config, "nginx")
        
        assert "Security Headers Score:" in result
        assert "%" in result
        # With 2 out of 7 headers, score should be low
        assert "Warning" in result or "Critical" in result
    
    def test_analyze_authentication_plain_text(self):
        """Test plain text password detection"""
        code = '''
def check_password(input_password):
    if input_password == "secret123":
        return True
    return False
'''
        result = analyze_authentication_security(code, "python")
        
        assert "Authentication Security Analysis" in result
        assert "Plain text password comparison" in result
        assert "HIGH" in result
    
    def test_analyze_authentication_weak_hashing(self):
        """Test weak password hashing detection"""
        code = '''
import hashlib
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()
'''
        result = analyze_authentication_security(code, "python")
        
        assert "MD5 for password hashing" in result
        assert "HIGH" in result
    
    def test_analyze_authentication_jwt_issues(self):
        """Test JWT security issues"""
        code = '''
import jwt
def verify_token(token):
    return jwt.decode(token, SECRET_KEY, verify=False)
'''
        result = analyze_authentication_security(code, "python")
        
        assert "JWT verification disabled" in result
        assert "HIGH" in result
    
    def test_analyze_authentication_best_practices(self):
        """Test that best practices are included"""
        code = "# Some authentication code"
        result = analyze_authentication_security(code, "python")
        
        assert "Best Practices" in result
        assert "bcrypt" in result or "Argon2" in result
        assert "MFA" in result or "Multi-factor" in result


class TestSecurityEdgeCases:
    """Test edge cases and error conditions"""
    
    def test_scan_empty_code(self):
        """Test scanning empty code"""
        result = scan_security_vulnerabilities("", "python")
        assert "No security vulnerabilities detected" in result
    
    def test_scan_unsupported_language(self):
        """Test scanning unsupported language"""
        code = "some code"
        result = scan_security_vulnerabilities(code, "cobol")
        
        # Should still try to scan with basic patterns
        assert "Security Vulnerabilities" in result or "No security vulnerabilities" in result
    
    def test_scan_multiline_vulnerabilities(self):
        """Test detection across multiple lines"""
        code = '''
query = "SELECT * FROM users " + \\
        "WHERE username = '" + username + "'" + \\
        " AND password = '" + password + "'"
'''
        result = scan_security_vulnerabilities(code, "python")
        
        assert "SQL" in result
        assert "HIGH" in result
    
    def test_security_headers_empty_config(self):
        """Test empty configuration file"""
        result = check_security_headers("", "nginx")
        
        assert "Missing Headers" in result
        assert "7" in result  # Should show all headers as missing
    
    def test_authentication_mixed_issues(self):
        """Test multiple authentication issues"""
        code = '''
password = "admin123"  # Hardcoded
if user_password == password:  # Plain text comparison
    session['user'] = user_id  # Session issue
    jwt.encode(payload, key, algorithm='HS256')  # Weak JWT
'''
        result = analyze_authentication_security(code, "python")
        
        # Should detect multiple issues
        assert result.count("HIGH") >= 2
        assert "Plain text" in result
    
    def test_large_file_performance(self):
        """Test performance with large code files"""
        # Generate large code file
        code = "\n".join([f"var_{i} = {i}" for i in range(1000)])
        code += '\npassword = "secret123"'  # Add vulnerability at end
        
        result = scan_security_vulnerabilities(code, "python")
        
        # Should still find the vulnerability
        assert "Hardcoded Secret" in result
        assert "Line 1001" in result
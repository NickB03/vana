"""
Security Specialist Tools - ADK Aligned Implementation

Synchronous security analysis tools following Google ADK patterns.
Focuses on vulnerability detection and security best practices.
"""

import ast
import json
import re
from pathlib import Path
from typing import Dict, List, Tuple


def scan_security_vulnerabilities(code: str, language: str = "python") -> str:
    """
    Scan code for common security vulnerabilities.

    Args:
        code: Source code to analyze
        language: Programming language (python, javascript, etc.)

    Returns:
        Security vulnerability report
    """
    vulnerabilities = []
    lines = code.split("\n")

    # Python-specific patterns
    if language.lower() == "python":
        patterns = [
            # SQL Injection
            (r"(execute|executemany)\s*\([^)]*%[sdf]", "SQL Injection Risk", "HIGH"),
            (r'(execute|executemany)\s*\([^)]*\+\s*["\']', "SQL Injection Risk", "HIGH"),
            (r'f["\']\s*.*SELECT.*\{.*\}.*["\']', "SQL Injection via f-string", "HIGH"),
            (r'query\s*=\s*["\'].*["\'].*\+', "SQL Query Concatenation", "HIGH"),
            # Command Injection
            (r"os\.system\s*\([^)]*\+", "Command Injection Risk", "HIGH"),
            (r"subprocess\.\w+\s*\([^)]*shell\s*=\s*True", "Shell Injection Risk", "HIGH"),
            (r"eval\s*\(", "Code Injection via eval()", "HIGH"),
            (r"exec\s*\(", "Code Injection via exec()", "HIGH"),
            # Path Traversal
            (r"open\s*\([^)]*\+[^)]*\)", "Path Traversal Risk", "MEDIUM"),
            (r"\.\./", "Directory Traversal Pattern", "MEDIUM"),
            # Hardcoded Secrets
            (r'(password|secret|api_key|token)\s*=\s*["\'][^"\']+["\']', "Hardcoded Secret", "HIGH"),
            (r'(AWS|AZURE|GCP)_[A-Z_]*KEY\s*=\s*["\']', "Cloud Provider Key", "HIGH"),
            # Weak Crypto
            (r"from\s+Crypto\.Cipher\s+import\s+(DES|RC4)", "Weak Encryption Algorithm", "HIGH"),
            (r"hashlib\.(md5|sha1)\s*\(", "Weak Hash Function", "MEDIUM"),
            (r"random\.\w+.*password|secret", "Weak Random for Security", "HIGH"),
            # XXE
            (r"etree\.parse\s*\([^)]*\)", "XML External Entity Risk", "MEDIUM"),
            (r"XMLParser\s*\([^)]*resolve_entities\s*=\s*True", "XXE Enabled", "HIGH"),
            # Insecure Deserialization
            (r"pickle\.loads?\s*\(", "Insecure Deserialization", "HIGH"),
            (r"yaml\.load\s*\([^)]*Loader\s*=\s*yaml\.Loader", "Unsafe YAML Loading", "HIGH"),
            (r"yaml\.load\s*\([^,)]*\)", "Potentially Unsafe YAML", "MEDIUM"),
            # SSRF
            (r"requests\.(get|post)\s*\([^)]*\+", "SSRF Risk - URL Concatenation", "MEDIUM"),
            (r"urllib.*urlopen\s*\([^)]*\+", "SSRF Risk - URL Manipulation", "MEDIUM"),
        ]

        for i, line in enumerate(lines, 1):
            for pattern, desc, severity in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    vulnerabilities.append({"line": i, "type": desc, "severity": severity, "code": line.strip()})

    # JavaScript patterns
    elif language.lower() in ["javascript", "js", "typescript", "ts"]:
        patterns = [
            # XSS
            (r"innerHTML\s*=", "XSS Risk - innerHTML", "HIGH"),
            (r"document\.write\s*\(", "XSS Risk - document.write", "HIGH"),
            (r"eval\s*\(", "Code Injection via eval", "HIGH"),
            # SQL Injection
            (r"query.*\+.*(?:req\.|body\.|params\.)", "SQL Injection Risk", "HIGH"),
            # Command Injection
            (r"exec\s*\(.*\+", "Command Injection Risk", "HIGH"),
            (r"spawn\s*\(.*\+", "Command Injection Risk", "HIGH"),
            # Hardcoded Secrets
            (r'(apiKey|secret|password)\s*[:=]\s*["\'][^"\']+["\']', "Hardcoded Secret", "HIGH"),
        ]

        for i, line in enumerate(lines, 1):
            for pattern, desc, severity in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    vulnerabilities.append({"line": i, "type": desc, "severity": severity, "code": line.strip()})

    # Generate report
    if vulnerabilities:
        report = "## Security Vulnerabilities Found\n\n"

        # Group by severity
        high = [v for v in vulnerabilities if v["severity"] == "HIGH"]
        medium = [v for v in vulnerabilities if v["severity"] == "MEDIUM"]
        low = [v for v in vulnerabilities if v["severity"] == "LOW"]

        if high:
            report += f"### 🔴 HIGH SEVERITY ({len(high)} issues)\n"
            for v in high[:5]:  # Show first 5
                report += f"- **Line {v['line']}**: {v['type']}\n"
                report += f"  ```{language}\n  {v['code']}\n  ```\n"

        if medium:
            report += f"\n### 🟡 MEDIUM SEVERITY ({len(medium)} issues)\n"
            for v in medium[:3]:  # Show first 3
                report += f"- **Line {v['line']}**: {v['type']}\n"
                report += f"  ```{language}\n  {v['code']}\n  ```\n"

        if low:
            report += f"\n### 🟢 LOW SEVERITY ({len(low)} issues)\n"
            report += f"- {len(low)} low severity issues found\n"

        # Add totals
        report += f"\n### Summary\n"
        report += f"- Total vulnerabilities: {len(vulnerabilities)}\n"
        report += f"- High: {len(high)}, Medium: {len(medium)}, Low: {len(low)}\n"

        return report
    else:
        return "✅ No security vulnerabilities detected in the provided code."


def generate_security_report(scan_results: str, context: str = "") -> str:
    """
    Generate comprehensive security report with remediation steps.

    Args:
        scan_results: Previous scan results
        context: Additional context about the code/project

    Returns:
        Detailed security report with recommendations
    """
    report = f"""# Security Assessment Report

**Context**: {context if context else "General Security Scan"}
**Date**: December 2024

{scan_results}

## Security Best Practices

### 1. Input Validation
- **Always validate user inputs**: Never trust data from users
- **Use allowlists over denylists**: Define what's allowed, reject everything else
- **Sanitize before use**: Clean data before processing or storage
- **Type checking**: Ensure data types match expectations

### 2. Authentication & Authorization
- **Strong password policies**: Minimum 12 characters, complexity requirements
- **Multi-factor authentication**: Implement 2FA/MFA where possible
- **Least privilege principle**: Users get only necessary permissions
- **Session management**: Secure session handling with timeouts

### 3. Data Protection
- **Encryption at rest**: Use AES-256 or stronger
- **Encryption in transit**: TLS 1.3 for all communications
- **Secure key management**: Never hardcode keys, use vaults
- **Data minimization**: Only collect necessary data

### 4. Secure Coding
- **Parameterized queries**: Prevent SQL injection
- **Output encoding**: Prevent XSS attacks
- **Secure dependencies**: Keep libraries updated
- **Error handling**: Don't expose sensitive info in errors

## Remediation Guidelines

### For SQL Injection
```python
# Bad
query = f"SELECT * FROM users WHERE id = {user_id}"

# Good
query = "SELECT * FROM users WHERE id = ?"
cursor.execute(query, (user_id,))
```

### For Command Injection
```python
# Bad
os.system(f"process {filename}")

# Good
subprocess.run(["process", filename], check=True)
```

### For Hardcoded Secrets
```python
# Bad
api_key = "sk-1234567890abcdef"

# Good
import os
api_key = os.environ.get("API_KEY")
```

## Next Steps
1. **Immediate**: Fix all HIGH severity issues
2. **Short-term**: Address MEDIUM severity issues
3. **Ongoing**: Implement security testing in CI/CD
4. **Training**: Security awareness for development team

## Tools & Resources
- **Static Analysis**: Use bandit, semgrep, or similar
- **Dependency Scanning**: safety, snyk, or dependabot
- **Security Headers**: securityheaders.com
- **OWASP**: Follow OWASP Top 10 guidelines"""

    return report


def check_security_headers(config_content: str, file_type: str = "nginx") -> str:
    """
    Check security headers in configuration files.

    Args:
        config_content: Configuration file content
        file_type: Type of config (nginx, apache, express, etc.)

    Returns:
        Security headers assessment
    """
    headers_found = []
    headers_missing = []

    # Essential security headers
    essential_headers = {
        "X-Frame-Options": "Prevents clickjacking attacks",
        "X-Content-Type-Options": "Prevents MIME type sniffing",
        "Strict-Transport-Security": "Forces HTTPS connections",
        "Content-Security-Policy": "Controls resource loading",
        "X-XSS-Protection": "XSS filter (legacy but still useful)",
        "Referrer-Policy": "Controls referrer information",
        "Permissions-Policy": "Controls browser features",
    }

    # Check for headers based on file type
    for header, description in essential_headers.items():
        header_lower = header.lower().replace("-", "_")
        if (
            header in config_content
            or header_lower in config_content.lower()
            or header.replace("-", "") in config_content
        ):
            headers_found.append((header, description))
        else:
            headers_missing.append((header, description))

    # Generate report
    report = "## Security Headers Assessment\n\n"

    if headers_found:
        report += f"### ✅ Headers Found ({len(headers_found)})\n"
        for header, desc in headers_found:
            report += f"- **{header}**: {desc}\n"

    if headers_missing:
        report += f"\n### ❌ Missing Headers ({len(headers_missing)})\n"
        for header, desc in headers_missing:
            report += f"- **{header}**: {desc}\n"

    # Add configuration examples
    report += "\n### Recommended Configuration\n"

    if file_type == "nginx":
        report += """```nginx
# Add to server block
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```"""
    elif file_type == "express":
        report += """```javascript
// Use helmet middleware
const helmet = require('helmet');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
    }
}));
```"""

    # Score calculation
    score = len(headers_found) / len(essential_headers) * 100
    report += f"\n### Security Headers Score: {score:.0f}%\n"

    if score < 50:
        report += "⚠️ **Critical**: Implement security headers immediately\n"
    elif score < 80:
        report += "⚠️ **Warning**: Some important headers are missing\n"
    else:
        report += "✅ **Good**: Most security headers are configured\n"

    return report


def analyze_authentication_security(code: str, language: str = "python") -> str:
    """
    Analyze authentication and session management security.

    Args:
        code: Source code to analyze
        language: Programming language

    Returns:
        Authentication security assessment
    """
    issues = []
    recommendations = []

    # Common authentication anti-patterns
    auth_patterns = {
        "python": [
            (r'password\s*==\s*["\']', "Plain text password comparison", "HIGH"),
            (r"hashlib\.md5.*password", "MD5 for password hashing", "HIGH"),
            (r"session\[.*\]\s*=.*user_id.*\n[^}]*secret", "Sensitive data in session", "MEDIUM"),
            (r"verify_password.*return\s+True", "Always true password verification", "HIGH"),
            (r'jwt\.encode.*algorithm\s*=\s*["\']HS256', "Weak JWT algorithm", "MEDIUM"),
            (r"jwt\.decode.*verify\s*=\s*False", "JWT verification disabled", "HIGH"),
        ],
        "javascript": [
            (r'password\s*===\s*["\']', "Plain text password comparison", "HIGH"),
            (r"localStorage.*password", "Password in localStorage", "HIGH"),
            (r"cookie.*httpOnly\s*:\s*false", "Cookies without httpOnly", "MEDIUM"),
            (r'sameSite\s*:\s*["\']none["\']', "SameSite none without secure", "MEDIUM"),
        ],
    }

    # Check for issues
    patterns = auth_patterns.get(language.lower(), [])
    lines = code.split("\n")

    for i, line in enumerate(lines, 1):
        for pattern, desc, severity in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                issues.append({"line": i, "issue": desc, "severity": severity})

    # Generate report
    report = "## Authentication Security Analysis\n\n"

    if issues:
        report += f"### Issues Found ({len(issues)})\n"
        for issue in issues:
            severity_icon = "🔴" if issue["severity"] == "HIGH" else "🟡"
            report += f"- {severity_icon} **Line {issue['line']}**: {issue['issue']}\n"
    else:
        report += "### ✅ No authentication issues detected\n"

    # Add recommendations
    report += "\n### Best Practices\n"
    report += "- **Password Hashing**: Use bcrypt, scrypt, or Argon2\n"
    report += "- **Session Security**: Set httpOnly, secure, and sameSite flags\n"
    report += "- **JWT Security**: Use RS256 or ES256, always verify\n"
    report += "- **MFA Support**: Implement TOTP or WebAuthn\n"
    report += "- **Rate Limiting**: Prevent brute force attacks\n"
    report += "- **Account Lockout**: After failed attempts\n"

    if language.lower() == "python":
        report += "\n### Example: Secure Password Hashing (Python)\n"
        report += """```python
from passlib.context import CryptContext

# Configure password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```"""

    return report

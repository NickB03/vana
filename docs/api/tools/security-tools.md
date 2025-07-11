# Security Tools API Reference

**Status**: Phase 3 Complete ✅  
**Location**: `agents/specialists/security_tools.py`  
**Priority**: 🔴 ELEVATED STATUS

The Security Specialist provides 4 critical tools for vulnerability detection, compliance validation, and security analysis. These tools have ELEVATED routing priority for immediate security concerns.

## ELEVATED Priority System

Security tools receive priority routing when requests contain security keywords:
- vulnerability, exploit, injection, xss, csrf
- authentication, authorization, encryption
- password, secret, token, breach, attack

## Tool Overview

| Tool | Purpose | Severity | Performance |
|------|---------|----------|-------------|
| `scan_code_vulnerabilities` | Detect security vulnerabilities | CRITICAL | 100-200ms |
| `validate_security_compliance` | Check compliance standards | HIGH | 150-300ms |
| `generate_security_report` | Create security assessments | MEDIUM | 200-300ms |
| `assess_input_validation` | Validate user inputs | CRITICAL | 50-100ms |

## Tool Details

### 1. scan_code_vulnerabilities

Scans code for security vulnerabilities with real-time detection.

**Parameters:**
```python
scan_code_vulnerabilities(code: str, language: str = "python") -> str
```

**Input:**
- `code` (str): Source code to scan
- `language` (str): Programming language (default: "python")

**Returns:**
- Detailed vulnerability report with severity ratings and fixes

**Detected Vulnerabilities:**
- SQL Injection
- Cross-Site Scripting (XSS)
- Command Injection
- Path Traversal
- Hardcoded Secrets
- Weak Cryptography
- Insecure Deserialization
- XXE Injection

**Example:**
```python
code = '''
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = '{user_id}'"
    cursor.execute(query)
'''

result = scan_code_vulnerabilities(code)
# Returns:
"""
## Security Vulnerability Scan Results

### Vulnerabilities Found: 1
### Security Score: 40/100 (CRITICAL)

### Critical Vulnerabilities:

1. **SQL Injection** 🔴
   - Type: sql_injection
   - Severity: CRITICAL
   - Line: 3
   - Code: query = f"SELECT * FROM users WHERE id = '{user_id}'"
   
   **Risk**: User input directly concatenated into SQL query
   
   **Fix**:
   ```python
   query = "SELECT * FROM users WHERE id = ?"
   cursor.execute(query, (user_id,))
   ```
   
   **OWASP**: A03:2021 – Injection
   **CWE**: CWE-89

### Summary by Severity:
- CRITICAL: 1
- HIGH: 0
- MEDIUM: 0
- LOW: 0

### Recommendations:
1. Use parameterized queries for all database operations
2. Implement input validation
3. Use an ORM like SQLAlchemy
4. Enable SQL query logging for security monitoring
"""
```

### 2. validate_security_compliance

Validates code against security compliance standards.

**Parameters:**
```python
validate_security_compliance(
    project_type: str,
    requirements: List[str] = ["OWASP"]
) -> str
```

**Input:**
- `project_type` (str): Type of project (web_application, api, mobile_app, etc.)
- `requirements` (List[str]): Compliance standards to check

**Supported Standards:**
- OWASP Top 10
- PCI-DSS
- HIPAA
- SOC2
- GDPR
- ISO 27001

**Example:**
```python
result = validate_security_compliance("payment_system", ["OWASP", "PCI-DSS"])
# Returns:
"""
## Security Compliance Validation

### Project Type: payment_system
### Standards Checked: OWASP, PCI-DSS

### OWASP Top 10 Compliance:

✅ A01:2021 – Broken Access Control
   Requirements met:
   - Authentication required for all endpoints
   - Role-based access control implemented
   - Session management secure

⚠️ A02:2021 – Cryptographic Failures
   Issues found:
   - Weak hashing algorithm (MD5) detected
   - Missing encryption for data at rest
   
   Required actions:
   - Replace MD5 with bcrypt/argon2
   - Implement AES-256 for sensitive data

✅ A03:2021 – Injection
   Requirements met:
   - Parameterized queries used
   - Input validation implemented

### PCI-DSS Compliance:

⚠️ Requirement 3: Protect stored cardholder data
   Issues:
   - Card numbers stored without tokenization
   - Missing data retention policy
   
✅ Requirement 6: Develop secure systems
   Requirements met:
   - Security testing in CI/CD
   - Code review process

### Overall Compliance: 75% (NEEDS IMPROVEMENT)

### Priority Actions:
1. Implement strong cryptography (A02)
2. Add cardholder data tokenization (PCI 3)
3. Create data retention policy
4. Schedule penetration testing
"""
```

### 3. generate_security_report

Generates comprehensive security assessment reports.

**Parameters:**
```python
generate_security_report(
    context: str,
    report_type: str = "comprehensive"
) -> str
```

**Input:**
- `context` (str): Project or code context to analyze
- `report_type` (str): Type of report (basic, focused, comprehensive)

**Report Sections:**
- Executive Summary
- Threat Landscape
- Vulnerability Assessment
- Compliance Status
- Security Architecture
- Incident Response Plan
- Security Metrics

**Example:**
```python
result = generate_security_report("E-commerce Platform", "comprehensive")
# Returns:
"""
# SECURITY ANALYSIS REPORT
**Generated**: 2025-07-11
**Context**: E-commerce Platform
**Priority**: ELEVATED STATUS

## EXECUTIVE SUMMARY

The security assessment identified 3 critical and 5 medium severity issues requiring immediate attention. The platform's overall security posture is MODERATE with a score of 65/100.

### Key Findings:
- 🔴 SQL injection vulnerability in search functionality
- 🔴 Missing authentication on admin endpoints
- 🔴 Hardcoded API keys in source code
- 🟡 Weak password policy
- 🟡 Missing rate limiting

## THREAT LANDSCAPE

### Primary Threats:
1. **Data Breach** - Customer PII and payment data exposure
2. **Account Takeover** - Weak authentication mechanisms
3. **DDoS Attacks** - No rate limiting protection
4. **Supply Chain** - Vulnerable dependencies

### Attack Vectors:
- Public-facing web application
- API endpoints
- Admin interface
- Third-party integrations

## VULNERABILITY ASSESSMENT

### Critical (Immediate Action Required):

1. **SQL Injection in Search**
   - Location: /api/search endpoint
   - Impact: Database compromise
   - CVSS: 9.8 (Critical)
   - Remediation: Implement parameterized queries

2. **Missing Authentication**
   - Location: /admin/* routes
   - Impact: Unauthorized access
   - CVSS: 9.1 (Critical)
   - Remediation: Add authentication middleware

### Medium Priority:

1. **Weak Password Policy**
   - Current: 6 characters minimum
   - Recommended: 12+ with complexity
   - Add MFA requirement

## COMPLIANCE STATUS

- PCI-DSS: 60% compliant
- GDPR: 75% compliant
- OWASP: 70% aligned

## SECURITY ARCHITECTURE RECOMMENDATIONS

1. **Implement Zero Trust Architecture**
   - Verify every request
   - Least privilege access
   - Continuous monitoring

2. **Add Security Layers**
   - WAF deployment
   - DDoS protection
   - API gateway

3. **Enhance Monitoring**
   - SIEM integration
   - Real-time alerts
   - Audit logging

## INCIDENT RESPONSE PLAN

### Detection (15 min)
- Automated alerts
- Log analysis
- User reports

### Response (1 hour)
- Isolate affected systems
- Assess impact
- Begin remediation

### Recovery (4 hours)
- Patch vulnerabilities
- Restore services
- Verify security

## SECURITY METRICS

- Mean Time to Detect: 45 minutes
- Mean Time to Respond: 2 hours
- Vulnerabilities per 1000 LOC: 2.3
- Security Training Completion: 85%

## RECOMMENDATIONS PRIORITY

1. **IMMEDIATE** (24 hours)
   - Fix SQL injection
   - Enable authentication
   - Remove hardcoded secrets

2. **SHORT TERM** (1 week)
   - Implement rate limiting
   - Update dependencies
   - Add WAF

3. **LONG TERM** (1 month)
   - Zero Trust migration
   - Security training
   - Penetration testing
"""
```

### 4. assess_input_validation

Validates and sanitizes user inputs for security threats.

**Parameters:**
```python
assess_input_validation(
    input_data: str,
    input_type: str = "string"
) -> str
```

**Input:**
- `input_data` (str): User input to validate
- `input_type` (str): Expected input type (string, email, url, filepath, etc.)

**Returns:**
- Validation report with detected threats and sanitization recommendations

**Detection Patterns:**
- SQL injection attempts
- XSS payloads
- Command injection
- Path traversal
- LDAP injection
- XML injection
- Script tags
- Malicious file names

**Example:**
```python
# Example 1: SQL Injection attempt
malicious_input = "'; DROP TABLE users; --"
result = assess_input_validation(malicious_input, "string")
# Returns:
"""
## Input Validation Assessment

### Input Analysis
- Input Type: string
- Length: 25 characters
- Input Safe: ❌ FALSE

### Validation Issues Detected: 2

1. **SQL Injection Pattern** 🔴
   - Type: sql
   - Severity: HIGH
   - Pattern: '; ... --
   - Details: SQL command termination and comment syntax detected
   
2. **Dangerous SQL Keywords** 🔴
   - Type: sql
   - Severity: HIGH
   - Keywords: DROP, TABLE
   - Details: Destructive SQL commands detected

### Sanitization Recommendations:
1. Reject input - contains malicious patterns
2. If must process:
   - Escape single quotes
   - Remove SQL keywords
   - Use parameterized queries
3. Log security event
4. Consider blocking source IP

### Safe Alternative:
Use parameterized queries or ORM
"""

# Example 2: XSS attempt
xss_input = '<script>alert("XSS")</script>'
result = assess_input_validation(xss_input, "string")
# Returns:
"""
## Input Validation Assessment

### Input Analysis
- Input Type: string
- Length: 29 characters
- Input Safe: ❌ FALSE

### Validation Issues Detected: 1

1. **Cross-Site Scripting (XSS)** 🔴
   - Type: xss
   - Severity: HIGH
   - Pattern: <script>...</script>
   - Details: JavaScript code injection attempt

### Sanitization Recommendations:
1. HTML encode all output
2. Strip script tags
3. Use Content Security Policy
4. Implement XSS protection headers

### Safe Output:
&lt;script&gt;alert("XSS")&lt;/script&gt;
"""
```

## Security Keywords (ELEVATED Routing)

When these keywords appear in requests, the Security Specialist receives priority:

```python
security_keywords = [
    "security", "vulnerability", "exploit", "injection",
    "xss", "csrf", "authentication", "authorization",
    "encryption", "certificate", "ssl", "tls",
    "password", "secret", "token", "breach",
    "attack", "malware", "ransomware", "phishing"
]
```

## Usage Examples

### Basic Vulnerability Scan
```python
# Scan a code file
with open("app.py", "r") as f:
    code = f.read()
vulnerabilities = scan_code_vulnerabilities(code)
```

### Compliance Check
```python
# Check OWASP compliance for web app
compliance = validate_security_compliance(
    "web_application",
    ["OWASP", "GDPR"]
)
```

### Input Validation
```python
# Validate user input
user_input = request.form.get("search")
validation = assess_input_validation(user_input, "string")
if "Input Safe: ❌ FALSE" in validation:
    abort(400, "Invalid input detected")
```

### Security Audit
```python
# Generate security report
report = generate_security_report(
    "Production API Server",
    "comprehensive"
)
# Save or email report
```

## Performance & Limits

- **Timeout**: 30 seconds per scan
- **File Size**: Max 10MB per file
- **Batch Processing**: Up to 100 files
- **Cache**: Results cached for 5 minutes

## Integration with CI/CD

```yaml
# GitHub Actions example
- name: Security Scan
  run: |
    python -c "
    from security_tools import scan_code_vulnerabilities
    result = scan_code_vulnerabilities(open('src/app.py').read())
    if 'CRITICAL' in result:
        exit(1)
    "
```

## Best Practices

1. **Regular Scanning**: Run security scans on every commit
2. **Fix Critical First**: Address CRITICAL vulnerabilities immediately
3. **Track Metrics**: Monitor security score trends
4. **Train Developers**: Share security reports with team
5. **Automate Compliance**: Include in CI/CD pipeline
6. **Document Exceptions**: Use security policy files
7. **Update Regularly**: Keep security patterns current

## Error Handling

Security tools never throw exceptions, always return reports:

```python
# File not found
"Error: Could not analyze security - file not found"

# Invalid syntax
"Error: Could not parse code - syntax error on line X"

# Timeout
"Error: Security scan timeout - file too large"
```
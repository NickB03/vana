# Security Specialist Documentation

**Status**: Phase 3 Complete ✅  
**Model**: Gemini 2.0 Flash  
**Tools**: 4 (Security-focused toolset)  
**Priority**: 🔴 ELEVATED STATUS  
**Location**: `agents/specialists/security_specialist.py`

## Overview

The Security Specialist is a critical domain expert with ELEVATED routing priority. It focuses on vulnerability detection, compliance validation, security assessments, and input validation. This specialist receives immediate priority when security keywords are detected.

## ELEVATED Status

The Security Specialist has special privileges:
- **Priority Routing**: Security concerns bypass normal routing
- **Veto Power**: Can halt unsafe operations
- **Audit Authority**: Full access for security audits
- **Compliance Enforcement**: Validates against standards

## Capabilities

- **Vulnerability Scanning**: Real-time security flaw detection
- **Compliance Validation**: OWASP, PCI-DSS, HIPAA checks
- **Security Reporting**: Comprehensive assessments
- **Input Validation**: Sanitization and threat detection
- **Code Analysis**: Security-focused code review
- **Threat Modeling**: Risk assessment and mitigation

## Tools

1. `scan_code_vulnerabilities` - Real-time vulnerability detection
2. `validate_security_compliance` - Standards compliance checking
3. `generate_security_report` - Comprehensive security assessments
4. `assess_input_validation` - Input sanitization validation

See [Security Tools API](../tools/security-tools.md) for detailed tool documentation.

## Agent Configuration

```python
security_specialist = LlmAgent(
    model="gemini-2.0-flash",
    tools=[
        scan_code_vulnerabilities,
        validate_security_compliance,
        generate_security_report,
        assess_input_validation
    ],
    instruction="""You are a senior security specialist with ELEVATED STATUS..."""
)
```

## Priority Routing Keywords

Immediate routing occurs for:
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

### Vulnerability Scanning
```python
# Automatically routes to Security Specialist
response = orchestrator.route_request(
    "Scan my code for SQL injection vulnerabilities"
)
```

### Compliance Validation
```python
response = orchestrator.route_request(
    "Validate PCI-DSS compliance for our payment system"
)
```

### Security Audit
```python
response = orchestrator.route_request(
    "Perform a comprehensive security audit of the API endpoints"
)
```

## Security Levels

### CRITICAL (Immediate Action)
- SQL Injection
- Remote Code Execution
- Authentication Bypass
- Hardcoded Secrets

### HIGH (Urgent)
- XSS Vulnerabilities
- Insecure Deserialization
- Missing Authentication
- Weak Encryption

### MEDIUM (Important)
- Information Disclosure
- Session Fixation
- Weak Password Policy
- Missing Headers

### LOW (Advisory)
- Version Disclosure
- Missing Best Practices
- Performance Issues
- Code Quality

## Performance Characteristics

- **Response Time**: 100-300ms (optimized for speed)
- **Priority Queue**: Bypasses normal routing
- **Caching**: Security results cached 5 minutes
- **Concurrency**: Parallel scanning supported

## Integration with CI/CD

```yaml
# GitHub Actions Integration
- name: VANA Security Scan
  run: |
    curl -X POST https://api.vana.ai/security/scan \
      -H "Authorization: Bearer ${{ secrets.VANA_TOKEN }}" \
      -d '{"code": "${{ github.workspace }}"}'
```

## Best Practices

1. **Scan Early**: Include in pre-commit hooks
2. **Fix Critical First**: Address by severity
3. **Regular Audits**: Weekly security reviews
4. **Track Metrics**: Monitor security scores
5. **Document Exceptions**: Explain accepted risks
6. **Update Patterns**: Keep detection current

## Security Standards Support

### OWASP Top 10 (2021)
- A01: Broken Access Control ✅
- A02: Cryptographic Failures ✅
- A03: Injection ✅
- A04: Insecure Design ✅
- A05: Security Misconfiguration ✅
- A06: Vulnerable Components ✅
- A07: Authentication Failures ✅
- A08: Data Integrity Failures ✅
- A09: Logging Failures ✅
- A10: SSRF ✅

### Compliance Frameworks
- PCI-DSS (Payment Card Industry)
- HIPAA (Healthcare)
- SOC2 (Service Organization Control)
- GDPR (Data Protection)
- ISO 27001 (Information Security)

## Common Use Cases

1. **Code Reviews**: Automated security checks
2. **Penetration Testing**: Vulnerability discovery
3. **Compliance Audits**: Standards validation
4. **Incident Response**: Rapid threat assessment
5. **Security Training**: Educational reports

## Integration Examples

### With Architecture Specialist
```python
"Review the authentication architecture for security vulnerabilities"
```

### With DevOps Specialist
```python
"Create secure CI/CD pipeline with security scanning"
```

### Pre-deployment Check
```python
"Perform final security scan before production deployment"
```

## Security Metrics

- **Vulnerability Density**: Vulns per 1000 LOC
- **Fix Rate**: Remediation speed
- **Security Score**: Overall posture (0-100)
- **Compliance Rate**: Standards adherence
- **MTTR**: Mean Time To Remediate

## Limitations

- Cannot fix vulnerabilities (only detect)
- Language support varies (Python best)
- No runtime analysis (static only)
- Network scanning not included
- Binary analysis not supported

## Error Handling

Security tools fail safely:
- Parse errors: Partial scan results
- Timeouts: Return found issues
- Access denied: Report restrictions
- Invalid input: Safe rejection

## Emergency Procedures

For critical vulnerabilities:
1. Immediate notification sent
2. Affected code quarantined
3. Remediation steps provided
4. Incident logged for audit
5. Follow-up scan scheduled
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in VANA, please report it responsibly by following these steps:

### 1. Do NOT Create a Public Issue

Please **do not** create a public GitHub issue for security vulnerabilities. This could potentially expose the vulnerability to malicious actors.

### 2. Report Privately

Use [GitHub Security Advisories](https://github.com/NickB03/vana/security/advisories) to report vulnerabilities privately.

Include the following information:
- Clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if you have one)
- Your contact information

### 3. Response Timeline

- **Acknowledgment**: We will acknowledge your report within 48 hours
- **Initial Assessment**: Within 7 days, we'll provide an initial assessment
- **Resolution**: Critical vulnerabilities will be addressed within 14 days
- **Disclosure**: We'll coordinate with you on responsible disclosure timing

### 4. Responsible Disclosure

- We prefer coordinated disclosure after a fix is available
- We'll credit researchers who report vulnerabilities responsibly
- We'll work with you to ensure proper attribution

## Security Considerations

### Agent Execution Environment

VANA uses secure execution environments for code execution:
- **Sandboxed execution** via Docker containers
- **Resource limits** to prevent resource exhaustion
- **Input validation** for all user-provided code
- **Timeout mechanisms** to prevent infinite loops

### API Security

- **No hardcoded secrets** - all credentials use environment variables
- **Google Secret Manager** integration for production deployments
- **Proper authentication** for all external API calls
- **Rate limiting** and request validation

### Data Protection

- **No sensitive data logging** in production
- **Secure memory management** for temporary data
- **Proper cleanup** of temporary files and containers
- **Encrypted storage** for any persistent data

## Security Best Practices

When contributing to VANA:

1. **Never commit secrets** or API keys to the repository
2. **Use environment variables** for all configuration
3. **Validate all inputs** before processing
4. **Follow principle of least privilege** for permissions
5. **Keep dependencies updated** and monitor for vulnerabilities

## Security Testing

We encourage security testing of VANA with these guidelines:

- **Scope**: Testing should focus on VANA's core functionality
- **Authorization**: Only test on your own VANA installations
- **Respectful testing**: Avoid excessive resource usage
- **Reporting**: Follow our vulnerability reporting process

## Security Contact

For security-related questions or concerns:
- **Email**: nbohmer@gmail.com
- **Response time**: Within 48 hours for security issues

Thank you for helping keep VANA secure!
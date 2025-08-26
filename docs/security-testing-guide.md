# Security Testing Guide

This guide covers the comprehensive security test suite implemented for the Vana project, including XSS prevention, input sanitization, authentication validation, CORS policies, rate limiting, and CSP headers.

## Overview

The security test suite consists of:

- **Frontend Security Tests**: XSS prevention, input sanitization, token validation, CORS, CSP
- **Backend Security Tests**: Rate limiting, security middleware, authentication, audit logging
- **Comprehensive Test Configuration**: Jest security config, pytest security config
- **Automated Test Runner**: Script to run all security tests with reporting

## Test Structure

### Frontend Security Tests (`/frontend/src/__tests__/security/`)

1. **XSS Prevention Tests** (`xss-prevention.test.tsx`)
   - Chat interface XSS protection
   - DOMPurify integration
   - Content Security Policy compliance
   - File upload security
   - URL sanitization

2. **Input Sanitization Tests** (`input-sanitization.test.tsx`)
   - Monaco Editor security
   - CSP compliance in sandbox
   - File upload validation
   - Code execution prevention
   - Input validation

3. **Authentication Token Tests** (`auth-token-validation.test.ts`)
   - JWT signature validation
   - Token storage security
   - Refresh token security
   - Timing attack prevention
   - Token injection prevention

4. **CORS Policy Tests** (`cors-policy.test.ts`)
   - Origin validation
   - Preflight request handling
   - Credential handling
   - Header injection prevention
   - Protocol security

5. **CSP Headers Tests** (`csp-headers.test.ts`)
   - Policy generation
   - Nonce management
   - Violation reporting
   - Bypass prevention
   - Monaco Editor integration

### Backend Security Tests (`/app/tests/security/`)

1. **Rate Limiting Tests** (`test_rate_limiting.py`)
   - Basic rate limiting functionality
   - IP-based rate limiting
   - Advanced rate limiting algorithms
   - Bypass attempt prevention
   - Performance testing

2. **Security Middleware Tests** (`test_security_middleware.py`)
   - Security headers middleware
   - Authentication middleware
   - Audit logging middleware
   - CORS middleware
   - Middleware integration

## Running Security Tests

### Quick Start

```bash
# Run all security tests
./scripts/run-security-tests.sh

# Run frontend security tests only
cd frontend
npx jest --config=jest.security.config.js

# Run backend security tests only
python -m pytest app/tests/security/ -c pytest-security.ini
```

### Individual Test Categories

#### Frontend Tests

```bash
cd frontend

# XSS prevention tests
npx jest --config=jest.security.config.js --testPathPattern="xss-prevention"

# Input sanitization tests
npx jest --config=jest.security.config.js --testPathPattern="input-sanitization"

# Authentication tests
npx jest --config=jest.security.config.js --testPathPattern="auth-token-validation"

# CORS tests
npx jest --config=jest.security.config.js --testPathPattern="cors-policy"

# CSP tests
npx jest --config=jest.security.config.js --testPathPattern="csp-headers"
```

#### Backend Tests

```bash
# Rate limiting tests
python -m pytest app/tests/security/test_rate_limiting.py -v

# Middleware tests
python -m pytest app/tests/security/test_security_middleware.py -v

# All backend security tests with coverage
python -m pytest app/tests/security/ -c pytest-security.ini --cov=app/auth
```

## Test Configuration

### Jest Security Configuration

The security tests use a specialized Jest configuration (`jest.security.config.js`) with:

- Higher coverage thresholds (95% for security-critical modules)
- Specialized test matchers for security assertions
- Security-focused test environment setup
- Comprehensive error reporting

### Pytest Security Configuration

Backend security tests use `pytest-security.ini` with:

- Security-specific markers
- High coverage requirements (90% minimum)
- Timeout protection
- Detailed logging

### Custom Test Matchers

Security tests include custom Jest matchers:

- `toBeSecureUrl()` - Validates secure URL formats
- `toContainXSS()` - Detects XSS patterns
- `toBeValidCSPPolicy()` - Validates CSP policies
- `toHaveSecurityHeaders()` - Checks required security headers
- `toBeValidJWT()` - Validates JWT format
- `toBeValidNonce()` - Validates CSP nonces

## Security Test Coverage Areas

### 1. Cross-Site Scripting (XSS) Prevention

- **Chat Interface**: Message content sanitization
- **File Uploads**: SVG and other file type validation
- **Dynamic Content**: Safe rendering of user-generated content
- **URLs**: Link sanitization and validation

### 2. Input Sanitization

- **Code Editor**: Monaco Editor security in sandboxed iframe
- **Form Inputs**: Validation and sanitization of all form data
- **File Processing**: Safe handling of uploaded files
- **API Inputs**: Backend input validation

### 3. Authentication & Authorization

- **JWT Validation**: Signature verification, expiration checking
- **Token Storage**: Secure token storage mechanisms
- **Refresh Flows**: Secure token refresh handling
- **Session Management**: Secure session handling

### 4. Cross-Origin Resource Sharing (CORS)

- **Origin Validation**: Whitelist-based origin checking
- **Preflight Requests**: Proper handling of OPTIONS requests
- **Credential Policies**: Secure credential handling
- **Header Validation**: Request/response header validation

### 5. Rate Limiting

- **IP-based Limiting**: Per-IP rate limiting
- **Endpoint-specific Limits**: Different limits for different endpoints
- **Bypass Prevention**: Protection against common bypass techniques
- **Performance Impact**: Ensuring rate limiting doesn't degrade performance

### 6. Content Security Policy (CSP)

- **Policy Generation**: Dynamic CSP policy creation
- **Nonce Management**: Secure nonce generation and validation
- **Violation Reporting**: CSP violation handling
- **Monaco Integration**: CSP compatibility with code editor

## Security Test Reports

After running security tests, reports are generated in:

- **Frontend**: `frontend/coverage/security/html-report/security-report.html`
- **Backend**: `app/coverage/security/html/index.html`
- **Combined**: `coverage/security/`

## Continuous Integration

To integrate security tests in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run Security Tests
  run: |
    chmod +x ./scripts/run-security-tests.sh
    ./scripts/run-security-tests.sh

- name: Upload Security Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: security-test-results
    path: |
      frontend/coverage/security/
      app/coverage/security/
      coverage/security/
```

## Security Testing Best Practices

### 1. Test Development

- Write security tests for every new feature
- Include both positive and negative test cases
- Test edge cases and boundary conditions
- Simulate real-world attack scenarios

### 2. Test Maintenance

- Keep security tests up-to-date with code changes
- Regular review of test coverage
- Update tests for new security threats
- Maintain test data and fixtures

### 3. Test Environment

- Use dedicated security test environment
- Isolate security tests from other tests
- Mock external dependencies securely
- Use realistic test data

## Common Security Test Patterns

### XSS Testing Pattern

```typescript
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src="x" onerror="alert(\'XSS\')" />',
  'javascript:alert("XSS")',
];

xssPayloads.forEach(payload => {
  // Test that payload is sanitized
  expect(sanitizedOutput).not.toContainXSS();
});
```

### Authentication Testing Pattern

```typescript
const maliciousTokens = [
  'eyJhbGciOiJub25lIn0...', // None algorithm
  'invalid.jwt.format',      // Malformed
  '',                        // Empty
];

maliciousTokens.forEach(token => {
  expect(validateToken(token)).toBe(false);
});
```

### Rate Limiting Testing Pattern

```python
# Test rate limiting
for i in range(rate_limit + 1):
    response = client.get('/api/endpoint')
    if i < rate_limit:
        assert response.status_code == 200
    else:
        assert response.status_code == 429
```

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout in security config if tests are slow
2. **Mock Issues**: Ensure all external dependencies are properly mocked
3. **Environment Variables**: Set required environment variables for tests
4. **Dependencies**: Install all required test dependencies

### Debug Mode

```bash
# Run with verbose output
npx jest --config=jest.security.config.js --verbose

# Run specific test with debug info
npx jest --config=jest.security.config.js --testPathPattern="xss" --verbose

# Python tests with debug
python -m pytest app/tests/security/ -v -s --tb=long
```

## Security Test Metrics

The security test suite tracks:

- **Test Coverage**: Minimum 95% for security-critical modules
- **Test Execution Time**: All tests should complete within reasonable time
- **False Positives**: Track and minimize false positive rate
- **Security Issue Detection**: Track real security issues found by tests

## Contributing

When adding new security tests:

1. Follow the existing test structure and naming conventions
2. Include both unit and integration tests
3. Add appropriate test markers/categories
4. Update documentation
5. Ensure high test coverage
6. Test for common attack vectors

## Security Resources

- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)
- [CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Note**: This security test suite provides comprehensive coverage of common web application security vulnerabilities. Regular updates and maintenance are essential to keep up with evolving security threats.

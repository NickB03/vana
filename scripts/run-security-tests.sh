#!/bin/bash

# Security Test Runner Script
# Runs comprehensive security tests for both frontend and backend

set -e

echo "🔒 Starting comprehensive security test suite..."
echo "=====================================\n"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -f "frontend/package.json" ]]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Create coverage directories
print_status "Creating coverage directories..."
mkdir -p coverage/security
mkdir -p frontend/coverage/security
mkdir -p app/coverage/security

# Set security test environment
export NODE_ENV=test
export SECURITY_TEST_MODE=true
export PYTHONPATH="$PWD:$PYTHONPATH"

# Initialize test results tracking
FRONTEND_TESTS_PASSED=false
BACKEND_TESTS_PASSED=false
EXIT_CODE=0

# Frontend Security Tests
print_status "Running frontend security tests..."
echo "======================================\n"

cd frontend

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Run frontend security tests
print_status "Executing frontend XSS prevention tests..."
if npm run test:security:xss 2>/dev/null || npx jest --config=jest.security.config.js --testPathPattern="xss-prevention"; then
    print_success "XSS prevention tests passed"
else
    print_error "XSS prevention tests failed"
    EXIT_CODE=1
fi

print_status "Executing frontend input sanitization tests..."
if npm run test:security:sanitization 2>/dev/null || npx jest --config=jest.security.config.js --testPathPattern="input-sanitization"; then
    print_success "Input sanitization tests passed"
else
    print_error "Input sanitization tests failed"
    EXIT_CODE=1
fi

print_status "Executing frontend authentication token tests..."
if npm run test:security:auth 2>/dev/null || npx jest --config=jest.security.config.js --testPathPattern="auth-token-validation"; then
    print_success "Authentication token tests passed"
else
    print_error "Authentication token tests failed"
    EXIT_CODE=1
fi

print_status "Executing frontend CORS policy tests..."
if npm run test:security:cors 2>/dev/null || npx jest --config=jest.security.config.js --testPathPattern="cors-policy"; then
    print_success "CORS policy tests passed"
else
    print_error "CORS policy tests failed"
    EXIT_CODE=1
fi

print_status "Executing frontend CSP header tests..."
if npm run test:security:csp 2>/dev/null || npx jest --config=jest.security.config.js --testPathPattern="csp-headers"; then
    print_success "CSP header tests passed"
else
    print_error "CSP header tests failed"
    EXIT_CODE=1
fi

# Run all frontend security tests together
print_status "Running comprehensive frontend security test suite..."
if npx jest --config=jest.security.config.js --passWithNoTests; then
    print_success "All frontend security tests passed"
    FRONTEND_TESTS_PASSED=true
else
    print_error "Some frontend security tests failed"
    FRONTEND_TESTS_PASSED=false
    EXIT_CODE=1
fi

cd ..

# Backend Security Tests
echo "\n======================================"
print_status "Running backend security tests..."
echo "======================================\n"

# Check if Python virtual environment exists
if [[ ! -d "venv" ]] && [[ ! -d ".venv" ]]; then
    print_warning "No Python virtual environment found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt 2>/dev/null || pip install -r pyproject.toml 2>/dev/null || true
else
    # Activate existing virtual environment
    if [[ -d "venv" ]]; then
        source venv/bin/activate
    else
        source .venv/bin/activate
    fi
fi

# Install test dependencies
print_status "Installing backend test dependencies..."
pip install pytest pytest-asyncio pytest-cov pytest-timeout pytest-xdist pytest-html 2>/dev/null || true

# Run backend security tests
print_status "Executing backend rate limiting tests..."
if python -m pytest app/tests/security/test_rate_limiting.py -v --tb=short; then
    print_success "Rate limiting tests passed"
else
    print_error "Rate limiting tests failed"
    EXIT_CODE=1
fi

print_status "Executing backend security middleware tests..."
if python -m pytest app/tests/security/test_security_middleware.py -v --tb=short; then
    print_success "Security middleware tests passed"
else
    print_error "Security middleware tests failed"
    EXIT_CODE=1
fi

# Run all backend security tests
print_status "Running comprehensive backend security test suite..."
if python -m pytest app/tests/security/ -c pytest-security.ini; then
    print_success "All backend security tests passed"
    BACKEND_TESTS_PASSED=true
else
    print_error "Some backend security tests failed"
    BACKEND_TESTS_PASSED=false
    EXIT_CODE=1
fi

# Security Test Report
echo "\n======================================"
print_status "Security Test Summary"
echo "======================================\n"

if [[ $FRONTEND_TESTS_PASSED == true ]]; then
    print_success "✅ Frontend security tests: PASSED"
else
    print_error "❌ Frontend security tests: FAILED"
fi

if [[ $BACKEND_TESTS_PASSED == true ]]; then
    print_success "✅ Backend security tests: PASSED"
else
    print_error "❌ Backend security tests: FAILED"
fi

# Coverage Reports
print_status "Generating security test coverage reports..."

if [[ -d "frontend/coverage/security" ]]; then
    print_status "Frontend security coverage report available at: frontend/coverage/security/html-report/security-report.html"
fi

if [[ -d "app/coverage/security" ]]; then
    print_status "Backend security coverage report available at: app/coverage/security/html/index.html"
fi

# Security Recommendations
echo "\n======================================"
print_status "Security Recommendations"
echo "======================================\n"

print_status "1. Review XSS prevention measures in chat interface"
print_status "2. Validate input sanitization in Monaco code editor"
print_status "3. Ensure JWT tokens are properly validated"
print_status "4. Verify CORS policies are correctly configured"
print_status "5. Check rate limiting is functioning as expected"
print_status "6. Confirm CSP headers are properly set"
print_status "7. Review all security middleware implementations"

# Additional Security Checks
print_status "\nRunning additional security checks..."

# Check for common security vulnerabilities in package.json
if command -v npm &> /dev/null; then
    cd frontend
    if npm audit --audit-level=moderate; then
        print_success "No high-severity vulnerabilities found in frontend dependencies"
    else
        print_warning "Security vulnerabilities detected in frontend dependencies. Run 'npm audit fix' to resolve."
    fi
    cd ..
fi

# Check for Python security vulnerabilities
if command -v safety &> /dev/null; then
    if safety check; then
        print_success "No known security vulnerabilities in Python dependencies"
    else
        print_warning "Security vulnerabilities detected in Python dependencies"
    fi
else
    print_status "Install 'safety' to check Python dependencies for security vulnerabilities: pip install safety"
fi

# Final Status
echo "\n======================================"
if [[ $EXIT_CODE -eq 0 ]]; then
    print_success "🔒 All security tests completed successfully!"
    print_status "Security test reports generated in coverage/security/"
else
    print_error "🚨 Security test failures detected!"
    print_error "Please review the failed tests and address security issues before deployment."
fi
echo "======================================\n"

exit $EXIT_CODE

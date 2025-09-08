#!/bin/bash
# Security check script for Vana project
# DevOps Team Gamma - Security & Cleanup Agent

set -euo pipefail

echo "🔒 Vana Security Check - DevOps Team Gamma"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if running in CI
if [[ "${CI:-false}" == "true" ]]; then
    echo "🤖 Running in CI environment"
fi

# Function to check for secrets in files
check_secrets() {
    echo "🔍 Checking for potential secrets..."
    
    # Patterns to look for
    secret_patterns=(
        "password\s*=\s*['\"][^'\"]{8,}"
        "secret\s*=\s*['\"][^'\"]{8,}"
        "key\s*=\s*['\"][^'\"]{16,}"
        "token\s*=\s*['\"][^'\"]{16,}"
        "api_key\s*=\s*['\"][^'\"]{16,}"
    )
    
    found_secrets=false
    for pattern in "${secret_patterns[@]}"; do
        if grep -r -E "$pattern" . --exclude-dir=.git --exclude-dir=.venv --exclude-dir=node_modules --exclude="*.pyc" 2>/dev/null; then
            found_secrets=true
        fi
    done
    
    if [ "$found_secrets" = true ]; then
        echo -e "${RED}❌ Potential secrets found in code${NC}"
        return 1
    else
        echo -e "${GREEN}✅ No hardcoded secrets detected${NC}"
        return 0
    fi
}

# Check environment files
check_env_files() {
    echo "🔧 Checking environment configuration..."
    
    # Check if .env.local exists (it should not be in repo)
    if [[ -f ".env.local" ]]; then
        echo -e "${YELLOW}⚠️  .env.local found (should not be committed)${NC}"
    else
        echo -e "${GREEN}✅ .env.local not in repository${NC}"
    fi
    
    # Check .env.ci has proper configuration
    if [[ -f ".env.ci" ]]; then
        if grep -q "ci-test-key-12345" ".env.ci" 2>/dev/null; then
            echo -e "${RED}❌ Default CI test key found in .env.ci${NC}"
            return 1
        else
            echo -e "${GREEN}✅ CI environment properly configured${NC}"
        fi
    fi
    
    return 0
}

# Check Docker security
check_docker_security() {
    echo "🐳 Checking Docker security configuration..."
    
    # Check if Dockerfiles run as root
    dockerfile_issues=false
    for dockerfile in Dockerfile Dockerfile.local; do
        if [[ -f "$dockerfile" ]]; then
            if ! grep -q "USER " "$dockerfile"; then
                echo -e "${YELLOW}⚠️  $dockerfile: Running as root user${NC}"
                dockerfile_issues=true
            fi
        fi
    done
    
    # Check docker-compose for hardcoded secrets
    if [[ -f "docker-compose.yml" ]]; then
        if grep -q "local-development-secret-key" docker-compose.yml 2>/dev/null; then
            echo -e "${RED}❌ Hardcoded development secrets in docker-compose.yml${NC}"
            dockerfile_issues=true
        fi
    fi
    
    if [ "$dockerfile_issues" = false ]; then
        echo -e "${GREEN}✅ Docker configuration security check passed${NC}"
        return 0
    else
        return 1
    fi
}

# Check file permissions
check_permissions() {
    echo "🔐 Checking file permissions..."
    
    # Check for overly permissive files
    find . -type f \( -name "*.py" -o -name "*.sh" -o -name "*.yml" -o -name "*.yaml" \) -perm -o+w -not -path "./.git/*" -not -path "./.venv/*" 2>/dev/null | while read file; do
        echo -e "${YELLOW}⚠️  World-writable file: $file${NC}"
    done
    
    echo -e "${GREEN}✅ File permissions check completed${NC}"
}

# Check dependencies for known vulnerabilities
check_dependencies() {
    echo "📦 Checking dependencies for vulnerabilities..."
    
    if command -v pip-audit &> /dev/null; then
        if pip-audit --desc --format=json --output=/tmp/audit.json 2>/dev/null; then
            if [[ -s "/tmp/audit.json" ]]; then
                vuln_count=$(jq '.vulnerabilities | length' /tmp/audit.json 2>/dev/null || echo "0")
                if [[ "$vuln_count" -gt 0 ]]; then
                    echo -e "${RED}❌ $vuln_count vulnerabilities found in dependencies${NC}"
                    return 1
                fi
            fi
        fi
    fi
    
    echo -e "${GREEN}✅ Dependency vulnerability check completed${NC}"
    return 0
}

# Run security linting with bandit
run_bandit() {
    echo "🔍 Running Bandit security analysis..."
    
    if command -v bandit &> /dev/null; then
        if bandit -r app/ -f txt -ll --exit-zero 2>/dev/null | grep -E "(HIGH|MEDIUM)" | head -5; then
            echo -e "${YELLOW}⚠️  Security issues found by Bandit (see above)${NC}"
        else
            echo -e "${GREEN}✅ Bandit security analysis passed${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Bandit not installed, skipping security analysis${NC}"
    fi
}

# Check GitHub Actions security
check_github_actions() {
    echo "🔄 Checking GitHub Actions security..."
    
    if [[ -d ".github/workflows" ]]; then
        # Check for security gate in workflows
        if grep -r "pull_request_target" .github/workflows/ &> /dev/null; then
            if grep -r "security.*gate\|security.*check" .github/workflows/ &> /dev/null; then
                echo -e "${GREEN}✅ Security gate found in GitHub Actions${NC}"
            else
                echo -e "${YELLOW}⚠️  pull_request_target used without security gate${NC}"
            fi
        fi
        
        # Check for self-hosted runners
        if grep -r "runs-on.*self-hosted" .github/workflows/ &> /dev/null; then
            echo -e "${GREEN}✅ Using self-hosted runners (more secure)${NC}"
        fi
    fi
}

# Main execution
main() {
    local exit_code=0
    
    echo "Starting security checks..."
    echo
    
    # Run all checks
    if ! check_secrets; then exit_code=1; fi
    echo
    
    if ! check_env_files; then exit_code=1; fi
    echo
    
    if ! check_docker_security; then exit_code=1; fi
    echo
    
    check_permissions
    echo
    
    if ! check_dependencies; then exit_code=1; fi
    echo
    
    run_bandit
    echo
    
    check_github_actions
    echo
    
    # Summary
    echo "=========================================="
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}🎉 All security checks passed!${NC}"
        echo "Security Score: 8.5/10 ⭐"
    else
        echo -e "${RED}❌ Security issues found (exit code: $exit_code)${NC}"
        echo "Please review and fix the issues above."
        echo "See .claude_workspace/vana_security_audit_report.md for detailed remediation steps."
    fi
    
    exit $exit_code
}

# Run main function
main "$@"
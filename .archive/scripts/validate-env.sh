#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REQUIRED_PYTHON="3.13"
ENV_FILE=".env.local"
ENV_EXAMPLE=".env.example"

# Success/failure tracking
VALIDATION_FAILED=0

# Functions
log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; VALIDATION_FAILED=1; }

echo "🔍 Validating VANA Development Environment"
echo "=========================================="

# Check Python version
echo -e "\n📋 Checking Python version..."
if command -v python3.13 &>/dev/null; then
    PYTHON_VERSION=$(python3.13 --version | cut -d' ' -f2)
    log_info "Python $PYTHON_VERSION found"
else
    if command -v python3 &>/dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
        PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
        
        if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 13 ]; then
            log_info "Python $PYTHON_VERSION found (compatible)"
        else
            log_error "Python 3.13+ required, found $PYTHON_VERSION"
            log_warn "Install with: brew install python@3.13"
        fi
    else
        log_error "Python not found"
        log_warn "Install with: brew install python@3.13"
    fi
fi

# Check Poetry
echo -e "\n📦 Checking Poetry..."
if command -v poetry &>/dev/null; then
    POETRY_VERSION=$(poetry --version | cut -d' ' -f3)
    log_info "Poetry $POETRY_VERSION found"
else
    log_error "Poetry not found"
    log_warn "Install with: curl -sSL https://install.python-poetry.org | python3 -"
fi

# Check Node.js
echo -e "\n📦 Checking Node.js..."
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    log_info "Node.js $NODE_VERSION found"
else
    log_error "Node.js not found"
    log_warn "Install with: brew install node"
fi

# Check npm
echo -e "\n📦 Checking npm..."
if command -v npm &>/dev/null; then
    NPM_VERSION=$(npm --version)
    log_info "npm $NPM_VERSION found"
else
    log_error "npm not found"
    log_warn "Install with Node.js: brew install node"
fi

# Check Docker (optional)
echo -e "\n🐳 Checking Docker (optional)..."
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | sed 's/,$//')
    log_info "Docker $DOCKER_VERSION found and running"
else
    log_warn "Docker not available (optional)"
fi

# Check environment file
echo -e "\n🔐 Checking environment configuration..."
if [ -f "$ENV_FILE" ]; then
    log_info "$ENV_FILE exists"
    
    # Check for required environment variables
    if [ -f "$ENV_FILE" ]; then
        # Source the env file in a subshell to avoid polluting current environment
        (
            set -a
            source "$ENV_FILE" 2>/dev/null
            set +a
            
            if [ -z "$GOOGLE_API_KEY" ] || [ "$GOOGLE_API_KEY" = "your-google-api-key" ]; then
                log_error "GOOGLE_API_KEY not configured in $ENV_FILE"
                log_warn "Get your API key from: https://aistudio.google.com/apikey"
            else
                log_info "GOOGLE_API_KEY is configured"
            fi
            
            if [ -z "$VANA_MODEL" ]; then
                log_warn "VANA_MODEL not set (will use default)"
            else
                log_info "VANA_MODEL: $VANA_MODEL"
            fi
            
            if [ -z "$VANA_PORT" ]; then
                log_warn "VANA_PORT not set (will use default 8081)"
            else
                log_info "VANA_PORT: $VANA_PORT"
            fi
        )
    fi
else
    log_warn "$ENV_FILE not found"
    if [ -f "$ENV_EXAMPLE" ]; then
        log_info "You can create it with: cp $ENV_EXAMPLE $ENV_FILE"
    else
        log_error "$ENV_EXAMPLE not found - cannot create environment file"
    fi
fi

# Check Python dependencies
echo -e "\n📚 Checking Python dependencies..."
if [ -f "pyproject.toml" ]; then
    if [ -d ".venv" ] || poetry env info &>/dev/null 2>&1; then
        log_info "Poetry environment exists"
    else
        log_warn "Poetry environment not created"
        log_info "Run: poetry install"
    fi
else
    log_error "pyproject.toml not found"
fi

# Check frontend dependencies
echo -e "\n📚 Checking frontend dependencies..."
if [ -d "vana-ui/node_modules" ]; then
    log_info "Frontend dependencies installed"
else
    log_warn "Frontend dependencies not installed"
    log_info "Run: cd vana-ui && npm install"
fi

# Check for git
echo -e "\n🔧 Checking git..."
if command -v git &>/dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    log_info "Git $GIT_VERSION found"
    
    # Check if we're in a git repo
    if git rev-parse --git-dir &>/dev/null 2>&1; then
        BRANCH=$(git branch --show-current)
        log_info "Git repository detected (branch: $BRANCH)"
    else
        log_warn "Not in a git repository"
    fi
else
    log_error "Git not found"
fi

# Summary
echo -e "\n=========================================="
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Environment validation passed!${NC}"
    echo -e "\nNext steps:"
    echo "1. Ensure GOOGLE_API_KEY is set in .env.local"
    echo "2. Run 'make setup' to install dependencies"
    echo "3. Run 'make dev' to start development"
else
    echo -e "${RED}❌ Environment validation failed${NC}"
    echo -e "\nPlease fix the issues above before continuing."
    exit 1
fi
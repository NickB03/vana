#!/bin/bash
# start-dev.sh - Intelligent development environment starter

set -euo pipefail

# Configuration
REQUIRED_PYTHON="3.13"
BACKEND_PORT=8081
FRONTEND_PORT=5173

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() { echo -e "${BLUE}→${NC} $1"; }

# Banner
print_banner() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════╗"
    echo "║        VANA Development Setup         ║"
    echo "╚═══════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check requirements function
check_requirements() {
    local requirements_met=true
    
    # Check Python version
    log_step "Checking Python 3.13..."
    if ! python3.13 --version &>/dev/null; then
        if command -v pyenv &>/dev/null; then
            log_warn "Python 3.13 not found. Installing with pyenv..."
            pyenv install 3.13
            pyenv local 3.13
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
                    requirements_met=false
                fi
            else
                log_error "Python not found"
                requirements_met=false
            fi
        fi
    else
        log_info "Python 3.13 found"
    fi
    
    # Check Poetry
    log_step "Checking Poetry..."
    if ! command -v poetry &>/dev/null; then
        log_warn "Poetry not found. Installing..."
        curl -sSL https://install.python-poetry.org | python3 -
        export PATH="$HOME/.local/bin:$PATH"
    else
        log_info "Poetry found"
    fi
    
    # Check Node.js
    log_step "Checking Node.js..."
    if ! command -v node &>/dev/null; then
        log_error "Node.js required. Install with: brew install node"
        requirements_met=false
    else
        log_info "Node.js found"
    fi
    
    if [ "$requirements_met" = false ]; then
        echo -e "\n${RED}Please install missing requirements and try again.${NC}"
        exit 1
    fi
}

# Setup environment function
setup_environment() {
    # Create .env if missing
    if [ ! -f .env.local ]; then
        if [ -f .env.example ]; then
            cp .env.example .env.local
            log_warn "Created .env.local - Please add your GOOGLE_API_KEY"
            log_info "Get your API key from: https://aistudio.google.com/apikey"
            echo -e "${YELLOW}Press Enter after adding your API key to continue...${NC}"
            read -r
        fi
    fi
    
    # Validate environment
    if [ -f .env.local ]; then
        set -a
        source .env.local 2>/dev/null || true
        set +a
        
        if [ -z "${GOOGLE_API_KEY:-}" ] || [ "${GOOGLE_API_KEY}" = "your-google-api-key" ]; then
            log_error "GOOGLE_API_KEY not configured in .env.local"
            echo -e "${YELLOW}Please add your API key to .env.local and restart${NC}"
            exit 1
        fi
    fi
    
    # Install dependencies if needed
    if [ ! -d ".venv" ] && ! poetry env info &>/dev/null 2>&1; then
        log_step "Installing Python dependencies..."
        poetry install
    fi
    
    if [ ! -d "vana-ui/node_modules" ]; then
        log_step "Installing frontend dependencies..."
        (cd vana-ui && npm install)
    fi
}

# Docker check function
check_docker() {
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        if command -v docker-compose &>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Start with Docker
start_docker() {
    log_info "Starting with Docker Compose..."
    
    # Create docker override for local development if it doesn't exist
    if [ ! -f docker-compose.override.yml ]; then
        cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  backend:
    env_file: .env.local
    volumes:
      - .:/app:cached
      - /app/.venv
    command: poetry run python main.py --reload
    
  frontend:
    volumes:
      - ./vana-ui:/app:cached
      - /app/node_modules
EOF
        log_info "Created docker-compose.override.yml for local development"
    fi
    
    docker-compose up
}

# Start without Docker
start_local() {
    log_info "Starting with local processes..."
    ./start-vana-ui.sh
}

# Main execution
main() {
    print_banner
    
    log_step "Initializing VANA Development Environment"
    
    # Check and setup
    check_requirements
    setup_environment
    
    # Choose startup method
    echo -e "\n${GREEN}Select startup method:${NC}"
    if check_docker; then
        echo "1) Docker Compose (recommended)"
        echo "2) Local processes"
        echo -n "Choice [1]: "
        read -r choice
        
        case "${choice:-1}" in
            1)
                start_docker
                ;;
            2)
                start_local
                ;;
            *)
                log_error "Invalid choice"
                exit 1
                ;;
        esac
    else
        log_warn "Docker not available, using local processes..."
        start_local
    fi
}

# Handle script arguments
case "${1:-}" in
    --docker)
        print_banner
        start_docker
        ;;
    --local)
        print_banner
        check_requirements
        setup_environment
        start_local
        ;;
    --help|-h)
        echo "Usage: $0 [--docker|--local|--help]"
        echo "  --docker  Force Docker Compose startup"
        echo "  --local   Force local process startup"
        echo "  --help    Show this help message"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
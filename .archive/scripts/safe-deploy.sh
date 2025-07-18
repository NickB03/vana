#!/bin/bash
# Safe deployment script for VANA
# Prevents common directory-related deployment failures

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get the script's directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to validate we're in the correct directory
validate_directory() {
    local current_dir=$(pwd)
    
    if [[ "$current_dir" != "$PROJECT_ROOT" ]]; then
        print_error "Wrong directory! You are in: $current_dir"
        print_error "Must deploy from: $PROJECT_ROOT"
        echo ""
        echo "Run this command to fix:"
        echo "  cd $PROJECT_ROOT"
        exit 1
    fi
    
    print_status "Directory check passed: $current_dir"
}

# Function to validate project structure
validate_project_structure() {
    local errors=0
    
    # Check for Dockerfile
    if [[ ! -f "Dockerfile" ]]; then
        print_error "Dockerfile not found!"
        ((errors++))
    else
        print_status "Dockerfile found"
    fi
    
    # Check for main.py
    if [[ ! -f "main.py" ]]; then
        print_error "main.py not found!"
        ((errors++))
    else
        print_status "main.py found"
    fi
    
    # Check for vana-ui directory
    if [[ ! -d "vana-ui" ]]; then
        print_error "vana-ui directory not found!"
        ((errors++))
    else
        print_status "vana-ui directory found"
    fi
    
    # Check file count
    local file_count=$(find . -type f -not -path "./.git/*" -not -path "./venv/*" -not -path "./.venv/*" | wc -l)
    if [[ $file_count -lt 500 ]]; then
        print_warning "Low file count: $file_count files (expected ~795)"
        print_warning "This might indicate missing files or wrong directory"
    else
        print_status "File count looks good: $file_count files"
    fi
    
    if [[ $errors -gt 0 ]]; then
        print_error "Project structure validation failed!"
        exit 1
    fi
}

# Function to build frontend
build_frontend() {
    print_status "Building frontend..."
    
    if [[ ! -f "vana-ui/package.json" ]]; then
        print_error "vana-ui/package.json not found!"
        exit 1
    fi
    
    # Use subshell to avoid changing directory
    (
        cd vana-ui
        npm run build
    )
    
    if [[ ! -f "vana-ui/dist/index.html" ]]; then
        print_error "Frontend build failed - dist/index.html not created!"
        exit 1
    fi
    
    print_status "Frontend built successfully"
}

# Function to deploy to Cloud Run
deploy_to_cloud_run() {
    local service_name=$1
    local extra_args=${2:-""}
    
    print_status "Deploying to $service_name..."
    
    # Base deployment command
    local deploy_cmd="gcloud run deploy $service_name \
        --source . \
        --region=us-central1 \
        --allow-unauthenticated \
        --set-env-vars=\"USE_OFFICIAL_AGENT_TOOL=true,USE_ADK_COORDINATION=true,USE_ADK_EVENTS=true,GOOGLE_API_KEY=\$GOOGLE_API_KEY\" \
        --port=8081 \
        --memory=2Gi \
        --cpu=2 \
        --timeout=900"
    
    # Add extra arguments if provided
    if [[ -n "$extra_args" ]]; then
        deploy_cmd="$deploy_cmd $extra_args"
    fi
    
    # Execute deployment
    eval $deploy_cmd
}

# Main script
main() {
    echo "=== VANA Safe Deployment Script ==="
    echo ""
    
    # Parse command line arguments
    if [[ $# -eq 0 ]]; then
        print_error "Usage: $0 <staging|production> [--skip-frontend-build]"
        exit 1
    fi
    
    local target=$1
    local skip_frontend=false
    
    if [[ "${2:-}" == "--skip-frontend-build" ]]; then
        skip_frontend=true
    fi
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run validations
    echo "Running pre-deployment checks..."
    validate_directory
    validate_project_structure
    
    # Build frontend unless skipped
    if [[ "$skip_frontend" == false ]]; then
        build_frontend
    else
        print_warning "Skipping frontend build as requested"
    fi
    
    # Deploy based on target
    case $target in
        staging)
            deploy_to_cloud_run "vana-staging" "--max-instances=10"
            ;;
        production)
            print_warning "Deploying to PRODUCTION!"
            read -p "Are you sure? (yes/no): " confirm
            if [[ "$confirm" == "yes" ]]; then
                deploy_to_cloud_run "vana-prod" "--max-instances=50"
            else
                print_error "Production deployment cancelled"
                exit 1
            fi
            ;;
        *)
            print_error "Unknown target: $target"
            print_error "Valid targets: staging, production"
            exit 1
            ;;
    esac
    
    print_status "Deployment completed!"
}

# Run main function
main "$@"
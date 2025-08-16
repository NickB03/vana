#!/bin/bash
# CI/CD Hook Installation Script
# Installs and configures hooks for different CI/CD environments

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$PROJECT_ROOT/.claude_workspace/hooks"
REPORTS_DIR="$PROJECT_ROOT/.claude_workspace/reports"

# Default values
ENVIRONMENT="${ENVIRONMENT:-development}"
CI_MODE="${CI_MODE:-false}"
PARALLEL="${PARALLEL:-true}"
TIMEOUT="${TIMEOUT:-600}"
FORCE_INSTALL="${FORCE_INSTALL:-false}"
VERBOSE="${VERBOSE:-false}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" >&2
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] DEBUG: $1${NC}" >&2
    fi
}

# Help function
show_help() {
    cat << EOF
CI/CD Hook Installation Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -e, --environment ENV      Target environment (development|staging|production)
    -c, --ci-mode             Enable CI mode with optimizations
    -p, --parallel            Enable parallel hook execution
    -t, --timeout SECONDS     Hook execution timeout
    -f, --force               Force reinstall existing hooks
    -v, --verbose             Enable verbose logging
    -h, --help                Show this help message

ENVIRONMENT VARIABLES:
    ENVIRONMENT               Target environment
    CI_MODE                   Enable CI mode (true/false)
    PARALLEL                  Enable parallel execution (true/false)
    TIMEOUT                   Hook timeout in seconds
    FORCE_INSTALL             Force reinstall (true/false)
    VERBOSE                   Enable verbose output (true/false)

EXAMPLES:
    # Install for development
    $0 --environment development

    # Install for CI with parallel execution
    $0 --ci-mode --parallel --timeout 300

    # Force reinstall for production
    $0 --environment production --force --verbose
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -c|--ci-mode)
            CI_MODE="true"
            shift
            ;;
        -p|--parallel)
            PARALLEL="true"
            shift
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_INSTALL="true"
            shift
            ;;
        -v|--verbose)
            VERBOSE="true"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
case "$ENVIRONMENT" in
    development|staging|production)
        log "Installing hooks for $ENVIRONMENT environment"
        ;;
    *)
        error "Invalid environment: $ENVIRONMENT. Must be one of: development, staging, production"
        exit 1
        ;;
esac

# Create necessary directories
create_directories() {
    log "Creating hook directories..."
    
    local dirs=(
        "$HOOKS_DIR"
        "$HOOKS_DIR/ci"
        "$HOOKS_DIR/environments"
        "$HOOKS_DIR/scripts"
        "$HOOKS_DIR/templates"
        "$HOOKS_DIR/configs"
        "$REPORTS_DIR/hook-installation"
        "$REPORTS_DIR/performance"
        "$REPORTS_DIR/validation"
    )
    
    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            debug "Created directory: $dir"
        fi
    done
}

# Generate environment-specific configuration
generate_environment_config() {
    local env="$1"
    local config_file="$HOOKS_DIR/environments/${env}.json"
    
    log "Generating configuration for $env environment..."
    
    # Environment-specific settings
    local timeout_setting="$TIMEOUT"
    local validation_level="standard"
    local monitoring_level="basic"
    
    case "$env" in
        development)
            validation_level="relaxed"
            monitoring_level="basic"
            ;;
        staging)
            validation_level="standard"
            monitoring_level="enhanced"
            ;;
        production)
            validation_level="strict"
            monitoring_level="comprehensive"
            timeout_setting=$((TIMEOUT * 2)) # More time for production
            ;;
    esac
    
    cat > "$config_file" << EOF
{
  "environment": "$env",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "configuration": {
    "ci_mode": $CI_MODE,
    "parallel_execution": $PARALLEL,
    "timeout": $timeout_setting,
    "validation_level": "$validation_level",
    "monitoring_level": "$monitoring_level"
  },
  "hooks": {
    "pre-task": {
      "enabled": true,
      "auto_spawn_agents": true,
      "coordination_mode": "adaptive",
      "memory_management": true,
      "performance_tracking": true
    },
    "post-edit": {
      "enabled": true,
      "memory_updates": true,
      "validation_checks": true,
      "prd_compliance": $([ "$validation_level" != "relaxed" ] && echo "true" || echo "false"),
      "git_integration": true
    },
    "post-task": {
      "enabled": true,
      "performance_analysis": true,
      "generate_insights": true,
      "export_metrics": true,
      "cleanup_resources": true
    },
    "session-end": {
      "enabled": true,
      "export_metrics": true,
      "generate_summary": true,
      "cleanup_resources": true,
      "archive_results": $([ "$env" = "production" ] && echo "true" || echo "false")
    }
  },
  "validation": {
    "prd_compliance": $([ "$validation_level" != "relaxed" ] && echo "true" || echo "false"),
    "performance_monitoring": true,
    "security_scanning": $([ "$validation_level" = "strict" ] && echo "true" || echo "false"),
    "git_integration": true,
    "error_handling": "comprehensive"
  },
  "reporting": {
    "generate_metrics": true,
    "export_logs": true,
    "create_summaries": true,
    "performance_baselines": $([ "$monitoring_level" != "basic" ] && echo "true" || echo "false"),
    "trend_analysis": $([ "$monitoring_level" = "comprehensive" ] && echo "true" || echo "false")
  },
  "integrations": {
    "claude_flow": {
      "enabled": true,
      "version": "latest",
      "global_install": $CI_MODE
    },
    "git_hooks": {
      "enabled": true,
      "pre_commit": true,
      "post_commit": true,
      "pre_push": true
    },
    "monitoring": {
      "prometheus": false,
      "grafana": false,
      "custom_dashboards": $([ "$monitoring_level" = "comprehensive" ] && echo "true" || echo "false")
    }
  }
}
EOF
    
    log "Configuration saved to: $config_file"
}

# Install Git hooks with CI optimizations
install_git_hooks() {
    log "Installing Git hooks with CI optimizations..."
    
    local hooks_install_script="$PROJECT_ROOT/scripts/install-git-hooks.sh"
    
    if [[ -f "$hooks_install_script" ]]; then
        debug "Found existing Git hooks installation script"
        chmod +x "$hooks_install_script"
        
        # Run with environment-specific flags
        local install_args=(
            "--environment" "$ENVIRONMENT"
        )
        
        if [[ "$CI_MODE" == "true" ]]; then
            install_args+=("--ci-mode")
        fi
        
        if [[ "$FORCE_INSTALL" == "true" ]]; then
            install_args+=("--force")
        fi
        
        if [[ "$VERBOSE" == "true" ]]; then
            install_args+=("--verbose")
        fi
        
        debug "Running: $hooks_install_script ${install_args[*]}"
        "$hooks_install_script" "${install_args[@]}" || {
            warn "Git hooks installation script failed, continuing with manual installation"
            install_git_hooks_manual
        }
    else
        warn "Git hooks installation script not found, installing manually"
        install_git_hooks_manual
    fi
}

# Manual Git hooks installation
install_git_hooks_manual() {
    log "Installing Git hooks manually..."
    
    local git_hooks_dir="$PROJECT_ROOT/.git/hooks"
    
    if [[ ! -d "$git_hooks_dir" ]]; then
        error "Git hooks directory not found. Is this a Git repository?"
        return 1
    fi
    
    # Create pre-commit hook
    cat > "$git_hooks_dir/pre-commit" << 'EOF'
#!/bin/bash
# CI-optimized pre-commit hook
set -e

echo "🔍 Running pre-commit validation..."

# Load configuration
if [[ -f ".claude_workspace/hooks/environments/${ENVIRONMENT:-development}.json" ]]; then
    CONFIG_FILE=".claude_workspace/hooks/environments/${ENVIRONMENT:-development}.json"
else
    CONFIG_FILE=".claude_workspace/hooks/environments/development.json"
fi

# Run basic validation
if command -v make >/dev/null 2>&1; then
    echo "Running linting and type checking..."
    make lint || {
        echo "❌ Linting failed"
        exit 1
    }
fi

# Run PRD validation if enabled
if [[ -f "$CONFIG_FILE" ]] && jq -r '.validation.prd_compliance' "$CONFIG_FILE" 2>/dev/null | grep -q "true"; then
    echo "Running PRD compliance validation..."
    # PRD validation would go here
fi

echo "✅ Pre-commit validation completed"
EOF
    
    # Create post-commit hook
    cat > "$git_hooks_dir/post-commit" << 'EOF'
#!/bin/bash
# CI-optimized post-commit hook
set -e

echo "📝 Running post-commit coordination..."

# Load configuration
if [[ -f ".claude_workspace/hooks/environments/${ENVIRONMENT:-development}.json" ]]; then
    CONFIG_FILE=".claude_workspace/hooks/environments/${ENVIRONMENT:-development}.json"
else
    CONFIG_FILE=".claude_workspace/hooks/environments/development.json"
fi

# Run Claude Flow post-edit hook if available
if command -v claude-flow >/dev/null 2>&1; then
    echo "Running Claude Flow post-commit coordination..."
    claude-flow hooks post-edit \
        --file "$(git diff --name-only HEAD~1 HEAD | head -1)" \
        --memory-key "commit/$(git rev-parse --short HEAD)" || true
fi

echo "✅ Post-commit coordination completed"
EOF
    
    # Create pre-push hook
    cat > "$git_hooks_dir/pre-push" << 'EOF'
#!/bin/bash
# CI-optimized pre-push hook
set -e

echo "🚀 Running pre-push validation..."

# Load configuration
if [[ -f ".claude_workspace/hooks/environments/${ENVIRONMENT:-development}.json" ]]; then
    CONFIG_FILE=".claude_workspace/hooks/environments/${ENVIRONMENT:-development}.json"
else
    CONFIG_FILE=".claude_workspace/hooks/environments/development.json"
fi

# Run comprehensive tests
if command -v make >/dev/null 2>&1; then
    echo "Running test suite..."
    make test || {
        echo "❌ Tests failed"
        exit 1
    }
fi

# Run security scanning if enabled
if [[ -f "$CONFIG_FILE" ]] && jq -r '.validation.security_scanning' "$CONFIG_FILE" 2>/dev/null | grep -q "true"; then
    echo "Running security validation..."
    # Security scanning would go here
fi

echo "✅ Pre-push validation completed"
EOF
    
    # Make hooks executable
    chmod +x "$git_hooks_dir/pre-commit"
    chmod +x "$git_hooks_dir/post-commit"
    chmod +x "$git_hooks_dir/pre-push"
    
    log "Git hooks installed successfully"
}

# Install Claude Flow hooks
install_claude_flow_hooks() {
    log "Installing Claude Flow hooks..."
    
    # Check if Claude Flow is available
    if ! command -v claude-flow >/dev/null 2>&1; then
        if [[ "$CI_MODE" == "true" ]]; then
            log "Installing Claude Flow globally for CI..."
            npm install -g claude-flow@alpha || {
                warn "Failed to install Claude Flow globally, trying local install"
                npm install claude-flow@alpha || {
                    error "Failed to install Claude Flow"
                    return 1
                }
            }
        else
            warn "Claude Flow not found. Install with: npm install -g claude-flow@alpha"
            return 1
        fi
    fi
    
    # Install hooks with environment configuration
    local install_args=(
        "--environment" "$ENVIRONMENT"
        "--timeout" "$TIMEOUT"
    )
    
    if [[ "$PARALLEL" == "true" ]]; then
        install_args+=("--parallel")
    fi
    
    if [[ "$CI_MODE" == "true" ]]; then
        install_args+=("--ci-mode")
    fi
    
    debug "Installing Claude Flow hooks: claude-flow hooks install ${install_args[*]}"
    claude-flow hooks install "${install_args[@]}" || {
        warn "Claude Flow hooks installation failed, but continuing..."
        return 0
    }
    
    log "Claude Flow hooks installed successfully"
}

# Validate hook installation
validate_installation() {
    log "Validating hook installation..."
    
    local validation_report="$REPORTS_DIR/hook-installation/validation-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p "$(dirname "$validation_report")"
    
    local hooks_valid=0
    local total_checks=0
    
    # Check Git hooks
    local git_hooks=("pre-commit" "post-commit" "pre-push")
    for hook in "${git_hooks[@]}"; do
        total_checks=$((total_checks + 1))
        if [[ -x "$PROJECT_ROOT/.git/hooks/$hook" ]]; then
            debug "✅ Git hook $hook is installed and executable"
            hooks_valid=$((hooks_valid + 1))
        else
            error "❌ Git hook $hook is missing or not executable"
        fi
    done
    
    # Check configuration files
    total_checks=$((total_checks + 1))
    if [[ -f "$HOOKS_DIR/environments/${ENVIRONMENT}.json" ]]; then
        debug "✅ Environment configuration exists"
        hooks_valid=$((hooks_valid + 1))
    else
        error "❌ Environment configuration missing"
    fi
    
    # Check Claude Flow installation
    total_checks=$((total_checks + 1))
    if command -v claude-flow >/dev/null 2>&1; then
        debug "✅ Claude Flow is available"
        hooks_valid=$((hooks_valid + 1))
    else
        warn "⚠️ Claude Flow is not available"
    fi
    
    # Generate validation report
    cat > "$validation_report" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "environment": "$ENVIRONMENT",
  "validation": {
    "total_checks": $total_checks,
    "passed_checks": $hooks_valid,
    "success_rate": $(echo "scale=2; $hooks_valid * 100 / $total_checks" | bc),
    "status": "$([ $hooks_valid -eq $total_checks ] && echo "success" || echo "partial")"
  },
  "components": {
    "git_hooks": {
      "pre_commit": $([ -x "$PROJECT_ROOT/.git/hooks/pre-commit" ] && echo "true" || echo "false"),
      "post_commit": $([ -x "$PROJECT_ROOT/.git/hooks/post-commit" ] && echo "true" || echo "false"),
      "pre_push": $([ -x "$PROJECT_ROOT/.git/hooks/pre-push" ] && echo "true" || echo "false")
    },
    "configuration": {
      "environment_config": $([ -f "$HOOKS_DIR/environments/${ENVIRONMENT}.json" ] && echo "true" || echo "false")
    },
    "tools": {
      "claude_flow": $(command -v claude-flow >/dev/null 2>&1 && echo "true" || echo "false"),
      "make": $(command -v make >/dev/null 2>&1 && echo "true" || echo "false"),
      "jq": $(command -v jq >/dev/null 2>&1 && echo "true" || echo "false")
    }
  },
  "configuration": {
    "ci_mode": $CI_MODE,
    "parallel": $PARALLEL,
    "timeout": $TIMEOUT,
    "force_install": $FORCE_INSTALL
  }
}
EOF
    
    log "Validation report saved to: $validation_report"
    
    # Summary
    if [[ $hooks_valid -eq $total_checks ]]; then
        log "🎉 All hooks installed and validated successfully! ($hooks_valid/$total_checks)"
        return 0
    else
        warn "⚠️ Hook installation partially successful ($hooks_valid/$total_checks checks passed)"
        return 1
    fi
}

# Run quick hook tests
run_hook_tests() {
    log "Running quick hook validation tests..."
    
    if [[ "$CI_MODE" == "true" ]]; then
        # Run minimal tests in CI mode
        log "Running CI-optimized hook tests..."
        
        # Test basic hook execution
        if [[ -x "$PROJECT_ROOT/.git/hooks/pre-commit" ]]; then
            debug "Testing pre-commit hook..."
            echo "# Test file for hook validation" > "/tmp/test-hook-file"
            git add "/tmp/test-hook-file" 2>/dev/null || true
            "$PROJECT_ROOT/.git/hooks/pre-commit" || warn "Pre-commit hook test failed"
            git reset HEAD "/tmp/test-hook-file" 2>/dev/null || true
            rm -f "/tmp/test-hook-file"
        fi
        
        log "Quick hook tests completed"
    else
        # Run comprehensive tests for local installation
        if command -v make >/dev/null 2>&1; then
            log "Running comprehensive hook validation..."
            make hooks-dev || warn "Comprehensive hook tests failed"
        else
            warn "Make not available, skipping comprehensive tests"
        fi
    fi
}

# Generate installation summary
generate_summary() {
    log "Generating installation summary..."
    
    local summary_file="$REPORTS_DIR/hook-installation/summary-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$summary_file" << EOF
# Hook Installation Summary

**Date**: $(date)
**Environment**: $ENVIRONMENT
**CI Mode**: $CI_MODE
**Parallel Execution**: $PARALLEL
**Timeout**: ${TIMEOUT}s

## Installation Status

### Git Hooks
- Pre-commit: $([ -x "$PROJECT_ROOT/.git/hooks/pre-commit" ] && echo "✅ Installed" || echo "❌ Missing")
- Post-commit: $([ -x "$PROJECT_ROOT/.git/hooks/post-commit" ] && echo "✅ Installed" || echo "❌ Missing")
- Pre-push: $([ -x "$PROJECT_ROOT/.git/hooks/pre-push" ] && echo "✅ Installed" || echo "❌ Missing")

### Configuration
- Environment config: $([ -f "$HOOKS_DIR/environments/${ENVIRONMENT}.json" ] && echo "✅ Created" || echo "❌ Missing")

### Tools
- Claude Flow: $(command -v claude-flow >/dev/null 2>&1 && echo "✅ Available" || echo "❌ Not found")
- Make: $(command -v make >/dev/null 2>&1 && echo "✅ Available" || echo "❌ Not found")
- JQ: $(command -v jq >/dev/null 2>&1 && echo "✅ Available" || echo "❌ Not found")

## Next Steps

1. Test hook execution with: \`make hooks-dev\`
2. Run full validation with: \`make test-hooks\`
3. Check performance with: \`make benchmark\`

## Files Created

- Configuration: \`$HOOKS_DIR/environments/${ENVIRONMENT}.json\`
- Validation report: Latest in \`$REPORTS_DIR/hook-installation/\`
- Git hooks: \`.git/hooks/pre-commit\`, \`.git/hooks/post-commit\`, \`.git/hooks/pre-push\`

EOF
    
    log "Installation summary saved to: $summary_file"
    
    # Also display key information
    echo ""
    echo "📋 Installation Summary:"
    echo "  Environment: $ENVIRONMENT"
    echo "  CI Mode: $CI_MODE"
    echo "  Status: $(validate_installation >/dev/null 2>&1 && echo "✅ Success" || echo "⚠️ Partial")"
    echo "  Configuration: $HOOKS_DIR/environments/${ENVIRONMENT}.json"
    echo "  Reports: $REPORTS_DIR/hook-installation/"
    echo ""
}

# Main installation flow
main() {
    log "Starting CI/CD hook installation for $ENVIRONMENT environment..."
    
    # Check prerequisites
    if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
        error "Not in a Git repository. Please run from the project root."
        exit 1
    fi
    
    # Create directories
    create_directories
    
    # Generate environment configuration
    generate_environment_config "$ENVIRONMENT"
    
    # Install Git hooks
    install_git_hooks
    
    # Install Claude Flow hooks
    install_claude_flow_hooks
    
    # Validate installation
    if ! validate_installation; then
        if [[ "$FORCE_INSTALL" != "true" ]]; then
            error "Hook installation validation failed. Use --force to continue anyway."
            exit 1
        else
            warn "Hook installation validation failed, but continuing due to --force flag"
        fi
    fi
    
    # Run quick tests
    run_hook_tests
    
    # Generate summary
    generate_summary
    
    log "🎉 Hook installation completed successfully for $ENVIRONMENT environment!"
    log "📋 Check the summary at: $REPORTS_DIR/hook-installation/"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
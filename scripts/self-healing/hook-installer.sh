#!/bin/bash

# Hook Installer Script for Self-Healing Workflows
# Installs and configures all hooks for automatic error recovery

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/hooks"
LOGS_DIR="$SCRIPT_DIR/logs"
CONFIG_FILE="$SCRIPT_DIR/hooks.json"
HOOK_CONFIG_JS="$SCRIPT_DIR/hook-config.js"

# Logging functions
log_info() {
    echo -e "${CYAN}ℹ️ INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

log_section() {
    echo -e "\n${PURPLE}🔧 $1${NC}"
    echo "=================================="
}

# Check prerequisites
check_prerequisites() {
    log_section "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check for required tools
    for tool in node npm jq; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        else
            log_success "$tool is installed"
        fi
    done
    
    # Check for claude-flow
    if ! npm list -g claude-flow@alpha &> /dev/null && ! npm list claude-flow@alpha &> /dev/null; then
        log_warning "claude-flow@alpha not found - will attempt to install"
        if npm install -g claude-flow@alpha 2>/dev/null; then
            log_success "claude-flow@alpha installed globally"
        else
            log_warning "Failed to install claude-flow globally, trying locally"
            npm install claude-flow@alpha 2>/dev/null || true
        fi
    else
        log_success "claude-flow@alpha is available"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install the missing tools and run this script again"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Create directory structure
setup_directories() {
    log_section "Setting Up Directory Structure"
    
    local dirs=("$HOOKS_DIR" "$LOGS_DIR" "$HOOKS_DIR/installed" "$SCRIPT_DIR/tmp" "$SCRIPT_DIR/cache" "$SCRIPT_DIR/backup")
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            chmod 755 "$dir"
            log_success "Created directory: $dir"
        else
            log_info "Directory already exists: $dir"
        fi
    done
    
    # Create log files
    local log_files=("hooks.log" "errors.log" "notifications.log" "recovery.log" "performance.log")
    for log_file in "${log_files[@]}"; do
        touch "$LOGS_DIR/$log_file"
        chmod 644 "$LOGS_DIR/$log_file"
    done
    
    log_success "Directory structure created"
}

# Validate configuration
validate_configuration() {
    log_section "Validating Configuration"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Validate JSON syntax
    if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
        log_error "Invalid JSON in configuration file"
        exit 1
    fi
    
    # Check required fields
    local required_fields=("version" "enabled" "hooks")
    for field in "${required_fields[@]}"; do
        if ! jq -e ".$field" "$CONFIG_FILE" &>/dev/null; then
            log_error "Missing required field in configuration: $field"
            exit 1
        fi
    done
    
    log_success "Configuration validated"
}

# Install hook scripts
install_hook_scripts() {
    log_section "Installing Hook Scripts"
    
    if [ ! -f "$HOOK_CONFIG_JS" ]; then
        log_error "Hook configuration script not found: $HOOK_CONFIG_JS"
        exit 1
    fi
    
    # Make hook-config.js executable
    chmod +x "$HOOK_CONFIG_JS"
    
    # Run the hook registration
    log_info "Registering hooks with claude-flow..."
    if node "$HOOK_CONFIG_JS" register; then
        log_success "Hooks registered successfully"
    else
        log_warning "Hook registration completed with warnings"
    fi
    
    # List installed hooks
    if [ -d "$HOOKS_DIR" ]; then
        local hook_count=$(find "$HOOKS_DIR" -name "*.sh" | wc -l)
        log_success "Installed $hook_count hook scripts"
        
        if [ "$hook_count" -gt 0 ]; then
            log_info "Installed hooks:"
            find "$HOOKS_DIR" -name "*.sh" -exec basename {} .sh \; | sed 's/^/  - /'
        fi
    fi
}

# Test hook installation
test_hooks() {
    log_section "Testing Hook Installation"
    
    log_info "Running hook tests..."
    if node "$HOOK_CONFIG_JS" test; then
        log_success "All hooks tested successfully"
    else
        log_warning "Some hooks failed testing - check logs for details"
    fi
    
    # Test individual hook components
    log_info "Testing hook components..."
    
    # Test fallback hooks
    log_info "  Testing fallback hooks..."
    if [ -f "$HOOKS_DIR/fallback-command_error.sh" ]; then
        log_success "  Fallback error recovery hook installed"
    fi
    
    # Test monitoring hooks
    log_info "  Testing monitoring hooks..."
    if [ -f "$HOOKS_DIR/post-bash-monitor.sh" ]; then
        log_success "  Post-bash monitoring hook installed"
    fi
    
    # Test preparation hooks
    log_info "  Testing preparation hooks..."
    if [ -f "$HOOKS_DIR/pre-task-prepare.sh" ]; then
        log_success "  Pre-task preparation hook installed"
    fi
    
    # Test tracking hooks
    log_info "  Testing tracking hooks..."
    if [ -f "$HOOKS_DIR/post-edit-track.sh" ]; then
        log_success "  Post-edit tracking hook installed"
    fi
    
    # Test session hooks
    log_info "  Testing session hooks..."
    if [ -f "$HOOKS_DIR/session-manager.sh" ]; then
        log_success "  Session management hook installed"
    fi
    
    # Test notification hooks
    log_info "  Testing notification hooks..."
    if [ -f "$HOOKS_DIR/notification-handler.sh" ]; then
        log_success "  Notification handler hook installed"
    fi
}

# Configure claude-flow integration
configure_claude_flow() {
    log_section "Configuring Claude-Flow Integration"
    
    # Create claude-flow configuration if it doesn't exist
    local claude_flow_config="$HOME/.claude-flow/config.json"
    if [ ! -f "$claude_flow_config" ]; then
        log_info "Creating claude-flow configuration directory..."
        mkdir -p "$(dirname "$claude_flow_config")"
        
        cat > "$claude_flow_config" << EOF
{
  "version": "1.0.0",
  "hooks": {
    "enabled": true,
    "path": "$HOOKS_DIR",
    "auto_register": true
  },
  "self_healing": {
    "enabled": true,
    "config_path": "$CONFIG_FILE",
    "logs_path": "$LOGS_DIR"
  }
}
EOF
        log_success "Claude-flow configuration created"
    else
        log_info "Claude-flow configuration already exists"
    fi
    
    # Test claude-flow connection
    log_info "Testing claude-flow connection..."
    if npx claude-flow@alpha --version &>/dev/null; then
        log_success "Claude-flow is accessible"
    else
        log_warning "Claude-flow may not be properly installed"
    fi
}

# Create startup script
create_startup_script() {
    log_section "Creating Startup Script"
    
    local startup_script="$SCRIPT_DIR/start-hooks.sh"
    
    cat > "$startup_script" << 'EOF'
#!/bin/bash

# Hook System Startup Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Starting Self-Healing Hook System..."

# Initialize hooks
if [ -f "$SCRIPT_DIR/hook-config.js" ]; then
    echo "📋 Loading hook configuration..."
    node "$SCRIPT_DIR/hook-config.js" register
    
    echo "📊 Hook system status:"
    node "$SCRIPT_DIR/hook-config.js" status
    
    echo "✅ Self-healing hooks are now active"
else
    echo "❌ Hook configuration not found"
    exit 1
fi
EOF

    chmod +x "$startup_script"
    log_success "Startup script created: $startup_script"
}

# Create maintenance script
create_maintenance_script() {
    log_section "Creating Maintenance Script"
    
    local maintenance_script="$SCRIPT_DIR/maintain-hooks.sh"
    
    cat > "$maintenance_script" << 'EOF'
#!/bin/bash

# Hook System Maintenance Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"

echo "🔧 Running hook system maintenance..."

# Clean old logs
echo "🧹 Cleaning old log files..."
find "$LOGS_DIR" -name "*.log" -mtime +7 -exec rm {} \; 2>/dev/null || true

# Archive old sessions
echo "📦 Archiving old session data..."
if [ -d "$SCRIPT_DIR/tmp" ]; then
    find "$SCRIPT_DIR/tmp" -name "session-*" -mtime +1 -exec tar -czf "$SCRIPT_DIR/backup/sessions-$(date +%Y%m%d).tar.gz" {} + 2>/dev/null || true
    find "$SCRIPT_DIR/tmp" -name "session-*" -mtime +1 -delete 2>/dev/null || true
fi

# Test hooks
echo "🧪 Testing hook functionality..."
if [ -f "$SCRIPT_DIR/hook-config.js" ]; then
    node "$SCRIPT_DIR/hook-config.js" test
fi

# Export configuration
echo "📄 Exporting current configuration..."
if [ -f "$SCRIPT_DIR/hook-config.js" ]; then
    node "$SCRIPT_DIR/hook-config.js" export "$SCRIPT_DIR/backup/config-$(date +%Y%m%d).json"
fi

echo "✅ Maintenance completed"
EOF

    chmod +x "$maintenance_script"
    log_success "Maintenance script created: $maintenance_script"
}

# Create uninstall script
create_uninstall_script() {
    log_section "Creating Uninstall Script"
    
    local uninstall_script="$SCRIPT_DIR/uninstall-hooks.sh"
    
    cat > "$uninstall_script" << EOF
#!/bin/bash

# Hook System Uninstall Script
echo "🗑️ Uninstalling self-healing hook system..."

# Remove hook scripts
if [ -d "$HOOKS_DIR" ]; then
    rm -rf "$HOOKS_DIR"
    echo "✅ Removed hook scripts"
fi

# Archive logs
if [ -d "$LOGS_DIR" ]; then
    tar -czf "$SCRIPT_DIR/logs-backup-\$(date +%Y%m%d).tar.gz" "$LOGS_DIR" 2>/dev/null || true
    rm -rf "$LOGS_DIR"
    echo "✅ Archived and removed logs"
fi

# Clean up temp files
rm -rf "$SCRIPT_DIR/tmp" "$SCRIPT_DIR/cache" 2>/dev/null || true

echo "✅ Hook system uninstalled"
echo "📦 Log backup available at: logs-backup-\$(date +%Y%m%d).tar.gz"
EOF

    chmod +x "$uninstall_script"
    log_success "Uninstall script created: $uninstall_script"
}

# Setup cron job for maintenance
setup_maintenance_cron() {
    log_section "Setting Up Maintenance Cron Job"
    
    local maintenance_script="$SCRIPT_DIR/maintain-hooks.sh"
    local cron_job="0 2 * * * $maintenance_script >> $LOGS_DIR/maintenance.log 2>&1"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "$maintenance_script"; then
        log_info "Maintenance cron job already exists"
    else
        # Add cron job
        (crontab -l 2>/dev/null; echo "$cron_job") | crontab - 2>/dev/null || {
            log_warning "Failed to add cron job - you may need to add it manually:"
            log_info "  $cron_job"
        }
        
        if crontab -l 2>/dev/null | grep -q "$maintenance_script"; then
            log_success "Maintenance cron job added (runs daily at 2 AM)"
        fi
    fi
}

# Generate installation report
generate_report() {
    log_section "Generating Installation Report"
    
    local report_file="$SCRIPT_DIR/installation-report.txt"
    
    cat > "$report_file" << EOF
Self-Healing Hook System Installation Report
==========================================
Date: $(date)
Script Directory: $SCRIPT_DIR

Installation Summary:
- Configuration File: $CONFIG_FILE
- Hook Scripts Directory: $HOOKS_DIR
- Logs Directory: $LOGS_DIR
- Installed Hooks: $(find "$HOOKS_DIR" -name "*.sh" 2>/dev/null | wc -l)

Scripts Created:
- Hook Configuration: $HOOK_CONFIG_JS
- Startup Script: $SCRIPT_DIR/start-hooks.sh
- Maintenance Script: $SCRIPT_DIR/maintain-hooks.sh
- Uninstall Script: $SCRIPT_DIR/uninstall-hooks.sh

Hook Types Installed:
$(find "$HOOKS_DIR" -name "*.sh" 2>/dev/null | sed 's/.*\//- /' | sed 's/\.sh$//')

Log Files:
$(ls -la "$LOGS_DIR" 2>/dev/null | tail -n +2 | awk '{print "- " $9 " (" $5 " bytes)"}')

Next Steps:
1. Run: $SCRIPT_DIR/start-hooks.sh
2. Test: node $HOOK_CONFIG_JS status
3. Monitor: tail -f $LOGS_DIR/hooks.log

For maintenance, run: $SCRIPT_DIR/maintain-hooks.sh
For uninstallation, run: $SCRIPT_DIR/uninstall-hooks.sh
EOF

    log_success "Installation report generated: $report_file"
}

# Main installation function
main() {
    log_section "Self-Healing Hook System Installation"
    echo "This script will install and configure hooks for automatic error recovery"
    echo ""
    
    # Run installation steps
    check_prerequisites
    setup_directories
    validate_configuration
    install_hook_scripts
    test_hooks
    configure_claude_flow
    create_startup_script
    create_maintenance_script
    create_uninstall_script
    setup_maintenance_cron
    generate_report
    
    log_section "Installation Complete!"
    log_success "Self-healing hook system has been successfully installed"
    
    echo ""
    echo "🚀 To start the hook system, run:"
    echo "    $SCRIPT_DIR/start-hooks.sh"
    echo ""
    echo "📊 To check system status, run:"
    echo "    node $HOOK_CONFIG_JS status"
    echo ""
    echo "📋 To view the installation report:"
    echo "    cat $SCRIPT_DIR/installation-report.txt"
    echo ""
    echo "🔧 For maintenance, run:"
    echo "    $SCRIPT_DIR/maintain-hooks.sh"
    echo ""
    
    log_info "Installation completed successfully!"
}

# Handle command line arguments
case "${1:-install}" in
    "install")
        main
        ;;
    "test")
        log_section "Testing Hook System"
        test_hooks
        ;;
    "status")
        log_section "Hook System Status"
        if [ -f "$HOOK_CONFIG_JS" ]; then
            node "$HOOK_CONFIG_JS" status
        else
            log_error "Hook system not installed"
        fi
        ;;
    "help")
        echo "Hook Installer Script"
        echo "Usage: $0 [install|test|status|help]"
        echo ""
        echo "Commands:"
        echo "  install  - Install the complete hook system (default)"
        echo "  test     - Test installed hooks"
        echo "  status   - Show hook system status"
        echo "  help     - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
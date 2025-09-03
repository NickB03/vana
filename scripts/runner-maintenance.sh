#!/bin/bash
#
# Self-Hosted Runner Maintenance and Automation
# Daily maintenance tasks and health checks
#

set -e

# Configuration
RUNNER_WORK_DIR="${RUNNER_WORK_DIR:-$HOME/actions-runner}"
BACKUP_DIR="$HOME/runner-backups"
MAX_BACKUP_DAYS=7
MAX_LOG_DAYS=30
HEALTH_CHECK_INTERVAL=3600  # 1 hour

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Daily maintenance tasks
daily_maintenance() {
    log "Starting daily maintenance tasks..."
    
    # 1. Clean up old Docker resources
    log "🐳 Cleaning Docker resources..."
    docker system prune -f --filter "until=24h" 2>/dev/null || warn "Docker cleanup failed"
    docker image prune -f --filter "until=72h" 2>/dev/null || warn "Docker image cleanup failed"
    
    # 2. Clean up old logs
    log "📝 Cleaning old logs..."
    find "$RUNNER_WORK_DIR" -name "*.log*" -mtime +$MAX_LOG_DAYS -delete 2>/dev/null || warn "Log cleanup failed"
    
    # 3. Clean up temp files
    log "🗑️  Cleaning temp files..."
    find /tmp -name "vana-*" -mtime +1 -delete 2>/dev/null || true
    find /tmp -name "actions-*" -mtime +1 -delete 2>/dev/null || true
    
    # 4. Update runner if needed
    check_runner_updates
    
    # 5. Generate health report
    generate_health_report
    
    # 6. Backup runner configuration
    backup_runner_config
    
    log "✅ Daily maintenance completed"
}

# Check for runner updates
check_runner_updates() {
    log "🔄 Checking for runner updates..."
    
    cd "$RUNNER_WORK_DIR"
    
    # Get current version
    local current_version=""
    if [[ -f ".runner" ]]; then
        current_version=$(grep -o '"agentVersion":"[^"]*"' .runner | cut -d'"' -f4 2>/dev/null || echo "unknown")
    fi
    
    # Get latest version from GitHub API
    local latest_version=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/v//')
    
    log "Current version: ${current_version:-unknown}"
    log "Latest version: $latest_version"
    
    if [[ "$current_version" != "$latest_version" && "$current_version" != "unknown" ]]; then
        warn "Runner update available: $current_version -> $latest_version"
        echo "To update, run: ./config.sh remove && ./setup-self-hosted-runner.sh"
    else
        log "Runner is up to date"
    fi
}

# Generate comprehensive health report
generate_health_report() {
    log "📊 Generating health report..."
    
    local report_file="$RUNNER_WORK_DIR/logs/health-report-$(date +%Y%m%d).json"
    local report_dir=$(dirname "$report_file")
    mkdir -p "$report_dir"
    
    # System information
    local memory_info=$(vm_stat)
    local memory_free_gb=$(echo "scale=2; $(echo "$memory_info" | grep "Pages free" | awk '{print $3}' | sed 's/.//') * 4096 / 1024 / 1024 / 1024" | bc)
    local cpu_count=$(sysctl -n hw.ncpu)
    local uptime_days=$(echo "scale=2; $(sysctl -n kern.boottime | awk '{print $4}' | sed 's/,//') / 86400" | bc)
    
    # Runner statistics
    local runner_uptime=0
    if launchctl print gui/$(id -u)/com.vana.actions-runner 2>/dev/null | grep -q "state = running"; then
        runner_uptime=1
    fi
    
    # Docker statistics
    local docker_containers=$(docker ps -q | wc -l | tr -d ' ')
    local docker_images=$(docker images -q | wc -l | tr -d ' ')
    local docker_volumes=$(docker volume ls -q | wc -l | tr -d ' ')
    
    # GitHub API rate limits (optional)
    local rate_limit=""
    if [[ -n "$GITHUB_TOKEN" ]]; then
        rate_limit=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit | jq -r '.rate.remaining')
    fi
    
    # Create JSON report
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "system": {
        "memory_free_gb": $memory_free_gb,
        "cpu_cores": $cpu_count,
        "uptime_days": $uptime_days,
        "platform": "$(uname -s)",
        "architecture": "$(uname -m)"
    },
    "runner": {
        "status": $(if [[ $runner_uptime -eq 1 ]]; then echo "\"running\""; else echo "\"stopped\""; fi),
        "work_directory": "$RUNNER_WORK_DIR",
        "version": "$(grep -o '"agentVersion":"[^"]*"' "$RUNNER_WORK_DIR/.runner" | cut -d'"' -f4 2>/dev/null || echo "unknown")"
    },
    "docker": {
        "containers": $docker_containers,
        "images": $docker_images,
        "volumes": $docker_volumes,
        "disk_usage": "$(docker system df --format 'json' 2>/dev/null | jq -r '.[0].Size' 2>/dev/null || echo "0B")"
    },
    "github": {
        "rate_limit_remaining": $(if [[ -n "$rate_limit" ]]; then echo "$rate_limit"; else echo "null"; fi)
    },
    "health_checks": [
        {
            "name": "runner_process",
            "status": $(if [[ $runner_uptime -eq 1 ]]; then echo "\"pass\""; else echo "\"fail\""; fi),
            "message": $(if [[ $runner_uptime -eq 1 ]]; then echo "\"Runner service is running\""; else echo "\"Runner service is not running\""; fi)
        },
        {
            "name": "docker_service",
            "status": $(if docker info >/dev/null 2>&1; then echo "\"pass\""; else echo "\"fail\""; fi),
            "message": $(if docker info >/dev/null 2>&1; then echo "\"Docker service is accessible\""; else echo "\"Docker service is not accessible\""; fi)
        },
        {
            "name": "disk_space",
            "status": $(if [[ $(df . | tail -1 | awk '{print $5}' | sed 's/%//') -lt 90 ]]; then echo "\"pass\""; else echo "\"warn\""; fi),
            "message": "Disk usage: $(df -h . | tail -1 | awk '{print $5}')"
        },
        {
            "name": "memory_usage",
            "status": $(if (( $(echo "$memory_free_gb > 2" | bc -l) )); then echo "\"pass\""; else echo "\"warn\""; fi),
            "message": "Available memory: ${memory_free_gb}GB"
        }
    ]
}
EOF
    
    log "Health report generated: $report_file"
    
    # Also create human-readable summary
    local summary_file="$RUNNER_WORK_DIR/logs/health-summary-$(date +%Y%m%d).txt"
    cat > "$summary_file" << EOF
Vana Self-Hosted Runner Health Summary
Generated: $(date)

SYSTEM STATUS:
✅ Platform: $(uname -s) $(uname -m)
✅ CPU Cores: $cpu_count
✅ Available Memory: ${memory_free_gb}GB
✅ System Uptime: ${uptime_days} days

RUNNER STATUS:
$(if [[ $runner_uptime -eq 1 ]]; then echo "✅"; else echo "❌"; fi) Runner Service: $(if [[ $runner_uptime -eq 1 ]]; then echo "Running"; else echo "Stopped"; fi)
✅ Work Directory: $RUNNER_WORK_DIR
✅ Version: $(grep -o '"agentVersion":"[^"]*"' "$RUNNER_WORK_DIR/.runner" | cut -d'"' -f4 2>/dev/null || echo "unknown")

DOCKER STATUS:
$(if docker info >/dev/null 2>&1; then echo "✅"; else echo "❌"; fi) Docker Service: $(if docker info >/dev/null 2>&1; then echo "Available"; else echo "Not available"; fi)
📊 Active Containers: $docker_containers
📊 Total Images: $docker_images
📊 Volumes: $docker_volumes

RESOURCE USAGE:
$(if [[ $(df . | tail -1 | awk '{print $5}' | sed 's/%//') -lt 90 ]]; then echo "✅"; else echo "⚠️ "; fi) Disk Usage: $(df -h . | tail -1 | awk '{print $5}')
$(if (( $(echo "$memory_free_gb > 2" | bc -l) )); then echo "✅"; else echo "⚠️ "; fi) Free Memory: ${memory_free_gb}GB

RECENT ACTIVITY:
$(tail -3 "$RUNNER_WORK_DIR/runner.log" 2>/dev/null || echo "No recent logs")

EOF
    
    log "Health summary generated: $summary_file"
}

# Backup runner configuration
backup_runner_config() {
    log "💾 Backing up runner configuration..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_file="$BACKUP_DIR/runner-config-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Create backup
    tar -czf "$backup_file" -C "$RUNNER_WORK_DIR" \
        .runner \
        .credentials \
        .credentials_rsaparams \
        *.json 2>/dev/null || warn "Some configuration files missing"
    
    if [[ -f "$backup_file" ]]; then
        log "Configuration backed up to: $backup_file"
        
        # Clean old backups
        find "$BACKUP_DIR" -name "runner-config-*.tar.gz" -mtime +$MAX_BACKUP_DAYS -delete
        log "Old backups cleaned up (older than $MAX_BACKUP_DAYS days)"
    else
        warn "Backup creation failed"
    fi
}

# Health monitoring with alerts
monitor_health() {
    log "🏥 Starting health monitoring..."
    
    while true; do
        local issues=0
        local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
        
        # Check runner process
        if ! launchctl print gui/$(id -u)/com.vana.actions-runner 2>/dev/null | grep -q "state = running"; then
            error "Runner service is not running!"
            ((issues++))
        fi
        
        # Check Docker service
        if ! docker info >/dev/null 2>&1; then
            error "Docker service is not accessible!"
            ((issues++))
        fi
        
        # Check disk space
        local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
        if [[ $disk_usage -gt 85 ]]; then
            warn "High disk usage: ${disk_usage}%"
            ((issues++))
        fi
        
        # Check memory
        local memory_free=$(echo "scale=2; $(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//') * 4096 / 1024 / 1024 / 1024" | bc)
        if (( $(echo "$memory_free < 1" | bc -l) )); then
            warn "Low memory: ${memory_free}GB available"
            ((issues++))
        fi
        
        # Check for zombie containers
        local zombie_containers=$(docker ps -a --filter "status=exited" --filter "name=vana-" -q | wc -l | tr -d ' ')
        if [[ $zombie_containers -gt 5 ]]; then
            warn "Many zombie containers: $zombie_containers"
            docker container prune -f >/dev/null 2>&1
        fi
        
        if [[ $issues -eq 0 ]]; then
            echo -ne "\r${GREEN}[$timestamp] Health: OK | Memory: ${memory_free}GB | Disk: ${disk_usage}%${NC}"
        else
            echo -ne "\r${RED}[$timestamp] Health: $issues issues detected${NC}"
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Restart runner service
restart_runner() {
    log "🔄 Restarting runner service..."
    
    # Stop service
    launchctl unload ~/Library/LaunchAgents/com.vana.actions-runner.plist 2>/dev/null || true
    sleep 3
    
    # Clean up any running containers
    docker ps --filter "name=vana-*" -q | xargs -r docker stop
    docker container prune -f >/dev/null 2>&1
    
    # Start service
    launchctl load ~/Library/LaunchAgents/com.vana.actions-runner.plist
    sleep 5
    
    # Verify restart
    if launchctl print gui/$(id -u)/com.vana.actions-runner 2>/dev/null | grep -q "state = running"; then
        log "✅ Runner service restarted successfully"
    else
        error "❌ Failed to restart runner service"
        return 1
    fi
}

# Update Docker containers
update_containers() {
    log "🐳 Updating Docker containers..."
    
    # Rebuild Python container
    if docker build -f scripts/docker/Dockerfile.python -t vana-runner-python . >/dev/null 2>&1; then
        log "✅ Python container updated"
    else
        warn "Failed to update Python container"
    fi
    
    # Rebuild Node.js container
    if docker build -f scripts/docker/Dockerfile.node -t vana-runner-node . >/dev/null 2>&1; then
        log "✅ Node.js container updated"
    else
        warn "Failed to update Node.js container"
    fi
    
    # Clean up old images
    docker image prune -f >/dev/null 2>&1
}

# Help message
show_help() {
    cat << EOF
Vana Self-Hosted Runner Maintenance

Usage: $(basename "$0") [COMMAND]

Commands:
    daily           Run daily maintenance tasks (default)
    health          Start health monitoring
    restart         Restart runner service
    update          Update Docker containers
    backup          Backup runner configuration
    report          Generate health report only
    help            Show this help message

Examples:
    $(basename "$0")                    # Run daily maintenance
    $(basename "$0") health             # Start health monitoring
    $(basename "$0") restart            # Restart runner service
    $(basename "$0") update             # Update containers

Configuration:
    RUNNER_WORK_DIR     Runner directory (default: ~/actions-runner)
    BACKUP_DIR          Backup directory (default: ~/runner-backups)
    MAX_BACKUP_DAYS     Keep backups for N days (default: 7)
    MAX_LOG_DAYS        Keep logs for N days (default: 30)
EOF
}

# Main execution
main() {
    case "${1:-daily}" in
        "daily")
            daily_maintenance
            ;;
        "health")
            monitor_health
            ;;
        "restart")
            restart_runner
            ;;
        "update")
            update_containers
            ;;
        "backup")
            backup_runner_config
            ;;
        "report")
            generate_health_report
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Handle cleanup on script exit
cleanup_on_exit() {
    echo -e "\n${GREEN}Maintenance stopped${NC}"
    exit 0
}

trap cleanup_on_exit SIGINT SIGTERM

# Check dependencies
for cmd in bc jq docker; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        case "$cmd" in
            "bc") error "bc is required: brew install bc" ;;
            "jq") error "jq is required: brew install jq" ;;
            "docker") error "Docker is required: install Docker Desktop" ;;
        esac
    fi
done

# Run main function
main "$@"
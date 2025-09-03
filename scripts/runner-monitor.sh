#!/bin/bash
#
# Self-Hosted Runner Monitoring and Optimization
# Real-time resource monitoring and automatic cleanup
#

set -e

# Configuration
RUNNER_WORK_DIR="${RUNNER_WORK_DIR:-$HOME/actions-runner}"
LOG_DIR="$RUNNER_WORK_DIR/logs"
MONITOR_INTERVAL=30
MAX_LOG_SIZE_MB=100
MAX_DOCKER_USAGE_GB=10

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

# Create log directory
mkdir -p "$LOG_DIR"

# Get system metrics
get_system_metrics() {
    # Memory usage
    local memory_info=$(vm_stat)
    local pages_free=$(echo "$memory_info" | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    local pages_total=$(sysctl -n hw.memsize)
    local memory_free_gb=$(echo "scale=2; ($pages_free * 4096) / 1024 / 1024 / 1024" | bc)
    local memory_total_gb=$(echo "scale=2; $pages_total / 1024 / 1024 / 1024" | bc)
    local memory_used_percent=$(echo "scale=1; (1 - $memory_free_gb / $memory_total_gb) * 100" | bc)
    
    # CPU usage
    local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    
    # Disk usage
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    
    # Docker usage
    local docker_usage=""
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        docker_usage=$(docker system df --format "table {{.Size}}" | tail -n +2 | head -1 | sed 's/[^0-9.]//g')
    fi
    
    echo "MEMORY_FREE_GB:$memory_free_gb"
    echo "MEMORY_TOTAL_GB:$memory_total_gb"
    echo "MEMORY_USED_PERCENT:$memory_used_percent"
    echo "CPU_USAGE_PERCENT:$cpu_usage"
    echo "DISK_USAGE_PERCENT:$disk_usage"
    echo "DOCKER_USAGE_GB:${docker_usage:-0}"
}

# Check runner status
check_runner_status() {
    local runner_running=false
    local runner_jobs=0
    
    # Check if runner process is running
    if launchctl list | grep -q "com.vana.actions-runner"; then
        if launchctl print gui/$(id -u)/com.vana.actions-runner 2>/dev/null | grep -q "state = running"; then
            runner_running=true
        fi
    fi
    
    # Count active Docker containers from this runner
    if command -v docker >/dev/null 2>&1; then
        runner_jobs=$(docker ps --filter "name=vana-*" --format "table {{.Names}}" | wc -l | tr -d ' ')
        runner_jobs=$((runner_jobs - 1)) # Subtract header
    fi
    
    echo "RUNNER_RUNNING:$runner_running"
    echo "ACTIVE_JOBS:$runner_jobs"
}

# Performance optimization
optimize_performance() {
    local metrics=$(get_system_metrics)
    local memory_used=$(echo "$metrics" | grep "MEMORY_USED_PERCENT" | cut -d: -f2)
    local docker_usage=$(echo "$metrics" | grep "DOCKER_USAGE_GB" | cut -d: -f2)
    
    # Memory cleanup if usage > 80%
    if (( $(echo "$memory_used > 80" | bc -l) )); then
        warn "High memory usage: ${memory_used}%. Cleaning up..."
        
        # Clean Docker system
        docker system prune -f --filter "until=2h" 2>/dev/null || true
        
        # Clean old logs
        find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
        
        # Clean temp files
        find /tmp -name "vana-*" -mtime +1 -delete 2>/dev/null || true
    fi
    
    # Docker cleanup if usage > threshold
    if (( $(echo "$docker_usage > $MAX_DOCKER_USAGE_GB" | bc -l) )); then
        warn "High Docker usage: ${docker_usage}GB. Cleaning up..."
        
        # Remove old containers
        docker container prune -f --filter "until=24h" 2>/dev/null || true
        
        # Remove unused images (keep base images)
        docker image prune -f --filter "until=48h" 2>/dev/null || true
        
        # Remove unused volumes
        docker volume prune -f 2>/dev/null || true
    fi
}

# Log rotation
rotate_logs() {
    local log_files=("$RUNNER_WORK_DIR/runner.log" "$RUNNER_WORK_DIR/runner.error.log")
    
    for log_file in "${log_files[@]}"; do
        if [[ -f "$log_file" ]]; then
            local size_mb=$(du -m "$log_file" | cut -f1)
            if [[ $size_mb -gt $MAX_LOG_SIZE_MB ]]; then
                log "Rotating log file: $log_file (${size_mb}MB)"
                
                # Keep last 5 rotations
                for i in {4..1}; do
                    [[ -f "${log_file}.$i" ]] && mv "${log_file}.$i" "${log_file}.$((i+1))"
                done
                
                # Rotate current log
                mv "$log_file" "${log_file}.1"
                touch "$log_file"
            fi
        fi
    done
}

# Generate performance report
generate_report() {
    local metrics=$(get_system_metrics)
    local status=$(check_runner_status)
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    
    cat > "$LOG_DIR/performance-report.json" << EOF
{
    "timestamp": "$timestamp",
    "system": {
        "memory_free_gb": $(echo "$metrics" | grep "MEMORY_FREE_GB" | cut -d: -f2),
        "memory_total_gb": $(echo "$metrics" | grep "MEMORY_TOTAL_GB" | cut -d: -f2),
        "memory_used_percent": $(echo "$metrics" | grep "MEMORY_USED_PERCENT" | cut -d: -f2),
        "cpu_usage_percent": $(echo "$metrics" | grep "CPU_USAGE_PERCENT" | cut -d: -f2),
        "disk_usage_percent": $(echo "$metrics" | grep "DISK_USAGE_PERCENT" | cut -d: -f2),
        "docker_usage_gb": $(echo "$metrics" | grep "DOCKER_USAGE_GB" | cut -d: -f2)
    },
    "runner": {
        "running": $(echo "$status" | grep "RUNNER_RUNNING" | cut -d: -f2),
        "active_jobs": $(echo "$status" | grep "ACTIVE_JOBS" | cut -d: -f2)
    }
}
EOF
    
    # Also create human-readable report
    cat > "$LOG_DIR/performance-report.txt" << EOF
Vana Self-Hosted Runner Performance Report
Generated: $timestamp

SYSTEM RESOURCES:
- Memory: $(echo "$metrics" | grep "MEMORY_USED_PERCENT" | cut -d: -f2)% used ($(echo "$metrics" | grep "MEMORY_FREE_GB" | cut -d: -f2)GB free / $(echo "$metrics" | grep "MEMORY_TOTAL_GB" | cut -d: -f2)GB total)
- CPU: $(echo "$metrics" | grep "CPU_USAGE_PERCENT" | cut -d: -f2)% usage
- Disk: $(echo "$metrics" | grep "DISK_USAGE_PERCENT" | cut -d: -f2)% usage
- Docker: $(echo "$metrics" | grep "DOCKER_USAGE_GB" | cut -d: -f2)GB used

RUNNER STATUS:
- Running: $(echo "$status" | grep "RUNNER_RUNNING" | cut -d: -f2)
- Active Jobs: $(echo "$status" | grep "ACTIVE_JOBS" | cut -d: -f2)

DOCKER CONTAINERS:
$(docker ps --filter "name=vana-*" --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" 2>/dev/null || echo "None running")

RECOMMENDATIONS:
$(if (( $(echo "$(echo "$metrics" | grep "MEMORY_USED_PERCENT" | cut -d: -f2) > 80" | bc -l) )); then echo "⚠️  High memory usage - consider restarting runner"; fi)
$(if (( $(echo "$(echo "$metrics" | grep "DOCKER_USAGE_GB" | cut -d: -f2) > $MAX_DOCKER_USAGE_GB" | bc -l) )); then echo "⚠️  High Docker usage - cleanup recommended"; fi)
$(if (( $(echo "$(echo "$status" | grep "ACTIVE_JOBS" | cut -d: -f2) > 3" | bc -l) )); then echo "⚠️  Many active jobs - performance may be affected"; fi)
EOF
}

# Monitoring loop
monitor_runner() {
    log "Starting runner monitoring (interval: ${MONITOR_INTERVAL}s)"
    
    while true; do
        local metrics=$(get_system_metrics)
        local status=$(check_runner_status)
        local memory_used=$(echo "$metrics" | grep "MEMORY_USED_PERCENT" | cut -d: -f2)
        local active_jobs=$(echo "$status" | grep "ACTIVE_JOBS" | cut -d: -f2)
        local runner_running=$(echo "$status" | grep "RUNNER_RUNNING" | cut -d: -f2)
        
        # Display current status
        echo -ne "\r${BLUE}Runner: $runner_running | Jobs: $active_jobs | Memory: ${memory_used}% | $(date +'%H:%M:%S')${NC}"
        
        # Perform maintenance
        optimize_performance
        rotate_logs
        generate_report
        
        # Check for problems
        if [[ "$runner_running" == "false" ]]; then
            warn "Runner is not running!"
        fi
        
        if (( $(echo "$memory_used > 90" | bc -l) )); then
            warn "Critical memory usage: ${memory_used}%"
        fi
        
        sleep $MONITOR_INTERVAL
    done
}

# Show current status
show_status() {
    local metrics=$(get_system_metrics)
    local status=$(check_runner_status)
    
    echo -e "${BLUE}=== Vana Self-Hosted Runner Status ===${NC}"
    echo ""
    
    echo -e "${GREEN}System Resources:${NC}"
    echo "Memory: $(echo "$metrics" | grep "MEMORY_USED_PERCENT" | cut -d: -f2)% used ($(echo "$metrics" | grep "MEMORY_FREE_GB" | cut -d: -f2)GB free)"
    echo "CPU: $(echo "$metrics" | grep "CPU_USAGE_PERCENT" | cut -d: -f2)% usage"
    echo "Disk: $(echo "$metrics" | grep "DISK_USAGE_PERCENT" | cut -d: -f2)% usage"
    echo "Docker: $(echo "$metrics" | grep "DOCKER_USAGE_GB" | cut -d: -f2)GB used"
    echo ""
    
    echo -e "${GREEN}Runner Status:${NC}"
    echo "Running: $(echo "$status" | grep "RUNNER_RUNNING" | cut -d: -f2)"
    echo "Active Jobs: $(echo "$status" | grep "ACTIVE_JOBS" | cut -d: -f2)"
    echo ""
    
    if command -v docker >/dev/null 2>&1; then
        echo -e "${GREEN}Active Containers:${NC}"
        docker ps --filter "name=vana-*" --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" || echo "None running"
    fi
    
    echo ""
    echo -e "${GREEN}Recent Logs:${NC}"
    if [[ -f "$RUNNER_WORK_DIR/runner.log" ]]; then
        tail -5 "$RUNNER_WORK_DIR/runner.log"
    else
        echo "No runner logs found"
    fi
}

# Help message
show_help() {
    cat << EOF
Vana Self-Hosted Runner Monitor

Usage: $(basename "$0") [COMMAND]

Commands:
    monitor     Start continuous monitoring (default)
    status      Show current status
    cleanup     Perform cleanup operations
    report      Generate performance report
    help        Show this help message

Environment Variables:
    RUNNER_WORK_DIR     Runner working directory (default: ~/actions-runner)
    MONITOR_INTERVAL    Monitoring interval in seconds (default: 30)
    MAX_LOG_SIZE_MB     Maximum log file size (default: 100)
    MAX_DOCKER_USAGE_GB Maximum Docker usage before cleanup (default: 10)

Examples:
    $(basename "$0")                    # Start monitoring
    $(basename "$0") status             # Show current status
    $(basename "$0") cleanup            # Clean up resources
    MONITOR_INTERVAL=60 $(basename "$0") monitor  # Monitor every minute
EOF
}

# Main execution
main() {
    case "${1:-monitor}" in
        "monitor")
            monitor_runner
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            log "Performing cleanup operations..."
            optimize_performance
            rotate_logs
            log "Cleanup complete"
            ;;
        "report")
            generate_report
            log "Performance report generated in $LOG_DIR/"
            cat "$LOG_DIR/performance-report.txt"
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
    echo -e "\n${GREEN}Monitoring stopped${NC}"
    exit 0
}

trap cleanup_on_exit SIGINT SIGTERM

# Check dependencies
if ! command -v bc >/dev/null 2>&1; then
    error "bc is required but not installed: brew install bc"
fi

# Run main function
main "$@"
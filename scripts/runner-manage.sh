#!/bin/bash

# GitHub Runner Management Script
# Provides commands to manage the Docker-based runner

set -e

COMPOSE_FILE="docker-compose.runner.yml"
CONTAINER_NAME="vana-runner"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo "GitHub Runner Management Tool"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start    - Start the runner"
    echo "  stop     - Stop the runner"
    echo "  restart  - Restart the runner"
    echo "  status   - Show runner status"
    echo "  logs     - Show runner logs (live)"
    echo "  clean    - Remove runner and clean up"
    echo "  update   - Update runner image"
    echo "  shell    - Open shell in runner container"
    echo "  help     - Show this help message"
}

start_runner() {
    echo -e "${BLUE}🚀 Starting runner...${NC}"
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${YELLOW}⚠️  GITHUB_TOKEN not set${NC}"
        read -p "Enter your GitHub Personal Access Token: " -s GITHUB_TOKEN
        echo ""
        export GITHUB_TOKEN
    fi
    
    docker-compose -f $COMPOSE_FILE up -d
    echo -e "${GREEN}✅ Runner started${NC}"
    
    sleep 5
    show_status
}

stop_runner() {
    echo -e "${BLUE}🛑 Stopping runner...${NC}"
    docker-compose -f $COMPOSE_FILE stop
    echo -e "${GREEN}✅ Runner stopped${NC}"
}

restart_runner() {
    echo -e "${BLUE}🔄 Restarting runner...${NC}"
    docker-compose -f $COMPOSE_FILE restart
    echo -e "${GREEN}✅ Runner restarted${NC}"
    
    sleep 5
    show_status
}

show_status() {
    echo -e "${BLUE}📊 Runner Status${NC}"
    echo "=================="
    
    if docker ps | grep -q $CONTAINER_NAME; then
        echo -e "${GREEN}✅ Container is running${NC}"
        
        # Show container details
        docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        # Show resource usage
        echo ""
        echo "📈 Resource Usage:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" $CONTAINER_NAME
        
        # Show recent logs
        echo ""
        echo "📋 Recent logs (last 10 lines):"
        docker logs --tail 10 $CONTAINER_NAME
    else
        echo -e "${RED}❌ Container is not running${NC}"
        
        # Check if container exists but stopped
        if docker ps -a | grep -q $CONTAINER_NAME; then
            echo -e "${YELLOW}⚠️  Container exists but is stopped${NC}"
            echo "Use '$0 start' to start it"
        else
            echo "Container does not exist"
            echo "Use '$0 start' to create and start it"
        fi
    fi
    
    echo ""
    echo "🔗 Check online status at:"
    echo "   https://github.com/NickB03/vana/settings/actions/runners"
}

show_logs() {
    echo -e "${BLUE}📋 Showing live logs (Ctrl+C to exit)...${NC}"
    docker logs -f $CONTAINER_NAME
}

clean_runner() {
    echo -e "${YELLOW}⚠️  This will remove the runner and all associated data${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🧹 Cleaning up...${NC}"
        docker-compose -f $COMPOSE_FILE down -v
        echo -e "${GREEN}✅ Cleanup complete${NC}"
    else
        echo "Cancelled"
    fi
}

update_runner() {
    echo -e "${BLUE}🔄 Updating runner image...${NC}"
    
    # Pull latest image
    docker pull myoung34/github-runner:latest
    
    # Restart with new image
    docker-compose -f $COMPOSE_FILE down
    docker-compose -f $COMPOSE_FILE up -d
    
    echo -e "${GREEN}✅ Runner updated${NC}"
    
    sleep 5
    show_status
}

open_shell() {
    echo -e "${BLUE}🖥️  Opening shell in runner container...${NC}"
    docker exec -it $CONTAINER_NAME /bin/bash
}

# Main script logic
case "$1" in
    start)
        start_runner
        ;;
    stop)
        stop_runner
        ;;
    restart)
        restart_runner
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_runner
        ;;
    update)
        update_runner
        ;;
    shell)
        open_shell
        ;;
    help|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
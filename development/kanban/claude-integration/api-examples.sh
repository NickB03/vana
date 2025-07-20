#!/bin/bash

# Claude Code API Integration Examples
# Usage: ./api-examples.sh [command]

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api/claude"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if server is running
check_server() {
    if ! curl -s "$BASE_URL" > /dev/null; then
        print_error "Kanban server is not running at $BASE_URL"
        print_warning "Please start the server with: npm run dev"
        exit 1
    fi
    print_status "Server is running"
}

# Get current kanban state
get_state() {
    print_status "Getting current kanban state..."
    curl -s "$API_URL" | jq '.'
}

# Create a new task
create_task() {
    local title="${1:-New task from Claude Code}"
    local description="${2:-Automatically created task}"
    local status="${3:-todo}"
    local priority="${4:-medium}"
    
    print_status "Creating new task: $title"
    
    curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": \"$title\",
            \"description\": \"$description\",
            \"status\": \"$status\",
            \"priority\": \"$priority\",
            \"tags\": [\"claude-code\", \"automated\"],
            \"agentSource\": \"claude-code-example\"
        }" | jq '.'
}

# Update existing task
update_task() {
    local task_id="$1"
    local status="${2:-done}"
    
    if [ -z "$task_id" ]; then
        print_error "Task ID is required"
        echo "Usage: update_task <task_id> [status]"
        return 1
    fi
    
    print_status "Updating task $task_id to status: $status"
    
    curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"taskId\": \"$task_id\",
            \"status\": \"$status\",
            \"agentSource\": \"claude-code-example\"
        }" | jq '.'
}

# Bulk update multiple tasks
bulk_update() {
    print_status "Performing bulk update..."
    
    curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d '{
            "updates": [
                {
                    "title": "Task 1 from bulk update",
                    "status": "todo",
                    "priority": "high",
                    "agentSource": "claude-code-bulk"
                },
                {
                    "title": "Task 2 from bulk update", 
                    "status": "in-progress",
                    "priority": "medium",
                    "tags": ["bulk", "automated"],
                    "agentSource": "claude-code-bulk"
                }
            ]
        }' | jq '.'
}

# Test file sync by directly modifying kanban-data.json
test_file_sync() {
    print_status "Testing file sync..."
    
    if [ ! -f "kanban-data.json" ]; then
        print_error "kanban-data.json not found. Make sure you're in the project root."
        return 1
    fi
    
    # Backup original file
    cp kanban-data.json kanban-data.json.backup
    
    # Add a test task via direct file modification
    jq '.tasks += [{
        "id": "file-sync-test-'$(date +%s)'",
        "title": "Test task via file sync",
        "description": "This task was added by directly modifying kanban-data.json",
        "status": "todo",
        "priority": "low",
        "tags": ["file-sync", "test"],
        "createdAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "updatedAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
        "source": "claude",
        "lastModifiedBy": "file-sync-test"
    }] | .lastUpdated = "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"' kanban-data.json > temp.json && mv temp.json kanban-data.json
    
    print_status "Task added to kanban-data.json"
    print_warning "The UI should update within 5 seconds"
    print_status "To restore original state: mv kanban-data.json.backup kanban-data.json"
}

# Show usage
show_usage() {
    echo "Claude Code Kanban API Examples"
    echo ""
    echo "Usage: $0 [command] [arguments]"
    echo ""
    echo "Commands:"
    echo "  get                          - Get current kanban state"
    echo "  create [title] [desc] [status] [priority] - Create new task"
    echo "  update <task_id> [status]    - Update existing task"
    echo "  bulk                         - Bulk update example"
    echo "  file-sync                    - Test file sync"
    echo "  help                         - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 get"
    echo "  $0 create \"Fix bug\" \"Fix the login bug\" \"in-progress\" \"high\""
    echo "  $0 update \"1\" \"done\""
    echo "  $0 bulk"
    echo "  $0 file-sync"
}

# Main script logic
main() {
    case "${1:-help}" in
        "get")
            check_server
            get_state
            ;;
        "create")
            check_server
            create_task "$2" "$3" "$4" "$5"
            ;;
        "update")
            check_server
            update_task "$2" "$3"
            ;;
        "bulk")
            check_server
            bulk_update
            ;;
        "file-sync")
            test_file_sync
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Please install jq to use this script."
    exit 1
fi

# Run main function
main "$@"
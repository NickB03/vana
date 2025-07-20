#!/bin/bash

# Test Claude Code Integration
# This script tests both API and file-based integration methods

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api/claude"

print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Check if server is running
check_server() {
    print_header "Checking Server"
    if curl -s "$BASE_URL" > /dev/null; then
        print_success "Kanban server is running"
        return 0
    else
        print_error "Kanban server is not running"
        print_info "Please start the server with: npm run dev"
        return 1
    fi
}

# Test API endpoints
test_api() {
    print_header "Testing API Integration"
    
    # Test GET endpoint
    print_info "Testing GET /api/claude..."
    if response=$(curl -s "$API_URL" | jq '.success' 2>/dev/null); then
        if [ "$response" = "true" ]; then
            print_success "GET endpoint working"
        else
            print_error "GET endpoint returned error"
            return 1
        fi
    else
        print_error "GET endpoint failed"
        return 1
    fi
    
    # Test POST endpoint - create task
    print_info "Testing task creation..."
    create_response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Test task from integration test",
            "description": "This is a test task",
            "status": "todo",
            "priority": "medium",
            "tags": ["test", "integration"],
            "agentSource": "integration-test"
        }')
    
    if echo "$create_response" | jq -e '.success' > /dev/null; then
        TASK_ID=$(echo "$create_response" | jq -r '.data.tasks[-1].id')
        print_success "Task created with ID: $TASK_ID"
    else
        print_error "Failed to create task"
        echo "$create_response" | jq '.'
        return 1
    fi
    
    # Test task update
    print_info "Testing task update..."
    update_response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"taskId\": \"$TASK_ID\",
            \"status\": \"done\",
            \"agentSource\": \"integration-test\"
        }")
    
    if echo "$update_response" | jq -e '.success' > /dev/null; then
        print_success "Task updated successfully"
    else
        print_error "Failed to update task"
        echo "$update_response" | jq '.'
        return 1
    fi
    
    # Test bulk update
    print_info "Testing bulk update..."
    bulk_response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d '{
            "updates": [
                {
                    "title": "Bulk test task 1",
                    "status": "todo",
                    "agentSource": "integration-test"
                },
                {
                    "title": "Bulk test task 2",
                    "status": "in-progress",
                    "priority": "high",
                    "agentSource": "integration-test"
                }
            ]
        }')
    
    if echo "$bulk_response" | jq -e '.success' > /dev/null; then
        print_success "Bulk update successful"
    else
        print_error "Bulk update failed"
        echo "$bulk_response" | jq '.'
        return 1
    fi
}

# Test file sync
test_file_sync() {
    print_header "Testing File Sync"
    
    # Check if kanban-data.json exists
    if [ ! -f "kanban-data.json" ]; then
        print_error "kanban-data.json not found"
        print_info "Make sure you're running this from the project root"
        return 1
    fi
    
    # Backup original file
    cp kanban-data.json kanban-data.json.test-backup
    print_info "Created backup: kanban-data.json.test-backup"
    
    # Read current task count
    original_count=$(jq '.tasks | length' kanban-data.json)
    print_info "Current task count: $original_count"
    
    # Add a test task via file modification
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
    test_task_id="file-sync-test-$(date +%s)"
    
    jq --arg id "$test_task_id" --arg ts "$timestamp" '
        .tasks += [{
            "id": $id,
            "title": "File sync test task",
            "description": "This task was added via direct file modification",
            "status": "todo",
            "priority": "low",
            "tags": ["file-sync", "test"],
            "createdAt": $ts,
            "updatedAt": $ts,
            "source": "claude",
            "lastModifiedBy": "file-sync-test"
        }] | .lastUpdated = $ts
    ' kanban-data.json > temp.json && mv temp.json kanban-data.json
    
    # Verify task was added
    new_count=$(jq '.tasks | length' kanban-data.json)
    if [ "$new_count" -gt "$original_count" ]; then
        print_success "Task added to file successfully"
        print_info "Task count increased from $original_count to $new_count"
        print_info "The UI should update within 5 seconds"
    else
        print_error "Failed to add task to file"
        return 1
    fi
    
    # Wait a moment, then restore original file
    sleep 2
    mv kanban-data.json.test-backup kanban-data.json
    print_info "Restored original kanban-data.json"
}

# Test integration dependencies
check_dependencies() {
    print_header "Checking Dependencies"
    
    # Check jq
    if command -v jq &> /dev/null; then
        print_success "jq is installed"
    else
        print_error "jq is required but not installed"
        print_info "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
        return 1
    fi
    
    # Check curl
    if command -v curl &> /dev/null; then
        print_success "curl is available"
    else
        print_error "curl is required but not available"
        return 1
    fi
}

# Main test function
run_tests() {
    print_header "Claude Code Kanban Integration Test"
    
    # Check dependencies
    if ! check_dependencies; then
        exit 1
    fi
    
    # Check server
    if ! check_server; then
        exit 1
    fi
    
    # Test API integration
    if ! test_api; then
        print_error "API tests failed"
        exit 1
    fi
    
    # Test file sync
    if ! test_file_sync; then
        print_error "File sync tests failed"
        exit 1
    fi
    
    print_header "All Tests Passed!"
    print_success "Claude Code integration is working correctly"
    print_info "You can now use the kanban board with Claude Code automation"
}

# Show usage
show_usage() {
    echo "Claude Code Kanban Integration Test"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  test     - Run all integration tests (default)"
    echo "  api      - Test only API integration"
    echo "  file     - Test only file sync"
    echo "  deps     - Check dependencies only"
    echo "  help     - Show this help"
    echo ""
    echo "Prerequisites:"
    echo "  - Kanban server running (npm run dev)"
    echo "  - jq installed for JSON processing"
    echo "  - Run from project root directory"
}

# Parse command line arguments
case "${1:-test}" in
    "test")
        run_tests
        ;;
    "api")
        check_dependencies && check_server && test_api
        ;;
    "file")
        check_dependencies && test_file_sync
        ;;
    "deps")
        check_dependencies
        ;;
    "help"|*)
        show_usage
        ;;
esac
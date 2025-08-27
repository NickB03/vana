#!/bin/bash

# Common functions for Claude Flow hooks
# Provides memory storage and retrieval using official methods

# Store data in memory (file-based implementation)
memory_store() {
    local key="$1"
    local value="$2"
    local ttl="${3:-3600}"  # Default TTL: 1 hour
    
    # Ensure memory directory exists
    mkdir -p .claude/memory
    
    # Sanitize key for filename
    local safe_key=$(echo "$key" | sed 's/[^a-zA-Z0-9._-]/_/g')
    
    # Store with timestamp for TTL support
    echo "{\"value\": $value, \"timestamp\": $(date +%s), \"ttl\": $ttl}" > ".claude/memory/${safe_key}.json"
    
    # Also try to store using Claude Flow if available
    if command -v npx &> /dev/null && npx claude-flow@alpha --version &> /dev/null; then
        # Try official memory command if it exists in future versions
        npx claude-flow@alpha eval "console.log('Memory stored: $key')" 2>/dev/null || true
    fi
    
    echo "✅ Stored: $key"
}

# Retrieve data from memory
memory_retrieve() {
    local key="$1"
    
    # Sanitize key for filename
    local safe_key=$(echo "$key" | sed 's/[^a-zA-Z0-9._-]/_/g')
    local file=".claude/memory/${safe_key}.json"
    
    if [[ -f "$file" ]]; then
        # Check TTL
        local data=$(cat "$file")
        local timestamp=$(echo "$data" | grep -o '"timestamp":[0-9]*' | cut -d: -f2)
        local ttl=$(echo "$data" | grep -o '"ttl":[0-9]*' | cut -d: -f2)
        local current=$(date +%s)
        
        if [[ $((current - timestamp)) -lt $ttl ]]; then
            echo "$data" | grep -o '"value":{[^}]*}' | cut -d: -f2-
        else
            rm -f "$file"
            echo "{}"
        fi
    else
        echo "{}"
    fi
}

# Send notification using official Claude Flow command
notify() {
    local level="$1"
    local message="$2"
    
    if npx claude-flow@alpha hooks notify --message "$message" 2>/dev/null; then
        echo "📢 Notification sent: $message"
    else
        # Fallback to console logging
        echo "[$(date +%Y-%m-%dT%H:%M:%S)] [$level] $message" >> .claude/hooks.log
        echo "📝 Logged: $message"
    fi
}

# Session management helpers
session_start() {
    local session_id="$1"
    npx claude-flow@alpha hooks session-restore --session-id "$session_id" 2>/dev/null || \
        echo "{\"session_id\": \"$session_id\", \"started\": $(date +%s)}" > ".claude/sessions/${session_id}.json"
}

session_end() {
    local session_id="$1"
    npx claude-flow@alpha hooks session-end --export-metrics true 2>/dev/null || \
        echo "{\"session_id\": \"$session_id\", \"ended\": $(date +%s)}" >> ".claude/sessions/${session_id}.json"
}

# Export functions for use in other scripts
export -f memory_store
export -f memory_retrieve
export -f notify
export -f session_start
export -f session_end

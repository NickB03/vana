#!/bin/bash
#
# PostToolUse hook: Auto-sync AGENTS.md when CLAUDE.md is modified
#
# Hook type: PostToolUse
# Triggers: After Write or Edit tool completes on CLAUDE.md
#
# This ensures AGENTS.md stays in sync automatically during Claude Code sessions.
# The pre-commit hook provides a safety net for manual edits.

# Check for jq availability
if ! command -v jq &> /dev/null; then
    echo "[sync-agents-md] Warning: jq not found, skipping sync" >&2
    exit 0
fi

# Read the hook input from stdin
INPUT=$(cat)

# Extract tool name and file path from JSON input using jq
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# Only trigger for Write or Edit tools
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" ]]; then
    exit 0
fi

# Extract the file path from tool_input using jq
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only trigger if CLAUDE.md was modified
if [[ "$FILE_PATH" != *"CLAUDE.md" ]]; then
    exit 0
fi

# Run the sync script
echo "[sync-agents-md] CLAUDE.md modified, syncing AGENTS.md..." >&2

# Run sync script and capture output
SYNC_OUTPUT=$(node scripts/sync-agents-md.cjs 2>&1)
SYNC_EXIT=$?

if [ $SYNC_EXIT -eq 0 ]; then
    echo "[sync-agents-md] ✅ AGENTS.md synchronized automatically" >&2
    echo "$SYNC_OUTPUT" >&2
else
    echo "[sync-agents-md] ⚠️ Sync failed: $SYNC_OUTPUT" >&2
fi

exit 0

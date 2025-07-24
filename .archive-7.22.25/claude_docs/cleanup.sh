#!/bin/bash
# Claude Workspace Cleanup Script
# Removes all temporary files from the Claude workspace

echo "🧹 Claude Workspace Cleanup"
echo "=========================="

# Get current directory
WORKSPACE_DIR="$(dirname "$0")"

# Count files before cleanup (excluding README and this script)
FILE_COUNT=$(find "$WORKSPACE_DIR" -type f ! -name 'README.md' ! -name 'cleanup.sh' | wc -l)

if [ $FILE_COUNT -eq 0 ]; then
    echo "✅ Workspace is already clean!"
    exit 0
fi

echo "Found $FILE_COUNT temporary file(s) to clean:"
echo ""

# List files that will be deleted
find "$WORKSPACE_DIR" -type f ! -name 'README.md' ! -name 'cleanup.sh' -exec basename {} \; | sort

echo ""
read -p "Delete these files? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Delete all files except README.md and cleanup.sh
    find "$WORKSPACE_DIR" -type f ! -name 'README.md' ! -name 'cleanup.sh' -delete
    
    # Also remove any subdirectories
    find "$WORKSPACE_DIR" -mindepth 1 -type d -delete 2>/dev/null
    
    echo "✅ Workspace cleaned successfully!"
else
    echo "❌ Cleanup cancelled"
fi
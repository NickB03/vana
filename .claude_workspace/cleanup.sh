#!/bin/bash
# Claude Workspace Cleanup Script
# Purpose: Archive non-active files to prevent context poisoning

WORKSPACE="/Users/nick/Development/vana/.claude_workspace"
ARCHIVE_DIR="$WORKSPACE/archive/$(date +%Y%m%d)"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "=== Claude Workspace Cleanup ==="
echo "Timestamp: $TIMESTAMP"
echo "--------------------------------"

# Create archive directory with date
mkdir -p "$ARCHIVE_DIR/reports"
mkdir -p "$ARCHIVE_DIR/planning"
mkdir -p "$ARCHIVE_DIR/docs"

# Archive old reports (older than 2 days)
echo "Archiving old reports..."
find "$WORKSPACE/reports" -type f -mtime +2 -exec mv {} "$ARCHIVE_DIR/reports/" \; 2>/dev/null

# Archive old planning docs
echo "Archiving old planning documents..."
find "$WORKSPACE/planning" -type f -name "*.md" ! -name "README*" -exec mv {} "$ARCHIVE_DIR/planning/" \; 2>/dev/null

# Archive completed analysis
echo "Archiving completed analysis..."
find "$WORKSPACE/analysis" -type f -exec mv {} "$ARCHIVE_DIR/" \; 2>/dev/null

# Clean up empty directories
echo "Removing empty directories..."
find "$WORKSPACE" -type d -empty -delete 2>/dev/null

# Create index of archived files
echo "Creating archive index..."
cat > "$ARCHIVE_DIR/ARCHIVE_INDEX.md" << EOF
# Archive Index - $(date +%Y-%m-%d)

## Archived Files
### Reports
$(ls -la "$ARCHIVE_DIR/reports/" 2>/dev/null | grep -v "^total" | grep -v "^d" | awk '{print "- " $NF}')

### Planning
$(ls -la "$ARCHIVE_DIR/planning/" 2>/dev/null | grep -v "^total" | grep -v "^d" | awk '{print "- " $NF}')

### Docs
$(ls -la "$ARCHIVE_DIR/docs/" 2>/dev/null | grep -v "^total" | grep -v "^d" | awk '{print "- " $NF}')

## Archive Reason
Files archived to prevent context poisoning and maintain clean workspace.
Archived files older than 2 days or completed work.
EOF

# Create main cleanup summary
cat > "$WORKSPACE/CLEANUP_LOG.md" << EOF
# Claude Workspace Cleanup Log

## Last Cleanup: $TIMESTAMP

### Active Directories
- **active/**: Current working files
- **reports/**: Recent reports (< 2 days old)
- **planning/**: Active planning documents
- **archive/**: Historical files organized by date

### Cleanup Actions
1. Archived reports older than 2 days
2. Moved completed planning documents
3. Cleared analysis directory
4. Removed empty directories
5. Created archive index at: $ARCHIVE_DIR/ARCHIVE_INDEX.md

### Context Management
This cleanup prevents context poisoning by:
- Removing outdated information
- Organizing historical data
- Maintaining only relevant active files
- Creating clear separation between current and archived work

### Next Cleanup
Recommended in 3-5 days or when workspace becomes cluttered.
EOF

echo "--------------------------------"
echo "Cleanup complete!"
echo "Archive created at: $ARCHIVE_DIR"
echo "Summary written to: $WORKSPACE/CLEANUP_LOG.md"
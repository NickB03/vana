#!/bin/bash
# Test script for diff-based knowledge base processing
# This script creates test diff files and runs the diff processor to verify functionality

# Create required directories
mkdir -p data/diffs
mkdir -p data/processed

# Set colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== VANA Diff-Based Knowledge Base Processing Test ===${NC}"
echo ""

# Check if process_document_diffs.py exists
if [ ! -f "scripts/process_document_diffs.py" ]; then
    echo -e "${RED}Error: scripts/process_document_diffs.py not found.${NC}"
    echo "Please implement the diff processor script first."
    exit 1
fi

echo -e "${GREEN}Creating test diff files...${NC}"

# Test 1: Simple addition
echo '--- a/docs/test-addition.md
+++ b/docs/test-addition.md
@@ -1,3 +1,5 @@
 # Test Document - Addition

-This is a test document for knowledge base updates.
+This is a test document for knowledge base updates using diff-based processing.
+
+This is a new paragraph added to the document.' > data/diffs/test-addition.diff

# Test 2: Simple removal
echo '--- a/docs/test-removal.md
+++ b/docs/test-removal.md
@@ -1,5 +1,3 @@
 # Test Document - Removal

-This paragraph will be removed.
-
 This paragraph will remain in the document.' > data/diffs/test-removal.diff

# Test 3: Complex modification
echo '--- a/docs/test-complex.md
+++ b/docs/test-complex.md
@@ -1,10 +1,12 @@
-# Old Title
+# New Title - Updated

 This paragraph remains unchanged.

-This paragraph will be modified to contain new information.
+This paragraph has been modified to contain updated information about the VANA project.
+It now spans multiple lines and has more content.

 This paragraph also remains unchanged.

-This will be removed.
+This is a completely new paragraph with additional information.
+It explains how the diff-based processing works.
 ' > data/diffs/test-complex.diff

echo -e "${GREEN}Created 3 test diff files in data/diffs/${NC}"
echo ""

echo -e "${YELLOW}Running diff processor...${NC}"
python scripts/process_document_diffs.py --input-dir data/diffs --output-dir data/processed

# Check result
if [ -f "data/processed/diff_processing_result.json" ]; then
    echo -e "${GREEN}Test completed successfully!${NC}"
    echo "Results saved to data/processed/diff_processing_result.json"

    # Show summary
    echo ""
    echo -e "${YELLOW}Processing Summary:${NC}"
    python -c '
import json
try:
    with open("data/processed/diff_processing_result.json", "r") as f:
        result = json.load(f)

    print(f"Total files processed: {result.get(\"total_files\", 0)}")
    print(f"Successfully processed: {result.get(\"successful\", 0)}")
    print(f"Failed: {result.get(\"failed\", 0)}")
    print(f"Total chunks processed: {result.get(\"total_chunks\", 0)}")

    # Show detailed results
    print("\nDetailed Results:")
    for i, res in enumerate(result.get("results", [])):
        file_path = res.get("file_path", "unknown")
        chunks = res.get("chunks", 0)
        success = "✓" if res.get("success", False) else "✗"

        print(f"{i+1}. {file_path} - {chunks} chunks [{success}]")

        if "stats" in res:
            stats = res["stats"]
            print(f"   - Vector Search updates: {stats.get(\"vector_search_updates\", 0)}")
            print(f"   - Knowledge Graph updates: {stats.get(\"entities_updated\", 0)}")
            print(f"   - Entities extracted: {stats.get(\"entities_extracted\", 0)}")
            print(f"   - Deprecated chunks: {stats.get(\"deprecated_chunks\", 0)}")
except Exception as e:
    print(f"Error reading results: {e}")
'
else
    echo -e "${RED}Test failed: No result file found.${NC}"
    echo "Check the logs for errors."
fi

echo ""
echo -e "${YELLOW}Test completed.${NC}"

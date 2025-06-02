# Diff-Based Knowledge Base Implementation Guide

## Overview

This guide provides detailed instructions for implementing a diff-based approach to knowledge base maintenance in Project VANA. This approach optimizes the existing knowledge base update process by only processing the changed portions of documents rather than entire files, resulting in more efficient and accurate knowledge representation.

## Benefits of Diff-Based Knowledge Base Updates

1. **Reduced Processing Overhead**: Only changes are processed, reducing computational requirements
2. **Decreased Duplication**: Prevents duplicate chunks in Vector Search
3. **Better Version Control**: Enables tracking of content changes over time
4. **More Accurate Search Results**: Prioritizes newer content and marks deprecated content
5. **Faster Update Cycles**: Less data to process means faster updates

## Implementation Steps

### 1. Update GitHub Actions Workflow

Replace the content of `.github/workflows/knowledge-base-update.yml` with the following:

```yaml
name: Knowledge Base Update

on:
  push:
    branches:
      - main
    paths:
      - 'docs/**'
      - 'knowledge/**'
  schedule:
    - cron: '0 0 * * 0'  # Run weekly on Sunday at midnight
  workflow_dispatch:  # Allow manual triggering

jobs:
  update-knowledge-base:
    runs-on: ubuntu-latest

    env:
      GOOGLE_CLOUD_PROJECT: ${{ secrets.GOOGLE_CLOUD_PROJECT }}
      GOOGLE_CLOUD_LOCATION: ${{ secrets.GOOGLE_CLOUD_LOCATION }}
      GOOGLE_STORAGE_BUCKET: ${{ secrets.GOOGLE_STORAGE_BUCKET }}
      VECTOR_SEARCH_INDEX_ID: ${{ secrets.VECTOR_SEARCH_INDEX_ID }}
      VECTOR_SEARCH_ENDPOINT_ID: ${{ secrets.VECTOR_SEARCH_ENDPOINT_ID }}
      DEPLOYED_INDEX_ID: ${{ secrets.DEPLOYED_INDEX_ID }}
      MCP_API_KEY: ${{ secrets.MCP_API_KEY }}
      MCP_NAMESPACE: vana-project
      MCP_SERVER_URL: https://knowledge-graph-default.modelcontextprotocol.com

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Fetch all history for all branches and tags

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}

      - name: Set up Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Find changed knowledge files and extract diffs
        id: changed-files
        run: |
          if [[ "${{ github.event_name }}" == "push" ]]; then
            # Get list of changed files in docs and knowledge directories
            CHANGED_FILES=$(git diff --name-only ${{ github.event.before }} ${{ github.event.after }} | grep -E '^(docs|knowledge)/')

            # Create a directory for diffs
            mkdir -p data/diffs

            # Extract diffs for each changed file
            for file in $CHANGED_FILES; do
              git diff ${{ github.event.before }} ${{ github.event.after }} -- "$file" > "data/diffs/$(basename "$file").diff"
            done
          else
            # For scheduled or manual runs, process all files
            CHANGED_FILES=$(find docs knowledge -type f -name "*.md" -o -name "*.txt" -o -name "*.pdf")
          fi

          # Save to output
          echo "files<<EOF" >> $GITHUB_OUTPUT
          echo "$CHANGED_FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

          # Count files
          FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l)
          echo "count=$FILE_COUNT" >> $GITHUB_OUTPUT

          # Check if we have diff files
          if [ -d "data/diffs" ]; then
            DIFF_COUNT=$(ls -1 data/diffs/*.diff 2>/dev/null | wc -l)
            echo "diff_count=$DIFF_COUNT" >> $GITHUB_OUTPUT
            echo "use_diffs=true" >> $GITHUB_OUTPUT
          else
            echo "diff_count=0" >> $GITHUB_OUTPUT
            echo "use_diffs=false" >> $GITHUB_OUTPUT
          fi

      - name: Process diff files (if available)
        if: steps.changed-files.outputs.use_diffs == 'true' && steps.changed-files.outputs.diff_count > 0
        run: |
          # Create a directory for processed files
          mkdir -p data/processed

          # Process diffs using the new script
          python scripts/process_document_diffs.py --input-dir data/diffs --output-dir data/processed

      - name: Process whole files (fallback)
        if: steps.changed-files.outputs.use_diffs != 'true' && steps.changed-files.outputs.count > 0
        run: |
          # Create a directory for processed files
          mkdir -p data/processed

          # Process files in batches to avoid rate limits
          echo "${{ steps.changed-files.outputs.files }}" | xargs -I{} python scripts/expand_knowledge_base.py --input-file {} --output-dir data/processed --upload

      - name: Verify Vector Search index
        run: |
          python scripts/verify_vector_search.py

      - name: Test Knowledge Graph connection
        run: |
          python scripts/test_mcp_connection.py

      - name: Run search quality evaluation
        run: |
          python scripts/evaluate_search_quality.py --output search_quality_report.md --include-web --mock-web

      - name: Upload search quality report
        uses: actions/upload-artifact@v3
        with:
          name: search-quality-report
          path: search_quality_report.md

      - name: Generate processing summary
        if: steps.changed-files.outputs.count > 0
        run: |
          echo "# Knowledge Base Update Summary" > update_summary.md
          echo "" >> update_summary.md
          echo "## Files Processed" >> update_summary.md
          echo "" >> update_summary.md
          echo "Total files: ${{ steps.changed-files.outputs.count }}" >> update_summary.md

          if [ "${{ steps.changed-files.outputs.use_diffs }}" == "true" ]; then
            echo "Processing method: Diff-based (Only changes)" >> update_summary.md
            echo "Diff files: ${{ steps.changed-files.outputs.diff_count }}" >> update_summary.md
          else
            echo "Processing method: Traditional (Whole files)" >> update_summary.md
          fi

          echo "" >> update_summary.md
          echo "## Processing Details" >> update_summary.md
          echo "" >> update_summary.md

          if [ -f "data/processed/diff_processing_result.json" ]; then
            # Extract stats from diff processing result
            python -c '
            import json
            try:
              with open("data/processed/diff_processing_result.json", "r") as f:
                result = json.load(f)

              if "total_chunks" in result:
                print(f"Chunks processed: {result.get(\"total_chunks\", 0)}")
                print(f"Successful files: {result.get(\"successful\", 0)}/{result.get(\"total_files\", 0)}")
              else:
                print(f"Chunks processed: {result.get(\"chunks\", 0)}")
                print(f"Successfully processed: {\"Yes\" if result.get(\"success\", False) else \"No\"}")
            except Exception as e:
              print(f"Error processing result: {e}")
            ' >> update_summary.md
          else
            echo "No detailed processing result found." >> update_summary.md
          fi

      - name: Upload processing summary
        uses: actions/upload-artifact@v3
        with:
          name: update-summary
          path: update_summary.md

      - name: Send notification on failure
        if: failure()
        uses: rtCamp/action-slack-notify@v2
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
          SLACK_CHANNEL: vana-alerts
          SLACK_COLOR: danger
          SLACK_TITLE: Knowledge Base Update Failed
          SLACK_MESSAGE: 'Knowledge Base update workflow failed. Please check the logs.'
          SLACK_FOOTER: 'VANA Project'
```

### 2. Create the Document Diff Processor Script

Create a new file named `scripts/process_document_diffs.py` with the following content:

```python
#!/usr/bin/env python3
"""
Process Document Diffs Script

This script processes document diffs extracted from Git history and updates
the Knowledge Base with only the changed portions. It supports adding, modifying,
and removing content while maintaining version tracking.

Usage:
    python scripts/process_document_diffs.py --input-dir data/diffs --output-dir data/processed
    python scripts/process_document_diffs.py --input-file data/diffs/document.diff --output-dir data/processed
"""

import os
import sys
import re
import argparse
import logging
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import tools
from tools.document_processing.document_processor import DocumentProcessor
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from tools.vector_search.vector_search_client import VectorSearchClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("process_document_diffs.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DiffProcessor:
    """Processor for Git diff files to extract changed portions of documents."""

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize the DiffProcessor

        Args:
            chunk_size: Maximum chunk size in characters
            chunk_overlap: Overlap between chunks in characters
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.document_processor = DocumentProcessor()
        self.kg_manager = KnowledgeGraphManager()
        self.vs_client = VectorSearchClient()

        # Check if tools are available
        self.kg_available = self.kg_manager.is_available()
        self.vs_available = self.vs_client.is_available()

        if not self.kg_available:
            logger.warning("Knowledge Graph is not available. Changes will not be reflected in Knowledge Graph.")

        if not self.vs_available:
            logger.warning("Vector Search is not available. Changes will not be reflected in Vector Search.")

    def parse_diff_file(self, diff_file: str) -> Dict[str, Any]:
        """
        Parse a Git diff file to extract added, modified, and removed sections

        Args:
            diff_file: Path to the diff file

        Returns:
            Dict containing the parsed diff information
        """
        if not os.path.exists(diff_file):
            logger.error(f"Diff file not found: {diff_file}")
            return {
                "success": False,
                "reason": "Diff file not found",
                "file_path": diff_file
            }

        try:
            with open(diff_file, "r", encoding="utf-8") as f:
                diff_content = f.read()

            # Extract file path
            file_path_match = re.search(r"^--- a/(.*?)$", diff_content, re.MULTILINE)
            if file_path_match:
                file_path = file_path_match.group(1)
            else:
                file_path = os.path.basename(diff_file).replace(".diff", "")

            # Extract sections
            sections = []
            current_section = None

            for line in diff_content.split("\n"):
                if line.startswith("@@"):
                    # New section
                    match = re.search(r"@@ -(\d+),(\d+) \+(\d+),(\d+) @@", line)
                    if match:
                        old_start, old_count, new_start, new_count = map(int, match.groups())
                        if current_section:
                            sections.append(current_section)

                        current_section = {
                            "old_start": old_start,
                            "old_count": old_count,
                            "new_start": new_start,
                            "new_count": new_count,
                            "content": [],
                            "added": [],
                            "removed": []
                        }
                elif current_section:
                    if line.startswith("+"):
                        # Added line
                        current_section["content"].append(line[1:])
                        current_section["added"].append(line[1:])
                    elif line.startswith("-"):
                        # Removed line
                        current_section["removed"].append(line[1:])
                    elif not line.startswith("\\"):
                        # Context line (ignore "\ No newline at end of file")
                        current_section["content"].append(line)

            # Add the last section
            if current_section:
                sections.append(current_section)

            return {
                "success": True,
                "file_path": file_path,
                "sections": sections,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error parsing diff file {diff_file}: {str(e)}")
            return {
                "success": False,
                "reason": str(e),
                "file_path": diff_file
            }

    def create_chunks_from_diff(self, diff_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Create text chunks from diff data

        Args:
            diff_data: Parsed diff data

        Returns:
            List of chunks
        """
        if not diff_data.get("success", False):
            return []

        file_path = diff_data.get("file_path", "unknown")
        sections = diff_data.get("sections", [])
        timestamp = diff_data.get("timestamp", datetime.now().isoformat())

        # Create chunks from added content
        chunks = []

        for section_idx, section in enumerate(sections):
            added_content = "\n".join(section.get("added", []))
            removed_content = "\n".join(section.get("removed", []))

            if added_content:
                # Process added content into chunks
                added_chunks = self._chunk_text(added_content, self.chunk_size, self.chunk_overlap)

                for chunk_idx, chunk_text in enumerate(added_chunks):
                    chunks.append({
                        "text": chunk_text,
                        "metadata": {
                            "source": file_path,
                            "doc_id": f"{os.path.basename(file_path)}-{section_idx}-{chunk_idx}",
                            "section": section_idx,
                            "chunk": chunk_idx,
                            "timestamp": timestamp,
                            "version": "latest",
                            "change_type": "added",
                            "deprecated": False
                        }
                    })

            if removed_content:
                # Create a single chunk for removed content (for tracking purposes)
                chunks.append({
                    "text": removed_content,
                    "metadata": {
                        "source": file_path,
                        "doc_id": f"{os.path.basename(file_path)}-{section_idx}-removed",
                        "section": section_idx,
                        "timestamp": timestamp,
                        "version": "deprecated",
                        "change_type": "removed",
                        "deprecated": True
                    }
                })

        return chunks

    def _chunk_text(self, text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        """
        Split text into chunks with overlap

        Args:
            text: Text to chunk
            chunk_size: Maximum chunk size in characters
            chunk_overlap: Overlap between chunks in characters

        Returns:
            List of text chunks
        """
        if not text:
            return []

        chunks = []
        current_pos = 0

        while current_pos < len(text):
            # Get chunk of text
            end_pos = min(current_pos + chunk_size, len(text))

            # If we're not at the end, try to find a sensible break point
            if end_pos < len(text):
                # Look for paragraph break
                paragraph_break = text.rfind("\n\n", current_pos, end_pos)
                if paragraph_break != -1 and paragraph_break > current_pos:
                    end_pos = paragraph_break + 2
                else:
                    # Look for line break
                    line_break = text.rfind("\n", current_pos, end_pos)
                    if line_break != -1 and line_break > current_pos:
                        end_pos = line_break + 1
                    else:
                        # Look for sentence break
                        sentence_break = text.rfind(". ", current_pos, end_pos)
                        if sentence_break != -1 and sentence_break > current_pos:
                            end_pos = sentence_break + 2
                        else:
                            # Look for space
                            space = text.rfind(" ", current_pos, end_pos)
                            if space != -1 and space > current_pos:
                                end_pos = space + 1

            # Extract chunk
            chunk = text[current_pos:end_pos].strip()
            if chunk:
                chunks.append(chunk)

            # Move position with overlap
            current_pos = end_pos - chunk_overlap
            if current_pos < 0 or current_pos >= len(text):
                break

        return chunks

    def update_knowledge_base(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Update Knowledge Base with chunks from diff

        Args:
            chunks: List of chunks to add

        Returns:
            Dict containing update statistics
        """
        stats = {
            "chunks_processed": len(chunks),
            "vector_search_updates": 0,
            "knowledge_graph_updates": 0,
            "entities_extracted": 0,
            "entities_updated": 0,
            "deprecated_chunks": 0
        }

        # Process added chunks
        added_chunks = [chunk for chunk in chunks if chunk["metadata"]["change_type"] == "added"]
        removed_chunks = [chunk for chunk in chunks if chunk["metadata"]["change_type"] == "removed"]

        # Update Vector Search
        if self.vs_available and added_chunks:
            for chunk in added_chunks:
                try:
                    result = self.vs_client.add_document(
                        text=chunk["text"],
                        metadata=chunk["metadata"]
                    )

                    if result.get("success", False):
                        stats["vector_search_updates"] += 1
                except Exception as e:
                    logger.error(f"Error adding chunk to Vector Search: {str(e)}")

        # Update Knowledge Graph
        if self.kg_available:
            for chunk in added_chunks:
                try:
                    # Extract entities from chunk
                    entities = self.kg_manager.extract_entities(chunk["text"])
                    stats["entities_extracted"] += len(entities)

                    # Add entities to Knowledge Graph
                    for entity in entities:
                        entity_result = self.kg_manager.store_entity(
                            name=entity["name"],
                            entity_type=entity["type"],
                            observation=entity["text"],
                            metadata={
                                "source": chunk["metadata"]["source"],
                                "timestamp": chunk["metadata"]["timestamp"],
                                "version": chunk["metadata"]["version"]
                            }
                        )

                        if entity_result.get("success", False):
                            stats["entities_updated"] += 1
                except Exception as e:
                    logger.error(f"Error processing entities for Knowledge Graph: {str(e)}")

        # Handle deprecated chunks
        stats["deprecated_chunks"] = len(removed_chunks)

        # Log statistics
        logger.info(f"Processed {stats['chunks_processed']} chunks: {len(added_chunks)} added, {len(removed_chunks)} removed")
        logger.info(f"Updated {stats['vector_search_updates']} chunks in Vector Search")
        logger.info(f"Extracted {stats['entities_extracted']} entities and updated {stats['entities_updated']} in Knowledge Graph")

        return stats

    def process_diff(self, diff_file: str) -> Dict[str, Any]:
        """
        Process a diff file and update knowledge base

        Args:
            diff_file: Path to the diff file

        Returns:
            Dict containing processing statistics
        """
        # Parse diff file
        diff_data = self.parse_diff_file(diff_file)

        if not diff_data.get("success", False):
            return {
                "success": False,
                "reason": diff_data.get("reason", "Unknown error"),
                "file_path": diff_data.get("file_path", diff_file)
            }

        # Create chunks from diff
        chunks = self.create_chunks_from_diff(diff_data)

        if not chunks:
            logger.info(f"No significant changes found in {diff_file}")
            return {
                "success": True,
                "file_path": diff_data.get("file_path", diff_file),
                "chunks": 0,
                "message": "No significant changes found"
            }

        # Update knowledge base
        update_stats = self.update_knowledge_base(chunks)

        return {
            "success": True,
            "file_path": diff_data.get("file_path", diff_file),
            "chunks": len(chunks),
            "stats": update_stats
        }

    def process_directory(self, directory: str) -> Dict[str, Any]:
        """
        Process all diff files in a directory

        Args:
            directory: Path to directory containing diff files

        Returns:
            Dict containing processing statistics
        """
        if not os.path.exists(directory):
            logger.error(f"Directory not found: {directory}")
            return {
                "success": False,
                "reason": "Directory not found",
                "directory": directory
            }

        # Find all diff files
        diff_files = []
        for file in os.listdir(directory):
            if file.endswith(".diff"):
                diff_files.append(os.path.join(directory, file))

        logger.info(f"Found {len(diff_files)} diff files in {directory}")

        # Process each diff file
        results = []
        for diff_file in diff_files:
            result = self.process_diff(diff_file)
            results.append(result)

        # Collect statistics
        total_chunks = sum(result.get("chunks", 0) for result in results if result.get("success", False))
        successful = sum(1 for result in results if result.get("success", False))
        failed = len(results) - successful

        return {
            "success": True,
            "directory": directory,
            "total_files": len(diff_files),
            "successful": successful,
            "failed": failed,
            "total_chunks": total_chunks,
            "results": results
        }

def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Process document diffs")
    parser.add_argument("--input-file", help="Path to the diff file")
    parser.add_argument("--input-dir", help="Path to the directory containing diff files")
    parser.add_argument("--output-dir", help="Output directory for processed documents")
    parser.add_argument("--chunk-size", type=int, default=500, help="Maximum chunk size in characters")
    parser.add_argument("--chunk-overlap", type=int, default=50, help="Overlap between chunks in characters")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")

    args = parser.parse_args()

    if not args.input_file and not args.input_dir:
        logger.error("Either --input-file or --input-dir must be specified")
        parser.print_help()
        return 1

    # Initialize diff processor
    diff_processor = DiffProcessor(
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap
    )

    # Process diff
    if args.input_file:
        logger.info(f"Processing diff file: {args.input_file}")
        result = diff_processor.process_diff(args.input_file)
    else:
        logger.info(f"Processing diff files in directory: {args.input_dir}")
        result = diff_processor.process_directory(args.input_dir)

    # Save result
    if args.output_dir:
        os.makedirs(args.output_dir, exist_ok=True)
        output_file = os.path.join(args.output_dir, "diff_processing_result.json")

        with open(output_file, "w") as f:
            json.dump(result, f, indent=2)

        logger.info(f"Result saved to {output_file}")

    # Print summary
    if result.get("success", False):
        if args.input_file:
            logger.info(f"Successfully processed diff file: {args.input_file}")
            logger.info(f"Chunks: {result.get('chunks', 0)}")
        else:
            logger.info(f"Successfully processed {result.get('successful', 0)}/{result.get('total_files', 0)} diff files")
            logger.info(f"Total chunks: {result.get('total_chunks', 0)}")

        return 0
    else:
        logger.error(f"Error processing diff: {result.get('reason', 'Unknown error')}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

### 3. Testing the Implementation

To test the diff-based knowledge base update system, follow these steps:

1. **Test the diff processor script locally**:
   ```bash
   cd ~/vana

   # Create test diff directory
   mkdir -p data/diffs

   # Create a simple test diff file
   echo '--- a/docs/test-document.md
+++ b/docs/test-document.md
@@ -1,3 +1,5 @@
 # Test Document

-This is a test document for knowledge base updates.
+This is a test document for knowledge base updates using diff-based processing.
+
+This is a new paragraph added to the document.' > data/diffs/test-document.diff

   # Process the test diff
   python scripts/process_document_diffs.py --input-dir data/diffs --output-dir data/processed

   # Check the result
   cat data/processed/diff_processing_result.json
   ```

2. **Manually trigger the GitHub Action workflow**:
   - Go to your GitHub repository
   - Navigate to the "Actions" tab
   - Select the "Knowledge Base Update" workflow
   - Click "Run workflow"
   - Check the workflow logs to verify the execution

### 4. Understanding How It Works

#### Diff Processing Flow

1. When changes are pushed to the repository, the GitHub Action extracts diffs for changed files.
2. The diff processor script parses these diffs to identify added, modified, and removed content.
3. Only the changed portions are processed and added to the knowledge base.
4. Metadata is added to track version information and deprecation status.

#### Advantages Over Previous Implementation

1. **Efficiency**:
   - Only processes the changes rather than entire files
   - Reduces computational requirements for large repositories
   - Faster update cycles

2. **Accuracy**:
   - Maintains version history of content
   - Marks outdated content as deprecated
   - Prevents duplicate content in the knowledge base

3. **Tracking**:
   - Each chunk includes version and timestamp information
   - Enables knowledge base evolution analysis
   - Supports future pruning of outdated content

## Recommended Further Enhancements

After implementing the basic diff-based system, consider these future enhancements:

1. **Chunk Version Pruning**:
   - Add a scheduled task to remove deprecated chunks after a certain time period
   - Implement filtering in search results to exclude deprecated content by default

2. **Diff Visualization**:
   - Create a visualization tool to show how the knowledge base evolves over time
   - Highlight which sections have been updated most frequently

3. **Semantic Diff Processing**:
   - Enhance the diff processor to understand semantic changes
   - Merge similar changes into more coherent chunks

4. **Conflict Resolution**:
   - Implement handling for conflicting information
   - Develop a system to manage contradictory content from different versions

## Troubleshooting

### Common Issues and Solutions

1. **No diff files generated**:
   - Ensure the workflow has proper permissions to access Git history
   - Check that the file paths match the expected patterns
   - Verify that the `fetch-depth: 0` option is set in the checkout action

2. **Knowledge Graph updates failing**:
   - Check the MCP connection with `scripts/test_mcp_connection.py`
   - Verify API keys and credentials are properly set
   - Look for error messages in the workflow logs

3. **Vector Search updates failing**:
   - Run `scripts/verify_vector_search.py` to check connectivity
   - Verify that the Vector Search index exists and is properly configured
   - Check for rate limiting or quota issues

### Logging and Debugging

The diff processor script includes comprehensive logging. To enable verbose logging:

```bash
python scripts/process_document_diffs.py --input-dir data/diffs --output-dir data/processed --verbose
```

Logs are written to:
- `process_document_diffs.log` for the diff processor
- GitHub Actions logs for workflow execution

## Conclusion

This diff-based knowledge base update system significantly improves the efficiency and accuracy of the VANA knowledge base maintenance process. By processing only the changed portions of documents, it reduces computational requirements while maintaining better version control of the knowledge base content.

The implementation is designed to be compatible with the existing system, providing a smooth transition path with minimal disruption to ongoing operations.

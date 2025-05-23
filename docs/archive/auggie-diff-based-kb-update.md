# Auggie Command: Implement Diff-Based Knowledge Base Updates

## Overview

This guide provides a specific Auggie command to enhance the knowledge base maintenance system by implementing diff-based updates for RAG. This approach will optimize storage and retrieval by only processing the changed portions of files rather than re-processing entire documents.

## Problem Statement

The current GitHub Action workflow for knowledge base maintenance processes entire files when changes are detected, which can lead to:

1. Duplication of content in the Vector Search index
2. Unnecessary processing load
3. Potential for outdated information to coexist with updated content
4. Inefficiency in storage utilization

## Proposed Implementation

We will enhance the knowledge base maintenance system by:

1. Extracting file diffs from Git history when changes are detected
2. Processing only the changed portions for RAG updates
3. Implementing version tracking to replace outdated content
4. Creating a more efficient workflow for continuous knowledge base updates

## Auggie Command

```
Implement a diff-based knowledge base update system with the following requirements:

1. Update the GitHub Action workflow to extract file diffs rather than processing entire files
2. Create a new script called `process_document_diffs.py` that can:
   - Extract meaningful diffs from Git history
   - Process only changed portions of documents
   - Handle added, modified, and deleted content appropriately
   - Update Vector Search index with version tracking
   - Update Knowledge Graph entities with change information

3. Integrate with existing verification scripts:
   - `verify_vector_search.py`
   - `test_mcp_connection.py`
   - `evaluate_search_quality.py`

4. Implement version tracking for documents in Vector Search using the following strategy:
   - Add version metadata to each chunk
   - Mark outdated chunks as deprecated rather than deleting them
   - Prioritize newer versions of chunks in search results
   - Enable pruning of outdated chunks based on configurable thresholds

5. Add appropriate error handling and logging

6. Update the documentation to explain the diff-based approach

Use these existing components:
- `.github/workflows/knowledge-base-update.yml` for the GitHub Action workflow
- `scripts/expand_knowledge_base.py` as reference for document processing
- Git commands like `git diff` for extracting changes

Make sure to:
- Maintain compatibility with the existing system
- Add appropriate tests for the new functionality
- Update the documentation to explain the new approach
```

## Technical Implementation Details

The implementation should:

1. **Modify the GitHub Action workflow** to extract diffs with the `git diff` command:
   ```yaml
   - name: Find changed knowledge files
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
   ```

2. **Create a new `process_document_diffs.py` script** that:
   - Parses diff files to extract added, modified, and removed sections
   - Processes only the relevant sections rather than entire files
   - Updates Vector Search and Knowledge Graph accordingly
   - Implements version control for chunks

3. **Update the document processing pipeline** to support partial updates:
   - Add versioning to chunks
   - Track document versions and changes
   - Handle deleted content by marking it as deprecated

4. **Enhance the search algorithm** to prioritize newer content and handle deprecated content appropriately

## Expected Outcome

After implementation, the knowledge base maintenance system will:

1. Process only changed portions of documents
2. Reduce processing time and resource usage
3. Maintain better version control of knowledge base content
4. Provide more accurate and up-to-date search results
5. Prevent duplication and inconsistency in the knowledge base

## Testing Strategy

The implementation should include tests that:

1. Verify diff extraction works correctly
2. Confirm that only changed portions are processed
3. Validate that Vector Search and Knowledge Graph are updated correctly
4. Check that version tracking works as expected
5. Ensure search quality is maintained or improved

## Conclusion

This diff-based approach will significantly improve the efficiency and accuracy of the knowledge base maintenance system, reducing processing overhead while ensuring that the knowledge base remains up-to-date with the latest information.

#!/usr/bin/env python3
"""
Example of using visual feedback with ChromaDB MCP operations

This demonstrates how to enhance ChromaDB operations with visual feedback
when called from Claude Code or other environments.
"""

from chroma_visual_tools import (
    tracker, 
    format_search_results,
    visual_query_summary,
    visual_add_summary,
    get_status_dashboard
)
import json
import uuid


def visual_chroma_query(collection_name: str, query_texts: list, n_results: int = 5):
    """
    Wrapper function that adds visual feedback to ChromaDB query operations.
    
    In actual use, this would wrap the mcp__chroma-official__chroma_query_documents call.
    """
    operation_id = str(uuid.uuid4())[:8]
    
    # Start visual tracking
    print(visual_query_summary(query_texts[0], n_results, collection_name))
    visual_start = tracker.start_operation(operation_id, "query", {
        "collection_name": collection_name,
        "query_texts": query_texts,
        "n_results": n_results
    })
    print(visual_start)
    
    # Here you would call the actual MCP tool:
    # result = mcp__chroma-official__chroma_query_documents(...)
    
    # Simulated result for demonstration
    result = {
        "documents": [["Document 1 content", "Document 2 content", "Document 3 content"]],
        "distances": [[0.2, 0.3, 0.5]],
        "metadatas": [[
            {"date": "2025-01-30", "category": "test"},
            {"date": "2025-01-29", "category": "demo"},
            {"date": "2025-01-28", "category": "example"}
        ]]
    }
    
    # End visual tracking
    visual_end = tracker.end_operation(operation_id, True, result)
    print(visual_end)
    
    # Format and display results
    print(format_search_results(result))
    
    return result


def visual_chroma_add(collection_name: str, documents: list, ids: list, metadatas: list = None):
    """
    Wrapper function that adds visual feedback to ChromaDB add operations.
    """
    operation_id = str(uuid.uuid4())[:8]
    
    # Start visual tracking
    print(visual_add_summary(len(documents), collection_name))
    visual_start = tracker.start_operation(operation_id, "add", {
        "collection_name": collection_name,
        "documents": documents,
        "num_docs": len(documents)
    })
    print(visual_start)
    
    # Here you would call the actual MCP tool:
    # result = mcp__chroma-official__chroma_add_documents(...)
    
    # Simulated success
    result = {"success": True}
    
    # End visual tracking
    visual_end = tracker.end_operation(operation_id, True, result)
    print(visual_end)
    
    return result


def visual_chroma_collection_info(collection_name: str):
    """
    Visual wrapper for collection info operations.
    """
    operation_id = str(uuid.uuid4())[:8]
    
    # Start visual tracking
    visual_start = tracker.start_operation(operation_id, "info", {
        "collection_name": collection_name
    })
    print(visual_start)
    
    # Here you would call the actual MCP tool:
    # Note: This tool has known numpy serialization issues
    # Use chroma_get_collection_count instead
    
    # Simulated result
    result = {"count": 12, "name": collection_name}
    
    # End visual tracking
    visual_end = tracker.end_operation(operation_id, True, result)
    print(visual_end)
    
    print(f"\n📊 Collection Statistics:")
    print(f"  • Name: {collection_name}")
    print(f"  • Documents: {result['count']}")
    
    return result


# Integration instructions for Claude Code
INTEGRATION_GUIDE = """
🧠 ChromaDB Visual Feedback Integration Guide
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To use visual feedback with ChromaDB MCP operations in Claude Code:

1. Import the visual tools:
   ```python
   from scripts.chroma_visual_tools import (
       tracker, format_search_results, get_status_dashboard
   )
   ```

2. Wrap MCP operations with visual tracking:
   ```python
   # Before operation
   operation_id = str(uuid.uuid4())[:8]
   print(tracker.start_operation(operation_id, "query", details))
   
   # Execute MCP operation
   result = mcp__chroma-official__chroma_query_documents(...)
   
   # After operation
   print(tracker.end_operation(operation_id, True, result))
   print(format_search_results(result))
   ```

3. Show status dashboard anytime:
   ```python
   print(get_status_dashboard())
   ```

4. Visual Operation Types:
   • "query" - Search operations
   • "add" - Document additions
   • "delete" - Document deletions
   • "count" - Collection counts
   • "list" - List collections
   • "create" - Create collection
   • "info" - Get collection info

5. Benefits:
   ✅ Real-time operation tracking
   ✅ Visual progress indicators
   ✅ Formatted search results
   ✅ Operation history
   ✅ Performance statistics

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""


if __name__ == "__main__":
    print("ChromaDB Visual Feedback Demo")
    print("=" * 60)
    
    # Show integration guide
    print(INTEGRATION_GUIDE)
    
    # Demo operations
    print("\n🎯 Demo: Visual Query Operation")
    visual_chroma_query("vana_memory", ["test query for visual feedback"], 3)
    
    print("\n🎯 Demo: Visual Add Operation")
    visual_chroma_add("vana_memory", ["New document content"], ["doc_001"])
    
    print("\n🎯 Demo: Collection Info")
    visual_chroma_collection_info("vana_memory")
    
    # Show final status
    print(get_status_dashboard())
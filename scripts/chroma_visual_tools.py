#!/usr/bin/env python3
"""
ChromaDB Visual Feedback Tools for Claude Code

This module provides visual feedback functions that can be imported and used
to enhance the ChromaDB MCP operations with progress tracking and status display.
"""

import time
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from collections import deque

class ChromaVisualTracker:
    """Singleton tracker for ChromaDB operations"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.operations = deque(maxlen=20)  # Keep last 20 operations
            cls._instance.active_operations = {}
        return cls._instance
    
    def start_operation(self, operation_id: str, operation_type: str, details: Dict[str, Any]) -> str:
        """Start tracking an operation"""
        self.active_operations[operation_id] = {
            "type": operation_type,
            "details": details,
            "start_time": time.time(),
            "status": "active"
        }
        
        # Visual output
        visual = self._get_operation_visual(operation_type, details, "start")
        return visual
    
    def end_operation(self, operation_id: str, success: bool, result: Any = None) -> str:
        """End tracking an operation"""
        if operation_id in self.active_operations:
            op = self.active_operations[operation_id]
            duration = time.time() - op["start_time"]
            
            # Record to history
            self.operations.append({
                "id": operation_id,
                "type": op["type"],
                "details": op["details"],
                "duration": duration,
                "success": success,
                "timestamp": datetime.now().isoformat(),
                "result_summary": self._summarize_result(result)
            })
            
            # Remove from active
            del self.active_operations[operation_id]
            
            # Visual output
            visual = self._get_operation_visual(op["type"], op["details"], "end", success, duration)
            return visual
        return ""
    
    def get_status_dashboard(self) -> str:
        """Generate a visual status dashboard"""
        lines = [
            "\n🧠 ChromaDB Visual Status Dashboard",
            "=" * 60
        ]
        
        # Active operations
        if self.active_operations:
            lines.append("\n🔄 Active Operations:")
            for op_id, op in self.active_operations.items():
                elapsed = time.time() - op["start_time"]
                lines.append(f"  • {op['type']} - {elapsed:.1f}s elapsed")
        else:
            lines.append("\n✅ No active operations")
        
        # Recent history
        if self.operations:
            lines.append("\n📜 Recent Operations:")
            for op in list(self.operations)[-5:]:
                status = "✅" if op["success"] else "❌"
                lines.append(f"  {status} {op['type']} ({op['duration']:.2f}s) - {op['timestamp'].split('T')[1].split('.')[0]}")
        
        # Statistics
        if self.operations:
            total_ops = len(self.operations)
            successful = sum(1 for op in self.operations if op["success"])
            avg_duration = sum(op["duration"] for op in self.operations) / total_ops
            lines.extend([
                "\n📊 Statistics:",
                f"  • Total operations: {total_ops}",
                f"  • Success rate: {(successful/total_ops)*100:.1f}%",
                f"  • Avg duration: {avg_duration:.2f}s"
            ])
        
        lines.append("=" * 60)
        return "\n".join(lines)
    
    def _get_operation_visual(self, op_type: str, details: Dict, phase: str, 
                             success: Optional[bool] = None, duration: Optional[float] = None) -> str:
        """Generate visual feedback for an operation"""
        visuals = {
            "query": {"icon": "🔍", "name": "Search"},
            "add": {"icon": "📝", "name": "Add Documents"},
            "delete": {"icon": "🗑️", "name": "Delete"},
            "count": {"icon": "📊", "name": "Count"},
            "list": {"icon": "📋", "name": "List Collections"},
            "create": {"icon": "🆕", "name": "Create Collection"},
            "info": {"icon": "ℹ️", "name": "Get Info"}
        }
        
        op_visual = visuals.get(op_type, {"icon": "🧠", "name": "Operation"})
        
        if phase == "start":
            lines = [
                f"\n{op_visual['icon']} {op_visual['name']} Starting...",
                "─" * 50
            ]
            
            # Add operation-specific details
            if op_type == "query" and "query_texts" in details:
                query = details["query_texts"][0] if details["query_texts"] else ""
                query_preview = query[:80] + "..." if len(query) > 80 else query
                lines.append(f"📍 Query: {query_preview}")
                lines.append(f"🎯 Requesting {details.get('n_results', 5)} results")
                
            elif op_type == "add" and "documents" in details:
                lines.append(f"📄 Adding {len(details['documents'])} documents")
                lines.append(f"🏷️ Collection: {details.get('collection_name', 'unknown')}")
                
            return "\n".join(lines)
        
        elif phase == "end":
            status_icon = "✅" if success else "❌"
            lines = [
                f"{status_icon} {op_visual['name']} {'Completed' if success else 'Failed'} ({duration:.2f}s)",
                "─" * 50
            ]
            return "\n".join(lines)
        
        return ""
    
    def _summarize_result(self, result: Any) -> str:
        """Create a summary of the result"""
        if isinstance(result, dict):
            if "documents" in result and isinstance(result["documents"], list):
                return f"{len(result['documents'][0])} documents found"
            elif "count" in result:
                return f"Count: {result['count']}"
        return "Completed"


# Global tracker instance
tracker = ChromaVisualTracker()


def with_visual_feedback(operation_type: str):
    """Decorator to add visual feedback to ChromaDB operations"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            import uuid
            operation_id = str(uuid.uuid4())[:8]
            
            # Start visual tracking
            visual_start = tracker.start_operation(operation_id, operation_type, kwargs)
            print(visual_start)
            
            try:
                # Execute the actual operation
                result = func(*args, **kwargs)
                
                # End visual tracking with success
                visual_end = tracker.end_operation(operation_id, True, result)
                print(visual_end)
                
                # For search operations, format results
                if operation_type == "query" and isinstance(result, dict) and "documents" in result:
                    print(format_search_results(result))
                
                return result
                
            except Exception as e:
                # End visual tracking with failure
                visual_end = tracker.end_operation(operation_id, False)
                print(visual_end)
                raise
                
        return wrapper
    return decorator


def format_search_results(results: Dict[str, Any]) -> str:
    """Format search results with visual indicators"""
    lines = []
    
    if not results.get("documents") or not results["documents"][0]:
        return "\n❌ No results found"
    
    documents = results["documents"][0]
    distances = results.get("distances", [[]])[0] if "distances" in results else [0] * len(documents)
    metadatas = results.get("metadatas", [[]])[0] if "metadatas" in results else [{}] * len(documents)
    
    lines.append(f"\n📋 Search Results ({len(documents)} found)")
    lines.append("=" * 80)
    
    for i, (doc, dist, meta) in enumerate(zip(documents, distances, metadatas)):
        lines.append(f"\n🔖 Result {i + 1} (Similarity: {(1 - dist)*100:.1f}%)")
        lines.append("─" * 40)
        
        # Metadata
        if meta:
            lines.append("📌 Metadata:")
            for key, value in sorted(meta.items()):
                lines.append(f"   • {key}: {value}")
        
        # Document preview
        doc_lines = doc.split('\n')
        preview_lines = doc_lines[:5] if len(doc_lines) > 5 else doc_lines
        preview = '\n'.join(preview_lines)
        if len(doc_lines) > 5:
            preview += f"\n   ... ({len(doc_lines) - 5} more lines)"
            
        lines.append(f"\n📄 Content:\n{preview}")
        lines.append("─" * 40)
    
    return "\n".join(lines)


def show_operation_progress(current: int, total: int, operation: str = "Processing") -> str:
    """Generate a progress bar visual"""
    if total <= 0:
        return ""
    
    percentage = (current / total) * 100
    bar_length = 30
    filled_length = int(bar_length * current // total)
    bar = "█" * filled_length + "░" * (bar_length - filled_length)
    
    return f"{operation}: [{bar}] {percentage:.1f}% ({current}/{total})"


def get_status_dashboard() -> str:
    """Get the current status dashboard"""
    return tracker.get_status_dashboard()


# Utility functions for common operations
def visual_query_summary(query: str, n_results: int, collection: str) -> str:
    """Generate a visual summary for a query operation"""
    return f"""
🔍 ChromaDB Query Operation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Collection: {collection}
🎯 Query: {query[:100]}{'...' if len(query) > 100 else ''}
📊 Max Results: {n_results}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""


def visual_add_summary(num_docs: int, collection: str) -> str:
    """Generate a visual summary for an add operation"""
    return f"""
📝 ChromaDB Add Operation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Collection: {collection}
📄 Documents: {num_docs}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""


if __name__ == "__main__":
    # Example usage
    print("ChromaDB Visual Feedback Tools - Example")
    print("=" * 60)
    
    # Simulate some operations
    tracker.start_operation("op1", "query", {"query_texts": ["test query"], "n_results": 5})
    time.sleep(0.5)
    tracker.end_operation("op1", True, {"documents": [["doc1", "doc2"]]})
    
    tracker.start_operation("op2", "add", {"documents": ["new doc"], "collection_name": "test"})
    time.sleep(0.3)
    tracker.end_operation("op2", True)
    
    # Show dashboard
    print(get_status_dashboard())
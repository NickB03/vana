#!/usr/bin/env python3
"""
Test Visual Feedback System for VANA ChromaDB
Demonstrates real-time operation tracking and progress indicators
"""

import asyncio
import sys
import time
from pathlib import Path

# Add scripts directory to path
sys.path.append(str(Path(__file__).parent / "scripts"))

from local_memory_server import VanaLocalMemory

async def test_visual_feedback():
    """Test the visual feedback system with full repo indexing"""
    
    print("🎛️ VANA Visual Feedback System Test")
    print("=" * 50)
    
    # Initialize memory system
    memory = VanaLocalMemory(".memory_db")
    
    # Test 1: Search operation with visual feedback
    print("\n📍 Test 1: Search Operation Visual Feedback")
    print("-" * 30)
    
    search_results = memory.search("Python 3.13 requirements", n_results=3)
    print(f"Found {len(search_results)} results with visual progress tracking")
    
    # Test 2: Full repository indexing with progress tracking
    print("\n📍 Test 2: Full Repository Indexing")
    print("-" * 30)
    
    # Index multiple directories to show comprehensive progress
    directories_to_index = [
        ".claude/",
        "docs/", 
        "agents/",
        "lib/",
        "scripts/"
    ]
    
    total_stats = {"total_files": 0, "total_chunks": 0, "errors": 0}
    
    for directory in directories_to_index:
        if Path(directory).exists():
            print(f"\n🔍 Indexing directory: {directory}")
            stats = memory.index_memory_files(directory)
            
            if "error" not in stats:
                total_stats["total_files"] += stats.get("total_files", 0)
                total_stats["total_chunks"] += stats.get("total_chunks", 0) 
                total_stats["errors"] += stats.get("errors", 0)
                print(f"✅ {directory}: {stats.get('total_chunks', 0)} chunks from {stats.get('total_files', 0)} files")
            else:
                print(f"⚠️ Skipping {directory}: {stats['error']}")
                
    # Test 3: Operation Status Dashboard  
    print("\n📍 Test 3: Operation Status Dashboard")
    print("-" * 30)
    
    # Display final statistics
    print(f"\n📊 Final Repository Index Statistics:")
    print(f"Total directories processed: {len([d for d in directories_to_index if Path(d).exists()])}")
    print(f"Total files indexed: {total_stats['total_files']}")
    print(f"Total chunks created: {total_stats['total_chunks']}")
    print(f"Total errors: {total_stats['errors']}")
    
    # Test search performance with larger index
    print(f"\n🔍 Testing search performance with expanded index...")
    start_time = time.time()
    search_results = memory.search("agent coordination tools", n_results=5)
    search_time = time.time() - start_time
    
    print(f"✅ Search completed in {search_time:.2f}s")
    print(f"Found {len(search_results)} relevant results")
    
    # Show operation history summary
    if memory.operation_history:
        print(f"\n📈 Recent Operations Summary:")
        for op in memory.operation_history[-3:]:  # Last 3 operations
            elapsed = time.time() - op.start_time
            status_icon = "✅" if op.status == "completed" else "❌" 
            print(f"{status_icon} {op.operation}: {op.details} ({elapsed:.1f}s)")
    
    print(f"\n🎉 Visual Feedback System Test Complete!")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(test_visual_feedback())
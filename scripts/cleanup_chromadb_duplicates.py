#!/usr/bin/env python3
"""
ChromaDB Duplicate Cleanup Script
Removes duplicate content while preserving the most recent version
"""

import chromadb
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

def cleanup_chromadb_duplicates(dry_run: bool = True) -> Dict[str, Any]:
    """
    Clean up duplicate content in ChromaDB
    
    Args:
        dry_run: If True, only shows what would be deleted
        
    Returns:
        Cleanup results summary
    """
    
    results = {
        "total_chunks_before": 0,
        "duplicate_groups_found": 0,
        "chunks_to_remove": 0,
        "chunks_removed": 0,
        "chunks_preserved": 0,
        "errors": [],
        "dry_run": dry_run,
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # Connect to ChromaDB
        db_path = '.memory_db'
        client = chromadb.PersistentClient(path=db_path)
        collection = client.get_collection('vana_memory')
        
        # Get all data
        all_data = collection.get()
        results["total_chunks_before"] = len(all_data["ids"])
        
        print(f"📊 Total chunks in database: {results['total_chunks_before']}")
        
        # Group chunks by content (first 200 chars as key for similarity)
        content_groups = {}
        for i, content in enumerate(all_data['documents']):
            if content:
                # Use first 200 chars as grouping key
                content_key = content[:200].strip()
                if content_key not in content_groups:
                    content_groups[content_key] = []
                
                chunk_data = {
                    'id': all_data['ids'][i],
                    'content': content,
                    'metadata': all_data['metadatas'][i] if all_data['metadatas'] else {},
                    'index': i
                }
                content_groups[content_key].append(chunk_data)
        
        # Find duplicate groups (more than 1 chunk with same content start)
        duplicate_groups = {k: v for k, v in content_groups.items() if len(v) > 1}
        results["duplicate_groups_found"] = len(duplicate_groups)
        
        print(f"🔍 Found {len(duplicate_groups)} duplicate content groups")
        
        # Process each duplicate group
        chunks_to_remove = []
        chunks_preserved = 0
        
        for group_key, chunks in duplicate_groups.items():
            print(f"\\n📋 Processing group with {len(chunks)} duplicates:")
            print(f"   Preview: {group_key[:100]}...")
            
            # Sort by metadata timestamp if available, otherwise by ID
            def get_timestamp(chunk):
                metadata = chunk.get('metadata', {})
                timestamp_fields = ['timestamp', 'created_at', 'last_updated']
                for field in timestamp_fields:
                    if field in metadata:
                        try:
                            return datetime.fromisoformat(metadata[field].replace('Z', '+00:00'))
                        except:
                            continue
                # Fallback to chunk ID (assuming newer IDs are more recent)
                return chunk['id']
            
            # Sort to find most recent (preserve this one)
            sorted_chunks = sorted(chunks, key=get_timestamp, reverse=True)
            most_recent = sorted_chunks[0]
            duplicates_to_remove = sorted_chunks[1:]
            
            print(f"   ✅ Preserving: {most_recent['id']}")
            chunks_preserved += 1
            
            for dup in duplicates_to_remove:
                print(f"   🗑️  Removing: {dup['id']}")
                chunks_to_remove.append(dup['id'])
        
        results["chunks_to_remove"] = len(chunks_to_remove)
        results["chunks_preserved"] = chunks_preserved
        
        print(f"\\n📈 Summary:")
        print(f"   Total chunks: {results['total_chunks_before']}")
        print(f"   Duplicate groups: {results['duplicate_groups_found']}")
        print(f"   Chunks to remove: {results['chunks_to_remove']}")
        print(f"   Chunks to preserve: {results['chunks_preserved']}")
        
        # Actually remove duplicates if not dry run
        if not dry_run and chunks_to_remove:
            print(f"\\n🗑️  Removing {len(chunks_to_remove)} duplicate chunks...")
            
            # Remove in batches to avoid overwhelming the database
            batch_size = 100
            for i in range(0, len(chunks_to_remove), batch_size):
                batch = chunks_to_remove[i:i + batch_size]
                try:
                    collection.delete(ids=batch)
                    results["chunks_removed"] += len(batch)
                    print(f"   Removed batch {i//batch_size + 1}: {len(batch)} chunks")
                except Exception as e:
                    error_msg = f"Error removing batch {i//batch_size + 1}: {str(e)}"
                    print(f"   ❌ {error_msg}")
                    results["errors"].append(error_msg)
            
            print(f"\\n✅ Cleanup complete! Removed {results['chunks_removed']} duplicates")
            
            # Verify final count
            final_data = collection.get()
            final_count = len(final_data["ids"])
            print(f"📊 Final chunk count: {final_count}")
            
        elif dry_run:
            print(f"\\n🔍 DRY RUN - No changes made")
            print(f"   Run with dry_run=False to execute cleanup")
            
    except Exception as e:
        error_msg = f"Cleanup error: {str(e)}"
        print(f"❌ {error_msg}")
        results["errors"].append(error_msg)
    
    return results

def main():
    """Run cleanup with options"""
    print("🧹 ChromaDB Duplicate Cleanup")
    print("=" * 40)
    
    # First run as dry run
    print("\\n🔍 Running dry run analysis...")
    dry_results = cleanup_chromadb_duplicates(dry_run=True)
    
    # Ask for confirmation if dry run found duplicates
    if dry_results["chunks_to_remove"] > 0:
        print(f"\\n⚠️  Ready to remove {dry_results['chunks_to_remove']} duplicate chunks")
        response = input("Proceed with cleanup? (yes/no): ").lower().strip()
        
        if response == 'yes':
            print("\\n🗑️  Executing cleanup...")
            final_results = cleanup_chromadb_duplicates(dry_run=False)
            
            # Save results
            results_file = f"cleanup_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(results_file, 'w') as f:
                json.dump(final_results, f, indent=2)
            
            print(f"\\n📄 Results saved to: {results_file}")
        else:
            print("\\n❌ Cleanup cancelled")
    else:
        print("\\n✅ No duplicates found to clean up")

if __name__ == "__main__":
    main()
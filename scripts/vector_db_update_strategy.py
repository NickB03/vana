#!/usr/bin/env python3
"""
Vector DB Update Strategy
Handles proper updating of embeddings to prevent conflicting information
"""

import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

class VectorUpdateManager:
    """Manages proper updates to prevent stale/conflicting embeddings"""
    
    def __init__(self, memory_instance):
        self.memory = memory_instance
        self.file_index = {}  # Track file -> chunk_ids mapping
        
    def update_file_embeddings(self, file_path: Path, content: str) -> Dict[str, Any]:
        """
        Update embeddings for a file - removes old chunks, adds new ones
        This prevents conflicting information in the vector DB
        """
        
        results = {
            "file_path": str(file_path),
            "action": "update",
            "old_chunks_removed": 0,
            "new_chunks_added": 0,
            "success": True,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        try:
            # Step 1: Remove existing chunks for this file
            old_chunk_ids = self._remove_file_chunks(file_path)
            results["old_chunks_removed"] = len(old_chunk_ids)
            
            # Step 2: Generate new chunks from current content
            new_chunks = self._generate_chunks(content, file_path)
            
            # Step 3: Add new chunks to vector DB
            new_chunk_ids = []
            for chunk in new_chunks:
                chunk_id = self.memory.store_chunk(
                    chunk['content'], 
                    chunk['metadata']
                )
                if chunk_id:
                    new_chunk_ids.append(chunk_id)
            
            results["new_chunks_added"] = len(new_chunk_ids)
            
            # Step 4: Update file index
            self.file_index[str(file_path)] = {
                "chunk_ids": new_chunk_ids,
                "last_updated": datetime.utcnow().isoformat(),
                "content_hash": hashlib.md5(content.encode()).hexdigest()
            }
            
            print(f"✅ Updated {file_path.name}: -{results['old_chunks_removed']} +{results['new_chunks_added']} chunks")
            
        except Exception as e:
            results["success"] = False
            results["error"] = str(e)
            print(f"❌ Error updating {file_path}: {e}")
        
        return results
    
    def _remove_file_chunks(self, file_path: Path) -> List[str]:
        """Remove all chunks associated with a file"""
        
        try:
            collection = self.memory.get_collection("vana_memory")
            
            # Get all chunks and find ones for this file
            all_chunks = collection.get()
            chunk_ids_to_remove = []
            
            for i, metadata in enumerate(all_chunks['metadatas']):
                if metadata.get('file_path') == str(file_path):
                    chunk_ids_to_remove.append(all_chunks['ids'][i])
            
            # Remove the chunks
            if chunk_ids_to_remove:
                collection.delete(ids=chunk_ids_to_remove)
                print(f"🗑️ Removed {len(chunk_ids_to_remove)} old chunks for {file_path.name}")
            
            return chunk_ids_to_remove
            
        except Exception as e:
            print(f"❌ Error removing chunks for {file_path}: {e}")
            return []
    
    def _generate_chunks(self, content: str, file_path: Path) -> List[Dict]:
        """Generate chunks with proper metadata"""
        
        if file_path.suffix == '.md':
            return self._chunk_markdown(content, file_path)
        elif file_path.suffix == '.py':
            return self._chunk_python(content, file_path)
        else:
            return self._chunk_generic(content, file_path)
    
    def _chunk_markdown(self, content: str, file_path: Path) -> List[Dict]:
        """Smart markdown chunking"""
        chunks = []
        sections = content.split('\n## ')
        
        for i, section in enumerate(sections):
            if i == 0:
                section_title = "introduction"
            else:
                lines = section.split('\n')
                section_title = lines[0].strip('#').strip() if lines else f"section_{i}"
                section = '## ' + section
            
            # Split large sections
            if len(section) > 2000:
                words = section.split()
                chunk_size = 300
                
                for j in range(0, len(words), chunk_size):
                    chunk_words = words[j:j + chunk_size]
                    chunk_content = ' '.join(chunk_words)
                    
                    chunks.append({
                        'content': chunk_content,
                        'metadata': {
                            "file_path": str(file_path),
                            "file_name": file_path.name,
                            "section": f"{section_title}_part_{j // chunk_size + 1}",
                            "chunk_type": "markdown",
                            "last_updated": datetime.utcnow().isoformat()
                        }
                    })
            else:
                chunks.append({
                    'content': section.strip(),
                    'metadata': {
                        "file_path": str(file_path),
                        "file_name": file_path.name,
                        "section": section_title,
                        "chunk_type": "markdown",
                        "last_updated": datetime.utcnow().isoformat()
                    }
                })
        
        return chunks
    
    def _chunk_python(self, content: str, file_path: Path) -> List[Dict]:
        """Smart Python code chunking"""
        chunks = []
        lines = content.split('\n')
        
        current_chunk = ""
        current_function = "module_level"
        
        for line in lines:
            current_chunk += line + '\n'
            
            # Detect function/class definitions
            if line.strip().startswith('def ') or line.strip().startswith('class '):
                if current_chunk.strip():
                    chunks.append({
                        'content': current_chunk.strip(),
                        'metadata': {
                            "file_path": str(file_path),
                            "file_name": file_path.name,
                            "section": current_function,
                            "chunk_type": "python",
                            "last_updated": datetime.utcnow().isoformat()
                        }
                    })
                
                # Start new chunk
                current_function = line.strip().split('(')[0].replace('def ', '').replace('class ', '')
                current_chunk = line + '\n'
            
            # Split large chunks
            elif len(current_chunk) > 1500:
                chunks.append({
                    'content': current_chunk.strip(),
                    'metadata': {
                        "file_path": str(file_path),
                        "file_name": file_path.name,
                        "section": current_function,
                        "chunk_type": "python",
                        "last_updated": datetime.utcnow().isoformat()
                    }
                })
                current_chunk = ""
        
        # Add final chunk
        if current_chunk.strip():
            chunks.append({
                'content': current_chunk.strip(),
                'metadata': {
                    "file_path": str(file_path),
                    "file_name": file_path.name,
                    "section": current_function,
                    "chunk_type": "python",
                    "last_updated": datetime.utcnow().isoformat()
                }
            })
        
        return chunks
    
    def _chunk_generic(self, content: str, file_path: Path) -> List[Dict]:
        """Generic text chunking"""
        chunks = []
        words = content.split()
        chunk_size = 400
        
        for i in range(0, len(words), chunk_size):
            chunk_words = words[i:i + chunk_size]
            chunk_content = ' '.join(chunk_words)
            
            chunks.append({
                'content': chunk_content,
                'metadata': {
                    "file_path": str(file_path),
                    "file_name": file_path.name,
                    "section": f"chunk_{i // chunk_size + 1}",
                    "chunk_type": "generic",
                    "last_updated": datetime.utcnow().isoformat()
                }
            })
        
        return chunks
    
    def detect_content_changes(self, file_path: Path, content: str) -> bool:
        """Check if file content has actually changed"""
        
        current_hash = hashlib.md5(content.encode()).hexdigest()
        
        if str(file_path) in self.file_index:
            stored_hash = self.file_index[str(file_path)].get('content_hash')
            return current_hash != stored_hash
        
        return True  # New file, always update
    
    def cleanup_orphaned_chunks(self) -> Dict[str, int]:
        """Remove chunks for files that no longer exist"""
        
        results = {
            "chunks_checked": 0,
            "orphaned_removed": 0,
            "files_cleaned": []
        }
        
        try:
            collection = self.memory.get_collection("vana_memory")
            all_chunks = collection.get()
            
            orphaned_ids = []
            checked_files = set()
            
            for i, metadata in enumerate(all_chunks['metadatas']):
                results["chunks_checked"] += 1
                file_path_str = metadata.get('file_path', '')
                
                if file_path_str and file_path_str not in checked_files:
                    checked_files.add(file_path_str)
                    
                    if not Path(file_path_str).exists():
                        # File no longer exists, mark chunks for removal
                        for j, meta in enumerate(all_chunks['metadatas']):
                            if meta.get('file_path') == file_path_str:
                                orphaned_ids.append(all_chunks['ids'][j])
                        
                        results["files_cleaned"].append(file_path_str)
            
            # Remove orphaned chunks
            if orphaned_ids:
                collection.delete(ids=orphaned_ids)
                results["orphaned_removed"] = len(orphaned_ids)
                print(f"🧹 Cleaned {len(orphaned_ids)} orphaned chunks from {len(results['files_cleaned'])} deleted files")
            
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
        
        return results

def main():
    """Test the update strategy"""
    
    # This would be integrated into the main memory system
    print("🔄 Vector DB Update Strategy")
    print("=" * 40)
    print("✅ Proper file updates (remove old + add new)")
    print("🧹 Orphaned chunk cleanup")
    print("📊 Content change detection")
    print("🎯 Prevents conflicting information")

if __name__ == "__main__":
    main()
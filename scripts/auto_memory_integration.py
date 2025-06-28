#!/usr/bin/env python3
"""
Automatic Memory Integration for VANA
Handles automatic searching, file watching, and seamless vector DB integration
"""

import asyncio
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

try:
    import chromadb
    from sentence_transformers import SentenceTransformer
    from mcp.server import Server
    from mcp.types import Tool, TextContent
except ImportError:
    print("Dependencies not installed. Install with: pip install chromadb sentence-transformers watchdog")
    exit(1)

class AutoMemoryFileHandler(FileSystemEventHandler):
    """Handles file system events for automatic memory updates"""
    
    def __init__(self, memory_manager):
        self.memory_manager = memory_manager
        self.debounce_delay = 2.0  # Wait 2 seconds before processing
        self.pending_updates = {}
        
    def on_modified(self, event):
        if event.is_directory:
            return
            
        file_path = Path(event.src_path)
        
        # Only process memory-related files
        if self._should_process_file(file_path):
            # Debounce rapid file changes
            self.pending_updates[str(file_path)] = datetime.now()
            asyncio.create_task(self._process_file_update(file_path))
    
    def on_created(self, event):
        self.on_modified(event)
    
    def _should_process_file(self, file_path: Path) -> bool:
        """Determine if file should trigger memory update - Phase 1 Tiered Indexing"""
        
        # Always process .claude/ directory files
        if '.claude' in str(file_path):
            return file_path.suffix in ['.md', '.json']
        
        # Core project files (always index)
        core_files = ['CLAUDE.md', 'README.md', 'requirements.txt', 'pyproject.toml', 
                     'setup.py', 'main.py', '__init__.py']
        if file_path.name in core_files:
            return True
            
        # Documentation files (critical for agents)
        if 'docs/' in str(file_path) and file_path.suffix == '.md':
            return True
            
        # Phase 1: Core source directories (~500 files vs 18,900 total)
        core_dirs = ['agents/', 'lib/', 'tools/', 'config/', 'scripts/', 'tests/framework/']
        
        for core_dir in core_dirs:
            if core_dir in str(file_path):
                # Python files in core directories
                if file_path.suffix in ['.py']:
                    return True
                # Configuration files
                elif file_path.suffix in ['.json', '.yaml', '.yml', '.toml', '.env']:
                    return True
                # Shell scripts and deployment files
                elif file_path.suffix in ['.sh', '.dockerfile'] or file_path.name in ['Dockerfile']:
                    return True
        
        # Archive and large directories to exclude (save resources)
        exclude_dirs = ['archive/', 'memory-bank/', 'node_modules/', '.git/', '__pycache__/', '.pytest_cache/']
        for exclude_dir in exclude_dirs:
            if exclude_dir in str(file_path):
                return False
        
        # Additional high-value files by name pattern
        high_value_patterns = ['docker-compose', 'requirements', 'Makefile', 'Dockerfile']
        if any(pattern in file_path.name.lower() for pattern in high_value_patterns):
            return True
            
        return False
    
    async def _process_file_update(self, file_path: Path):
        """Process file update with debouncing"""
        await asyncio.sleep(self.debounce_delay)
        
        # Check if file was updated again during debounce
        last_update = self.pending_updates.get(str(file_path))
        if last_update and (datetime.now() - last_update).total_seconds() < self.debounce_delay:
            return
        
        try:
            if file_path.exists():
                print(f"🔄 Auto-updating memory for: {file_path.name}")
                await self.memory_manager.reindex_file(file_path)
                print(f"✅ Memory updated for: {file_path.name}")
            else:
                print(f"🗑️ Removing memory for deleted file: {file_path.name}")
                await self.memory_manager.remove_file_from_memory(file_path)
                
        except Exception as e:
            print(f"❌ Error updating memory for {file_path}: {e}")

class EnhancedVanaMemory:
    """Enhanced memory manager with automatic search and file watching"""
    
    def __init__(self, db_path: str = ".memory_db"):
        self.db_path = Path(db_path)
        self.db_path.mkdir(exist_ok=True)
        
        # Initialize ChromaDB and model
        self.client = chromadb.PersistentClient(path=str(self.db_path))
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        
        # Initialize collections
        self.memory_collection = self._get_collection("vana_memory")
        self.query_cache = {}  # Cache recent queries for performance
        
        # File watcher setup
        self.observer = None
        self.file_handler = AutoMemoryFileHandler(self)
        
        # Auto-search configuration
        self.auto_search_enabled = True
        self.search_threshold = 0.7  # Minimum similarity for auto-search results
        
    def _get_collection(self, name: str):
        """Get or create collection with optimized settings"""
        try:
            return self.client.get_collection(name)
        except Exception:
            return self.client.create_collection(
                name=name,
                metadata={
                    "hnsw:space": "cosine",
                    "hnsw:construction_ef": 100,
                    "hnsw:M": 16
                }
            )
    
    async def start_file_watching(self, watch_paths: List[str] = None):
        """Start watching files for automatic updates"""
        if watch_paths is None:
            watch_paths = [".claude/", "docs/", "."]  # Watch key directories
        
        self.observer = Observer()
        
        for watch_path in watch_paths:
            path = Path(watch_path)
            if path.exists():
                self.observer.schedule(
                    self.file_handler,
                    str(path),
                    recursive=True
                )
                print(f"👁️ Watching {watch_path} for memory updates")
        
        self.observer.start()
        print("🚀 File watching started")
    
    async def stop_file_watching(self):
        """Stop file watching"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            print("⏹️ File watching stopped")
    
    async def auto_search_context(self, query: str) -> Optional[List[Dict]]:
        """Automatically search for relevant context without being asked"""
        
        if not self.auto_search_enabled:
            return None
        
        # Check cache first
        cache_key = hashlib.md5(query.lower().encode()).hexdigest()
        if cache_key in self.query_cache:
            cached_result, timestamp = self.query_cache[cache_key]
            # Use cache if less than 5 minutes old
            if (datetime.now() - timestamp).total_seconds() < 300:
                return cached_result
        
        try:
            results = await self.search_memory(query, n_results=3)
            
            # Filter for high-relevance results only
            relevant_results = [
                r for r in results 
                if r['similarity_score'] >= self.search_threshold
            ]
            
            # Cache results
            self.query_cache[cache_key] = (relevant_results, datetime.now())
            
            if relevant_results:
                print(f"🧠 Auto-found {len(relevant_results)} relevant memories for context")
                return relevant_results
            
        except Exception as e:
            print(f"❌ Auto-search error: {e}")
        
        return None
    
    async def search_memory(self, query: str, n_results: int = 5) -> List[Dict]:
        """Enhanced memory search with context awareness"""
        
        # Expand query with VANA-specific context
        expanded_query = self._expand_query_context(query)
        
        try:
            results = self.memory_collection.query(
                query_texts=[expanded_query],
                n_results=n_results,
                include=["documents", "metadatas", "distances"]
            )
            
            formatted_results = []
            for i in range(len(results['documents'][0])):
                similarity_score = 1 - results['distances'][0][i]
                
                # Enhanced metadata
                metadata = results['metadatas'][0][i]
                
                formatted_results.append({
                    'content': results['documents'][0][i],
                    'metadata': metadata,
                    'similarity_score': round(similarity_score, 3),
                    'relevance': self._calculate_relevance(similarity_score, metadata),
                    'context_type': metadata.get('section', 'unknown'),
                    'file_source': Path(metadata.get('file_path', '')).name
                })
            
            return formatted_results
            
        except Exception as e:
            print(f"❌ Search error: {e}")
            return []
    
    def _expand_query_context(self, query: str) -> str:
        """Expand query with VANA project context"""
        
        # Add VANA-specific context to improve search relevance
        vana_terms = {
            'python': 'python 3.13 requirement',
            'test': 'production parity testing',
            'deploy': 'google cloud run deployment',
            'agent': 'multi-agent system orchestrator',
            'memory': 'memory mcp server knowledge graph',
            'nick': 'nick user preferences communication',
            'status': 'project status operational'
        }
        
        expanded = query.lower()
        for term, expansion in vana_terms.items():
            if term in expanded:
                expanded += f" {expansion}"
        
        return expanded
    
    def _calculate_relevance(self, similarity_score: float, metadata: Dict) -> str:
        """Calculate relevance level with context awareness"""
        
        # Boost relevance for critical sections
        critical_sections = ['requirements', 'status', 'memory', 'deployment']
        section = metadata.get('section', '').lower()
        
        relevance_boost = 0.1 if any(critical in section for critical in critical_sections) else 0
        adjusted_score = similarity_score + relevance_boost
        
        if adjusted_score >= 0.85:
            return 'critical'
        elif adjusted_score >= 0.75:
            return 'high'
        elif adjusted_score >= 0.6:
            return 'medium'
        else:
            return 'low'
    
    async def reindex_file(self, file_path: Path):
        """Reindex a specific file"""
        
        # Remove existing chunks for this file
        await self.remove_file_from_memory(file_path)
        
        # Add updated chunks
        if file_path.exists() and file_path.suffix == '.md':
            content = file_path.read_text(encoding='utf-8')
            chunks = self._smart_chunk_content(content, file_path)
            
            for chunk in chunks:
                metadata = {
                    "file_path": str(file_path),
                    "file_name": file_path.name,
                    "section": chunk['section'],
                    "chunk_type": "auto_updated",
                    "last_updated": datetime.utcnow().isoformat()
                }
                
                await self.store_chunk(chunk['content'], metadata)
    
    async def remove_file_from_memory(self, file_path: Path):
        """Remove all chunks for a specific file"""
        try:
            # Get all items
            all_items = self.memory_collection.get()
            
            # Find items to delete
            ids_to_delete = []
            for i, metadata in enumerate(all_items['metadatas']):
                if metadata.get('file_path') == str(file_path):
                    ids_to_delete.append(all_items['ids'][i])
            
            # Delete items
            if ids_to_delete:
                self.memory_collection.delete(ids=ids_to_delete)
                print(f"🗑️ Removed {len(ids_to_delete)} chunks for {file_path.name}")
                
        except Exception as e:
            print(f"❌ Error removing file from memory: {e}")
    
    async def store_chunk(self, content: str, metadata: Dict) -> str:
        """Store chunk with enhanced metadata"""
        
        # Generate unique ID
        content_hash = hashlib.md5(content.encode()).hexdigest()[:12]
        timestamp = int(datetime.utcnow().timestamp())
        chunk_id = f"{content_hash}_{timestamp}"
        
        # Enhanced metadata
        enhanced_metadata = {
            **metadata,
            "timestamp": datetime.utcnow().isoformat(),
            "content_hash": content_hash,
            "content_length": len(content),
            "auto_indexed": True
        }
        
        try:
            self.memory_collection.add(
                documents=[content],
                metadatas=[enhanced_metadata],
                ids=[chunk_id]
            )
            return chunk_id
        except Exception as e:
            print(f"❌ Error storing chunk: {e}")
            return ""
    
    def _smart_chunk_content(self, content: str, file_path: Path) -> List[Dict]:
        """Smart content chunking based on file type with code awareness"""
        
        chunks = []
        
        # Code-aware chunking for programming files
        if file_path.suffix in ['.py', '.js', '.ts', '.jsx', '.tsx']:
            try:
                # Use AST-based chunking for code files
                chunks = self._chunk_code_file(content, file_path)
            except Exception:
                # Fallback to text chunking if AST parsing fails
                chunks = self._chunk_text_content(content, file_path)
        
        elif file_path.suffix == '.md':
            # Markdown-aware chunking
            sections = content.split('\n## ')
            
            for i, section in enumerate(sections):
                if i == 0:
                    # First section (before first ##)
                    section_title = "introduction"
                else:
                    # Extract section title
                    lines = section.split('\n')
                    section_title = lines[0].strip('#').strip() if lines else f"section_{i}"
                    section = '## ' + section  # Add back the header
                
                # Further split long sections
                if len(section) > 2000:
                    # Split into smaller chunks
                    words = section.split()
                    chunk_size = 300  # words
                    
                    for j in range(0, len(words), chunk_size):
                        chunk_words = words[j:j + chunk_size]
                        chunk_content = ' '.join(chunk_words)
                        
                        chunks.append({
                            'content': chunk_content,
                            'section': f"{section_title}_part_{j // chunk_size + 1}"
                        })
                else:
                    chunks.append({
                        'content': section.strip(),
                        'section': section_title
                    })
        
        return chunks

# Enhanced MCP Server
memory = EnhancedVanaMemory()
server = Server("vana-enhanced-memory")

@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """List available enhanced memory tools"""
    return [
        Tool(
            name="auto_search",
            description="Automatically search memory for relevant context (used internally)",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "context": {"type": "string", "description": "Additional context"}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="search_memory", 
            description="Search local memory database with enhanced relevance",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "max_results": {"type": "integer", "description": "Maximum results"}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="start_watching",
            description="Start automatic file watching for memory updates",
            inputSchema={
                "type": "object",
                "properties": {
                    "paths": {"type": "array", "items": {"type": "string"}}
                }
            }
        ),
        Tool(
            name="memory_health",
            description="Check memory system health and auto-search status",
            inputSchema={"type": "object", "properties": {}}
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle enhanced tool calls"""
    
    if name == "auto_search":
        # This tool is used internally by Claude to automatically get context
        query = arguments.get("query", "")
        context = arguments.get("context", "")
        
        full_query = f"{query} {context}".strip()
        results = await memory.auto_search_context(full_query)
        
        if not results:
            return [TextContent(type="text", text="No relevant context found automatically")]
        
        # Format auto-search results concisely
        response = f"🧠 **Auto-Context** ({len(results)} relevant memories):\n\n"
        
        for result in results:
            preview = result['content'][:150] + "..." if len(result['content']) > 150 else result['content']
            source = result['file_source']
            section = result['context_type']
            
            response += f"**{source}** → {section}\n{preview}\n\n"
        
        return [TextContent(type="text", text=response)]
    
    elif name == "search_memory":
        query = arguments.get("query", "")
        max_results = arguments.get("max_results", 5)
        
        results = await memory.search_memory(query, n_results=max_results)
        
        if not results:
            return [TextContent(type="text", text=f"No memories found for: {query}")]
        
        response = f"🔍 **Memory Search Results** for '{query}':\n\n"
        
        for i, result in enumerate(results, 1):
            content_preview = result['content'][:200] + "..." if len(result['content']) > 200 else result['content']
            
            response += f"**{i}.** {result['file_source']} → {result['context_type']}\n"
            response += f"*Relevance: {result['relevance']} ({result['similarity_score']})*\n"
            response += f"{content_preview}\n\n"
        
        return [TextContent(type="text", text=response)]
    
    elif name == "start_watching":
        paths = arguments.get("paths", [".claude/", "docs/"])
        await memory.start_file_watching(paths)
        
        return [TextContent(type="text", text=f"👁️ File watching started for: {', '.join(paths)}")]
    
    elif name == "memory_health":
        count = memory.memory_collection.count()
        
        response = f"🏥 **Memory System Health**\n"
        response += f"Total chunks: {count}\n"
        response += f"Auto-search: {'✅ Enabled' if memory.auto_search_enabled else '❌ Disabled'}\n"
        response += f"File watching: {'✅ Active' if memory.observer and memory.observer.is_alive() else '❌ Inactive'}\n"
        response += f"Cache entries: {len(memory.query_cache)}\n"
        
        return [TextContent(type="text", text=response)]
    
    else:
        return [TextContent(type="text", text=f"❌ Unknown tool: {name}")]

async def main():
    """Main enhanced server"""
    # Initialize enhanced memory system
    print("🚀 Starting Enhanced VANA Memory System...")
    
    # Start file watching automatically
    await memory.start_file_watching()
    
    # Start MCP server
    from mcp.server.stdio import stdio_server
    try:
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
    finally:
        await memory.stop_file_watching()

if __name__ == "__main__":
    asyncio.run(main())
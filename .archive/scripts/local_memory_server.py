#!/usr/bin/env python3
"""
VANA Local Memory MCP Server
Lightweight vector database for local memory indexing and retrieval
"""

import argparse
import asyncio
import hashlib
import json
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

try:
    import chromadb
    from mcp.server import Server
    from mcp.types import TextContent, Tool
    from sentence_transformers import SentenceTransformer
except ImportError as e:
    print(f"❌ Missing dependencies. Run: python scripts/setup_local_memory.py")
    print(f"Error: {e}")
    exit(1)


@dataclass
class OperationStatus:
    """Track operation status for visual feedback"""

    operation: str
    status: str  # "started", "progress", "completed", "error"
    details: str
    start_time: float
    progress: float = 0.0


class VanaLocalMemory:
    """Local memory manager using ChromaDB and sentence-transformers"""

    def __init__(self, db_path: str = ".memory_db"):
        self.db_path = Path(db_path)
        self.db_path.mkdir(exist_ok=True)

        # Visual feedback tracking
        self.current_operations = {}
        self.operation_history = []

        print(f"🔧 Initializing memory database at: {self.db_path}")
        self.client = chromadb.PersistentClient(path=str(self.db_path))

        print("🧠 Loading embedding model...")
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

        self.collections = {}
        print("✅ Local memory system initialized")

    def _start_operation(self, operation: str, details: str) -> str:
        """Start tracking an operation for visual feedback"""
        op_id = f"{operation}_{int(time.time())}"
        status = OperationStatus(operation=operation, status="started", details=details, start_time=time.time())
        self.current_operations[op_id] = status
        print(f"🚀 {operation}: {details}")
        return op_id

    def _update_operation(self, op_id: str, progress: float, details: str = None):
        """Update operation progress"""
        if op_id in self.current_operations:
            op = self.current_operations[op_id]
            op.progress = progress
            op.status = "progress"
            if details:
                op.details = details
            print(f"⏳ {op.operation}: {progress:.1%} - {op.details}")

    def _complete_operation(self, op_id: str, success: bool = True, details: str = None):
        """Complete an operation"""
        if op_id in self.current_operations:
            op = self.current_operations[op_id]
            op.status = "completed" if success else "error"
            op.progress = 1.0 if success else 0.0
            if details:
                op.details = details

            elapsed = time.time() - op.start_time
            status_icon = "✅" if success else "❌"
            print(f"{status_icon} {op.operation}: {op.details} ({elapsed:.1f}s)")

            # Move to history and clean up
            self.operation_history.append(op)
            del self.current_operations[op_id]

            # Keep only last 10 operations in history
            if len(self.operation_history) > 10:
                self.operation_history.pop(0)

    def get_collection(self, name: str):
        """Get or create a ChromaDB collection"""
        if name not in self.collections:
            try:
                self.collections[name] = self.client.get_collection(name)
                print(f"📂 Loaded existing collection: {name}")
            except Exception:
                self.collections[name] = self.client.create_collection(name=name, metadata={"hnsw:space": "cosine"})
                print(f"📂 Created new collection: {name}")
        return self.collections[name]

    def store_chunk(self, content: str, metadata: Dict[str, Any], collection_name: str = "vana_memory") -> str:
        """Store a memory chunk with metadata"""
        collection = self.get_collection(collection_name)

        # Generate unique ID
        content_hash = hashlib.md5(content.encode()).hexdigest()[:12]
        timestamp = int(datetime.utcnow().timestamp())
        chunk_id = f"{content_hash}_{timestamp}"

        # Enhance metadata
        enhanced_metadata = {
            **metadata,
            "timestamp": datetime.utcnow().isoformat(),
            "content_hash": content_hash,
            "content_length": len(content),
            "source": "vana_project",
        }

        try:
            collection.add(documents=[content], metadatas=[enhanced_metadata], ids=[chunk_id])
            return chunk_id
        except Exception as e:
            print(f"❌ Error storing chunk: {e}")
            return ""

    def update_file_embeddings(self, file_path: Path, content: str) -> Dict[str, Any]:
        """
        CRITICAL: Update embeddings for a file - removes old chunks, adds new ones
        This prevents conflicting information in the vector DB
        """

        results = {
            "file_path": str(file_path),
            "action": "update",
            "old_chunks_removed": 0,
            "new_chunks_added": 0,
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
        }

        try:
            # Step 1: Remove existing chunks for this file to prevent conflicts
            old_chunk_ids = self._remove_file_chunks(file_path)
            results["old_chunks_removed"] = len(old_chunk_ids)

            # Step 2: Generate new chunks from current content
            new_chunks = self.smart_chunk_markdown(content, file_path) if file_path.suffix == ".md" else []

            # Step 3: Add new chunks to vector DB
            new_chunk_ids = []
            for chunk in new_chunks:
                metadata = {
                    "file_path": str(file_path),
                    "file_name": file_path.name,
                    "section": chunk["section"],
                    "headers": " → ".join(chunk["headers"]) if chunk["headers"] else "",
                    "line_start": chunk.get("line_start", 0),
                    "line_end": chunk.get("line_end", 0),
                    "last_updated": datetime.utcnow().isoformat(),
                }

                chunk_id = self.store_chunk(chunk["content"], metadata)
                if chunk_id:
                    new_chunk_ids.append(chunk_id)

            results["new_chunks_added"] = len(new_chunk_ids)
            print(f"🔄 Updated {file_path.name}: -{results['old_chunks_removed']} +{results['new_chunks_added']} chunks")

        except Exception as e:
            results["success"] = False
            results["error"] = str(e)
            print(f"❌ Error updating {file_path}: {e}")

        return results

    def _remove_file_chunks(self, file_path: Path) -> List[str]:
        """Remove all chunks associated with a file to prevent stale information"""

        try:
            collection = self.get_collection("vana_memory")

            # Get all chunks and find ones for this file
            all_chunks = collection.get()
            chunk_ids_to_remove = []

            for i, metadata in enumerate(all_chunks["metadatas"]):
                if metadata.get("file_path") == str(file_path):
                    chunk_ids_to_remove.append(all_chunks["ids"][i])

            # Remove the chunks
            if chunk_ids_to_remove:
                collection.delete(ids=chunk_ids_to_remove)
                print(f"🗑️ Removed {len(chunk_ids_to_remove)} old chunks for {file_path.name}")

            return chunk_ids_to_remove

        except Exception as e:
            print(f"❌ Error removing chunks for {file_path}: {e}")
            return []

    def search(self, query: str, n_results: int = 5, collection_name: str = "vana_memory") -> List[Dict]:
        """Search for similar content"""
        op_id = self._start_operation("SEARCH", f"Query: '{query[:50]}...' (max {n_results} results)")

        try:
            collection = self.get_collection(collection_name)

            self._update_operation(op_id, 0.3, "Generating embeddings...")
            results = collection.query(
                query_texts=[query], n_results=n_results, include=["documents", "metadatas", "distances"]
            )

            self._update_operation(op_id, 0.8, "Processing results...")

            # Format results
            formatted_results = []
            for i in range(len(results["documents"][0])):
                similarity_score = 1 - results["distances"][0][i]  # Convert distance to similarity

                formatted_results.append(
                    {
                        "content": results["documents"][0][i],
                        "metadata": results["metadatas"][0][i],
                        "similarity_score": round(similarity_score, 3),
                        "relevance": "high"
                        if similarity_score > 0.8
                        else "medium"
                        if similarity_score > 0.6
                        else "low",
                    }
                )

            self._complete_operation(op_id, True, f"Found {len(formatted_results)} results")
            return formatted_results

        except Exception as e:
            self._complete_operation(op_id, False, f"Search failed: {e}")
            return []

    def smart_chunk_markdown(self, content: str, file_path: Path) -> List[Dict]:
        """Smart chunking for markdown files"""
        chunks = []
        lines = content.split("\n")

        current_section = "introduction"
        current_chunk = ""
        current_headers = []

        for line_num, line in enumerate(lines):
            if line.startswith("#"):
                # Save previous chunk
                if current_chunk.strip():
                    chunks.append(
                        {
                            "content": current_chunk.strip(),
                            "section": current_section,
                            "headers": current_headers.copy(),
                            "line_start": max(0, line_num - len(current_chunk.split("\n"))),
                            "line_end": line_num,
                        }
                    )

                # Start new chunk
                header_level = len(line) - len(line.lstrip("#"))
                header_text = line.strip("#").strip()

                # Update headers stack
                current_headers = current_headers[: header_level - 1] + [header_text]
                current_section = header_text
                current_chunk = line + "\n"
            else:
                current_chunk += line + "\n"

                # Split very long sections
                if len(current_chunk) > 2000:
                    chunks.append(
                        {
                            "content": current_chunk.strip(),
                            "section": current_section,
                            "headers": current_headers.copy(),
                            "line_start": line_num - len(current_chunk.split("\n")),
                            "line_end": line_num,
                        }
                    )
                    current_chunk = ""

        # Add final chunk
        if current_chunk.strip():
            chunks.append(
                {
                    "content": current_chunk.strip(),
                    "section": current_section,
                    "headers": current_headers.copy(),
                    "line_start": len(lines) - len(current_chunk.split("\n")),
                    "line_end": len(lines),
                }
            )

        return chunks

    def index_memory_files(self, directory: str = ".claude/") -> Dict[str, int]:
        """Index all memory files in directory"""
        path = Path(directory)
        if not path.exists():
            return {"error": f"Directory {directory} does not exist"}

        # Get all markdown files first to show progress
        all_files = list(path.rglob("*.md"))
        if not all_files:
            return {"error": f"No markdown files found in {directory}"}

        op_id = self._start_operation("INDEX", f"Indexing {len(all_files)} files from {directory}")
        stats = {"total_files": 0, "total_chunks": 0, "errors": 0}

        # Process files with progress tracking
        for file_idx, file_path in enumerate(all_files):
            if file_path.is_file():
                try:
                    progress = file_idx / len(all_files)
                    self._update_operation(op_id, progress, f"Processing {file_path.name}")

                    content = file_path.read_text(encoding="utf-8")
                    stats["total_files"] += 1

                    # Smart chunking
                    chunks = self.smart_chunk_markdown(content, file_path)

                    for chunk in chunks:
                        metadata = {
                            "file_path": str(file_path),
                            "file_name": file_path.name,
                            "file_type": "memory_file",
                            "section": chunk["section"],
                            "headers": " → ".join(chunk["headers"]) if chunk["headers"] else "",
                            "line_start": chunk.get("line_start", 0),
                            "line_end": chunk.get("line_end", 0),
                        }

                        chunk_id = self.store_chunk(chunk["content"], metadata)
                        if chunk_id:
                            stats["total_chunks"] += 1
                        else:
                            stats["errors"] += 1

                    print(f"📄 Indexed {file_path.name}: {len(chunks)} chunks")

                except Exception as e:
                    print(f"❌ Error indexing {file_path}: {e}")
                    stats["errors"] += 1

        self._complete_operation(op_id, True, f"Indexed {stats['total_files']} files, {stats['total_chunks']} chunks")
        return stats


# MCP Server Implementation
memory = VanaLocalMemory()
server = Server("vana-local-memory")


@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """List available memory tools"""
    return [
        Tool(
            name="search_memory",
            description="Search local memory for relevant context",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "max_results": {"type": "integer", "description": "Maximum results (default: 5)"},
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="store_memory",
            description="Store new information in local memory",
            inputSchema={
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "Content to store"},
                    "metadata": {"type": "object", "description": "Metadata about the content"},
                },
                "required": ["content"],
            },
        ),
        Tool(
            name="index_files",
            description="Index memory files from directory",
            inputSchema={
                "type": "object",
                "properties": {
                    "directory": {"type": "string", "description": "Directory to index (default: .claude/)"}
                },
            },
        ),
        Tool(
            name="memory_stats",
            description="Get memory database statistics",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="operation_status",
            description="Get real-time status of current operations (indexing/searching)",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls"""

    if name == "search_memory":
        query = arguments.get("query", "")
        max_results = arguments.get("max_results", 5)

        if not query:
            return [TextContent(type="text", text="❌ Query cannot be empty")]

        results = memory.search(query, n_results=max_results)

        if not results:
            return [TextContent(type="text", text=f"🔍 No relevant memories found for: {query}")]

        # Format response
        response = f"🧠 Found {len(results)} relevant memories for: '{query}'\n\n"

        for i, result in enumerate(results, 1):
            content_preview = result["content"][:200] + "..." if len(result["content"]) > 200 else result["content"]
            file_path = result["metadata"].get("file_path", "unknown")
            section = result["metadata"].get("section", "unknown")
            score = result["similarity_score"]

            response += f"**Result {i}** (similarity: {score}, {result['relevance']} relevance)\n"
            response += f"📁 File: {Path(file_path).name} → {section}\n"
            response += f"📝 Content: {content_preview}\n\n"

        return [TextContent(type="text", text=response)]

    elif name == "store_memory":
        content = arguments.get("content", "")
        metadata = arguments.get("metadata", {})

        if not content:
            return [TextContent(type="text", text="❌ Content cannot be empty")]

        chunk_id = memory.store_chunk(content, metadata)

        if chunk_id:
            return [TextContent(type="text", text=f"✅ Stored memory chunk: {chunk_id}")]
        else:
            return [TextContent(type="text", text="❌ Failed to store memory chunk")]

    elif name == "index_files":
        directory = arguments.get("directory", ".claude/")
        stats = memory.index_memory_files(directory)

        if "error" in stats:
            return [TextContent(type="text", text=f"❌ {stats['error']}")]

        response = f"📚 Indexing Complete!\n"
        response += f"Files processed: {stats['total_files']}\n"
        response += f"Chunks created: {stats['total_chunks']}\n"
        response += f"Errors: {stats['errors']}\n"

        return [TextContent(type="text", text=response)]

    elif name == "memory_stats":
        try:
            collection = memory.get_collection("vana_memory")
            count = collection.count()

            response = f"📊 Memory Database Statistics\n"
            response += f"Total chunks: {count}\n"
            response += f"Database path: {memory.db_path}\n"
            response += f"Model: all-MiniLM-L6-v2\n"

            return [TextContent(type="text", text=response)]
        except Exception as e:
            return [TextContent(type="text", text=f"❌ Error getting stats: {e}")]

    elif name == "operation_status":
        response = "🎛️ **Operation Status Dashboard**\n\n"

        # Current operations
        if memory.current_operations:
            response += "**🔄 Active Operations:**\n"
            for op_id, op in memory.current_operations.items():
                elapsed = time.time() - op.start_time
                progress_bar = "█" * int(op.progress * 10) + "░" * (10 - int(op.progress * 10))
                response += f"• {op.operation}: [{progress_bar}] {op.progress:.1%}\n"
                response += f"  └─ {op.details} ({elapsed:.1f}s)\n\n"
        else:
            response += "**✅ No active operations**\n\n"

        # Recent history
        if memory.operation_history:
            response += "**📊 Recent Operations:**\n"
            for op in memory.operation_history[-5:]:  # Last 5 operations
                elapsed = time.time() - op.start_time
                status_icon = "✅" if op.status == "completed" else "❌"
                response += f"{status_icon} {op.operation}: {op.details} ({elapsed:.1f}s)\n"

        return [TextContent(type="text", text=response)]

    else:
        return [TextContent(type="text", text=f"❌ Unknown tool: {name}")]


async def main():
    """Main server function"""
    parser = argparse.ArgumentParser(description="VANA Local Memory MCP Server")
    parser.add_argument("--index-existing", action="store_true", help="Index existing memory files on startup")
    parser.add_argument("--db-path", default=".memory_db", help="Database path")
    args = parser.parse_args()

    # Initialize with custom path if provided
    global memory
    memory = VanaLocalMemory(args.db_path)

    # Index existing files if requested
    if args.index_existing:
        print("🔄 Indexing existing memory files...")
        stats = memory.index_memory_files()
        print(f"✅ Indexed {stats.get('total_chunks', 0)} chunks from {stats.get('total_files', 0)} files")

    # Start MCP server
    print("🚀 Starting VANA Local Memory MCP Server...")
    from mcp.server.stdio import stdio_server

    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())

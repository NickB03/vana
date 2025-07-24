#!/usr/bin/env python3
"""
Index ADK Crash Course and Knowledge Base content into Vertex RAG corpus.

This script processes:
1. ADK crash course examples with README files and code
2. ADK knowledge base content from ChromaDB
3. Structures it for Vertex RAG consumption
"""

import os
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment
load_dotenv('.env.local')

def collect_adk_crash_course_content() -> List[Dict[str, Any]]:
    """Collect all ADK crash course content for indexing."""
    base_path = Path(".development/adk-crash-course")
    documents = []
    
    print("🔍 Collecting ADK crash course content...")
    
    # Process each example directory
    for example_dir in sorted(base_path.glob("*-*")):
        if not example_dir.is_dir():
            continue
            
        print(f"  📁 Processing {example_dir.name}")
        
        # Read README.md for each example
        readme_path = example_dir / "README.md"
        if readme_path.exists():
            content = readme_path.read_text(encoding='utf-8')
            
            # Create document entry
            doc_id = f"adk_example_{example_dir.name}"
            documents.append({
                "id": doc_id,
                "content": content,
                "metadata": {
                    "source": "adk_crash_course",
                    "example": example_dir.name,
                    "type": "documentation",
                    "file": "README.md",
                    "indexed_at": datetime.now().isoformat()
                }
            })
        
        # Process all Python files in the example
        for py_file in example_dir.rglob("*.py"):
            if py_file.name == "__init__.py":
                continue  # Skip empty __init__.py files
                
            try:
                content = py_file.read_text(encoding='utf-8')
                if len(content.strip()) < 50:  # Skip very small files
                    continue
                    
                # Create document entry for code
                relative_path = py_file.relative_to(base_path)
                doc_id = f"adk_code_{hashlib.md5(str(relative_path).encode()).hexdigest()[:8]}"
                
                # Add code context
                code_content = f"""# ADK Example: {example_dir.name}
# File: {relative_path}

{content}

# This code demonstrates:
# - ADK patterns for {example_dir.name.split('-', 1)[1].replace('-', ' ')}
# - Implementation following Google ADK best practices
"""
                
                documents.append({
                    "id": doc_id,
                    "content": code_content,
                    "metadata": {
                        "source": "adk_crash_course",
                        "example": example_dir.name,
                        "type": "code",
                        "file": str(relative_path),
                        "indexed_at": datetime.now().isoformat()
                    }
                })
                
            except Exception as e:
                print(f"    ⚠️  Error reading {py_file}: {e}")
    
    print(f"✅ Collected {len(documents)} ADK crash course documents")
    return documents

def collect_adk_knowledge_base_content() -> List[Dict[str, Any]]:
    """Collect ADK knowledge base content from ChromaDB."""
    documents = []
    
    print("🔍 Collecting ADK knowledge base content...")
    
    try:
        # Query all ADK documentation from ChromaDB
        import sys
        sys.path.append('.')
        
        # Import MCP tools for ChromaDB access
        from antml.tools.mcp_tools import invoke_mcp_tool
        
        # Get all documents from adk_complete_docs collection
        result = invoke_mcp_tool(
            server="chroma-vana",
            tool="chroma_get_documents",
            arguments={
                "collection_name": "adk_complete_docs",
                "limit": 1000,
                "include": ["documents", "metadatas", "ids"]
            }
        )
        
        if result and "documents" in result:
            for i, doc_content in enumerate(result["documents"]):
                doc_id = result["ids"][i] if i < len(result["ids"]) else f"adk_kb_{i}"
                metadata = result["metadatas"][i] if i < len(result["metadatas"]) else {}
                
                # Enhance metadata for Vertex RAG
                enhanced_metadata = {
                    "source": "adk_knowledge_base",
                    "type": "documentation", 
                    "indexed_at": datetime.now().isoformat(),
                    **metadata
                }
                
                documents.append({
                    "id": f"adk_kb_{doc_id}",
                    "content": doc_content,
                    "metadata": enhanced_metadata
                })
        
        print(f"✅ Collected {len(documents)} ADK knowledge base documents")
        
    except Exception as e:
        print(f"⚠️  Could not access ADK knowledge base: {e}")
        print("   Continuing with crash course content only...")
        
    return documents

def format_for_vertex_rag(documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Format documents for Vertex RAG ingestion."""
    print("📝 Formatting documents for Vertex RAG...")
    
    formatted_docs = []
    
    for doc in documents:
        # Create Vertex RAG compatible document
        vertex_doc = {
            "id": doc["id"],
            "content": doc["content"],
            "metadata": doc["metadata"]
        }
        
        # Add display name for better corpus management
        if doc["metadata"].get("source") == "adk_crash_course":
            example = doc["metadata"].get("example", "unknown")
            file_type = doc["metadata"].get("type", "unknown")
            vertex_doc["displayName"] = f"ADK Example: {example} ({file_type})"
        else:
            vertex_doc["displayName"] = f"ADK Documentation: {doc['id']}"
        
        formatted_docs.append(vertex_doc)
    
    return formatted_docs

def save_documents_for_review(documents: List[Dict[str, Any]], filename: str):
    """Save documents to file for review before indexing."""
    output_path = Path(".claude_workspace") / filename
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(documents, f, indent=2, ensure_ascii=False)
    
    print(f"📄 Documents saved to {output_path} for review")
    
    # Create summary
    summary = {
        "total_documents": len(documents),
        "by_source": {},
        "by_type": {},
        "examples": []
    }
    
    for doc in documents:
        source = doc["metadata"].get("source", "unknown")
        doc_type = doc["metadata"].get("type", "unknown")
        
        summary["by_source"][source] = summary["by_source"].get(source, 0) + 1
        summary["by_type"][doc_type] = summary["by_type"].get(doc_type, 0) + 1
        
        if len(summary["examples"]) < 5:
            summary["examples"].append({
                "id": doc["id"],
                "source": source,
                "type": doc_type,
                "content_preview": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"]
            })
    
    summary_path = Path(".claude_workspace") / f"{filename.split('.')[0]}_summary.json"
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"📊 Summary saved to {summary_path}")
    return summary

def main():
    """Main execution function."""
    print("🚀 Starting ADK content indexing for Vertex RAG...")
    
    # Collect all content
    crash_course_docs = collect_adk_crash_course_content()
    knowledge_base_docs = collect_adk_knowledge_base_content()
    
    # Combine all documents
    all_documents = crash_course_docs + knowledge_base_docs
    
    # Format for Vertex RAG
    vertex_documents = format_for_vertex_rag(all_documents)
    
    # Save for review
    summary = save_documents_for_review(vertex_documents, "adk_vertex_rag_documents.json")
    
    print(f"\n📈 Indexing Summary:")
    print(f"   Total documents: {summary['total_documents']}")
    print(f"   By source: {summary['by_source']}")
    print(f"   By type: {summary['by_type']}")
    
    print(f"\n✅ ADK content prepared for Vertex RAG indexing!")
    print(f"   Next steps:")
    print(f"   1. Review documents in .claude_workspace/adk_vertex_rag_documents.json")
    print(f"   2. Use Vertex RAG API to index these documents into corpus")
    print(f"   3. Test agent access to ADK knowledge")
    
    return vertex_documents

if __name__ == "__main__":
    main()
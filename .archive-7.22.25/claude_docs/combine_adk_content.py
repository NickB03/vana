#!/usr/bin/env python3
"""
Combine ADK crash course and knowledge base content for Vertex RAG indexing.
"""

import json
from pathlib import Path
from datetime import datetime

def combine_all_adk_content():
    """Combine crash course and knowledge base content."""
    
    print("🔄 Combining all ADK content...")
    
    # Load crash course content
    crash_course_path = Path(".claude_workspace/adk_vertex_rag_documents.json")
    if crash_course_path.exists():
        with open(crash_course_path, 'r', encoding='utf-8') as f:
            crash_course_docs = json.load(f)
        print(f"   📚 Loaded {len(crash_course_docs)} crash course documents")
    else:
        crash_course_docs = []
        print("   ⚠️  No crash course documents found")
    
    # Load knowledge base content  
    kb_path = Path(".claude_workspace/adk_kb_documents.json")
    if kb_path.exists():
        with open(kb_path, 'r', encoding='utf-8') as f:
            kb_docs = json.load(f)
        print(f"   📖 Loaded {len(kb_docs)} knowledge base documents")
    else:
        kb_docs = []
        print("   ⚠️  No knowledge base documents found")
    
    # Combine all documents
    all_docs = crash_course_docs + kb_docs
    
    # Add index metadata
    for i, doc in enumerate(all_docs):
        doc["metadata"]["index_order"] = i
        doc["metadata"]["combined_at"] = datetime.now().isoformat()
        
        # Ensure displayName exists
        if "displayName" not in doc:
            source = doc["metadata"].get("source", "unknown")
            doc_type = doc["metadata"].get("type", "unknown")
            if source == "adk_crash_course":
                example = doc["metadata"].get("example", "unknown")
                doc["displayName"] = f"ADK Example: {example} ({doc_type})"
            else:
                topic = doc["metadata"].get("topic", doc["id"])
                doc["displayName"] = f"ADK Documentation: {topic}"
    
    # Create final summary
    summary = {
        "total_documents": len(all_docs),
        "crash_course_docs": len(crash_course_docs),
        "knowledge_base_docs": len(kb_docs),
        "by_source": {},
        "by_type": {},
        "preparation": {
            "prepared_at": datetime.now().isoformat(),
            "ready_for_vertex_rag": True,
            "corpus_target": "VANA RAG Corpus",
            "estimated_tokens": sum(len(doc["content"]) // 4 for doc in all_docs)  # Rough estimate
        }
    }
    
    for doc in all_docs:
        source = doc["metadata"].get("source", "unknown")
        doc_type = doc["metadata"].get("type", "unknown")
        
        summary["by_source"][source] = summary["by_source"].get(source, 0) + 1
        summary["by_type"][doc_type] = summary["by_type"].get(doc_type, 0) + 1
    
    # Save combined content
    combined_path = Path(".claude_workspace/adk_complete_content_for_vertex_rag.json")
    with open(combined_path, 'w', encoding='utf-8') as f:
        json.dump(all_docs, f, indent=2, ensure_ascii=False)
    
    # Save summary
    summary_path = Path(".claude_workspace/adk_complete_summary.json")  
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Combined ADK content ready for Vertex RAG!")
    print(f"   📁 Complete content: {combined_path}")
    print(f"   📊 Summary: {summary_path}")
    print(f"   📈 Total documents: {summary['total_documents']}")
    print(f"   🏗️  Sources: {summary['by_source']}")
    print(f"   📝 Types: {summary['by_type']}")
    print(f"   🧮 Estimated tokens: {summary['preparation']['estimated_tokens']:,}")
    
    return all_docs, summary

if __name__ == "__main__":
    combine_all_adk_content()
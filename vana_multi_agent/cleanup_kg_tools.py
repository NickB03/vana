#!/usr/bin/env python3
"""
Knowledge Graph Tools Cleanup Script

This script removes all knowledge graph tool references from the agents/team.py file
to ensure 100% ADK compliance with native memory systems only.
"""

import re

def cleanup_kg_tools():
    """Remove all knowledge graph tool references from agents/team.py"""
    
    file_path = "agents/team.py"
    
    # Read the file
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Define patterns to remove
    kg_patterns = [
        r',\s*adk_kg_query',
        r',\s*adk_kg_store',
        r',\s*adk_kg_relationship',
        r',\s*adk_kg_extract_entities',
        r'adk_kg_query,\s*',
        r'adk_kg_store,\s*',
        r'adk_kg_relationship,\s*',
        r'adk_kg_extract_entities,\s*',
        r'adk_kg_query\s*,',
        r'adk_kg_store\s*,',
        r'adk_kg_relationship\s*,',
        r'adk_kg_extract_entities\s*,',
        r'adk_kg_query',
        r'adk_kg_store',
        r'adk_kg_relationship',
        r'adk_kg_extract_entities'
    ]
    
    # Remove all patterns
    for pattern in kg_patterns:
        content = re.sub(pattern, '', content)
    
    # Clean up any double commas or trailing commas
    content = re.sub(r',\s*,', ',', content)
    content = re.sub(r',\s*\]', ']', content)
    content = re.sub(r',\s*\)', ')', content)
    
    # Write the cleaned content back
    with open(file_path, 'w') as f:
        f.write(content)
    
    print("✅ Knowledge graph tool references removed from agents/team.py")

if __name__ == "__main__":
    cleanup_kg_tools()

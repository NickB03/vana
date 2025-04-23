#!/usr/bin/env python3
"""
Script to update the Vector Search test to use caching
"""

import os
import re
import sys

def update_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Add import for embedding cache
    import_pattern = r'import sys\n'
    replacement = r'import sys\n# Import embedding cache\nsys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))\nfrom tools.embedding_cache import cache_embedding\n'
    content = re.sub(import_pattern, replacement, content)
    
    # Add decorator to the generate_embedding function
    func_pattern = r'def generate_embedding\(text\):'
    replacement = r'@cache_embedding\ndef generate_embedding(text):'
    content = re.sub(func_pattern, replacement, content)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Updated {file_path} to use embedding cache")

if __name__ == "__main__":
    # Update the test_vector_search_direct.py file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    file_path = os.path.join(project_dir, "scripts", "test_vector_search_direct.py")
    
    if os.path.exists(file_path):
        update_file(file_path)
    else:
        print(f"File not found: {file_path}")
        sys.exit(1)

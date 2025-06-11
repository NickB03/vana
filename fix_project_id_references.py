#!/usr/bin/env python3
"""
Fix Project ID References
Replace all instances of wrong project ID 960076421399 with correct 960076421399
"""

import os
import re
import glob
from pathlib import Path

# Project ID mappings - REVERT BACK
OLD_PROJECT_ID = "960076421399"
NEW_PROJECT_ID = "960076421399"

def find_files_with_project_id():
    """Find all files containing the old project ID."""
    patterns = [
        "**/*.py",
        "**/*.md", 
        "**/*.yaml",
        "**/*.yml",
        "**/*.json",
        "**/*.txt",
        "**/*.sh"
    ]
    
    files_to_update = set()
    
    for pattern in patterns:
        for file_path in glob.glob(pattern, recursive=True):
            # Skip certain directories
            if any(skip in file_path for skip in ['.git', '__pycache__', '.pytest_cache', 'node_modules', '.ruff_cache']):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if OLD_PROJECT_ID in content:
                        files_to_update.add(file_path)
            except (UnicodeDecodeError, PermissionError):
                continue
    
    return sorted(files_to_update)

def update_file(file_path):
    """Update a single file to replace project ID references."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Count replacements
        old_count = content.count(OLD_PROJECT_ID)
        
        # Replace all instances
        new_content = content.replace(OLD_PROJECT_ID, NEW_PROJECT_ID)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✅ {file_path}: {old_count} replacements")
        return old_count
        
    except Exception as e:
        print(f"❌ Error updating {file_path}: {e}")
        return 0

def main():
    """Main function to fix all project ID references."""
    print("🔧 Fixing Project ID References")
    print("=" * 40)
    print(f"Replacing: {OLD_PROJECT_ID}")
    print(f"With:      {NEW_PROJECT_ID}")
    print("=" * 40)
    
    # Find files
    files_to_update = find_files_with_project_id()
    
    if not files_to_update:
        print("✅ No files found with old project ID")
        return
    
    print(f"Found {len(files_to_update)} files to update:")
    for file_path in files_to_update:
        print(f"  - {file_path}")
    
    print("\n🔄 Updating files...")
    
    total_replacements = 0
    for file_path in files_to_update:
        replacements = update_file(file_path)
        total_replacements += replacements
    
    print(f"\n🎉 Complete! Made {total_replacements} replacements across {len(files_to_update)} files")
    print(f"All references to {OLD_PROJECT_ID} have been replaced with {NEW_PROJECT_ID}")

if __name__ == "__main__":
    main()

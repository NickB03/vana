#!/usr/bin/env python3
"""
Script to update all Cloud Run URL references to use the correct vana-dev / vana-prod structure.

This script replaces:
- https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app -> https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app
- https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app -> https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app

And ensures vana-dev references are correct:
- https://vana-dev-${PROJECT_NUMBER}.us-central1.run.app (should remain as-is)
"""

import os
import re
import glob
from pathlib import Path

# URL mappings
OLD_PROD_URL_1 = "https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app"
OLD_PROD_URL_2 = "https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app"
NEW_PROD_URL = "https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app"
DEV_URL = "https://vana-dev-${PROJECT_NUMBER}.us-central1.run.app"

def update_file(file_path):
    """Update URLs in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Replace old production URLs with new production URL
        content = content.replace(OLD_PROD_URL_1, NEW_PROD_URL)
        content = content.replace(OLD_PROD_URL_2, NEW_PROD_URL)
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated: {file_path}")
            return True
        else:
            print(f"⏭️  No changes: {file_path}")
            return False
            
    except Exception as e:
        print(f"❌ Error updating {file_path}: {e}")
        return False

def find_files_to_update():
    """Find all files that need URL updates."""
    patterns = [
        "**/*.md",
        "**/*.py",
        "**/*.yaml",
        "**/*.yml",
        "**/*.json",
        "**/*.txt"
    ]
    
    files_to_update = set()
    
    for pattern in patterns:
        for file_path in glob.glob(pattern, recursive=True):
            # Skip certain directories
            if any(skip in file_path for skip in ['.git', '__pycache__', '.pytest_cache', 'node_modules']):
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if OLD_PROD_URL_1 in content or OLD_PROD_URL_2 in content:
                        files_to_update.add(file_path)
            except:
                continue
    
    return sorted(files_to_update)

def main():
    """Main function to update all URLs."""
    print("🔄 VANA Cloud Run URL Update Script")
    print("=" * 50)
    print(f"Replacing:")
    print(f"  {OLD_PROD_URL_1}")
    print(f"  {OLD_PROD_URL_2}")
    print(f"With:")
    print(f"  {NEW_PROD_URL}")
    print(f"Keeping:")
    print(f"  {DEV_URL}")
    print("=" * 50)
    
    # Find files to update
    files_to_update = find_files_to_update()
    
    if not files_to_update:
        print("✅ No files found that need updating!")
        return
    
    print(f"📁 Found {len(files_to_update)} files to update:")
    for file_path in files_to_update:
        print(f"  - {file_path}")
    
    print("\n🚀 Starting updates...")
    
    updated_count = 0
    for file_path in files_to_update:
        if update_file(file_path):
            updated_count += 1
    
    print(f"\n🎉 Update complete!")
    print(f"✅ Updated {updated_count} files")
    print(f"⏭️  Skipped {len(files_to_update) - updated_count} files (no changes needed)")

if __name__ == "__main__":
    main()

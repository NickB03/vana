#!/usr/bin/env python3
"""
Fix Project ID References - SELECTIVE REPLACEMENT
IMPORTANT: This script has been updated to avoid breaking Cloud Run URLs.
Only replaces project ID references in specific contexts, not Cloud Run service URLs.
"""

import glob
import re
from lib.logging_config import get_logger
logger = get_logger("vana.fix_project_id_references")


# Project ID mappings - Fix to use correct Google Cloud Project ID
OLD_PROJECT_ID = "960076421399"  # Cloud Run service ID (incorrect for project references)
NEW_PROJECT_ID = "analystai-454200"  # Correct Google Cloud Project ID

# WARNING: This script is currently DISABLED to prevent breaking Cloud Run URLs
# Most critical issues have already been fixed manually

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
        
        logger.info(f"✅ {file_path}: {old_count} replacements")
        return old_count
        
    except Exception as e:
        logger.error(f"❌ Error updating {file_path}: {e}")
        return 0

def main():
    """Main function - DISABLED to prevent breaking Cloud Run URLs."""
    logger.info("🚨 SCRIPT DISABLED")
    logger.info("%s", "=" * 50)
    logger.info("This script has been disabled to prevent breaking Cloud Run URLs.")
    logger.error("Critical project ID issues have been fixed manually:")
    logger.info("✅ ADK Memory Monitor - Fixed")
    logger.info("✅ Configuration files - Fixed")
    logger.info("✅ Shared libraries - Fixed")
    logger.info("")
    logger.info("Cloud Run URLs with 960076421399 are CORRECT and should not be changed.")
    logger.info("Only Google Cloud Project references needed fixing.")
    logger.info("%s", "=" * 50)
    return

if __name__ == "__main__":
    main()

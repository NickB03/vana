#!/usr/bin/env python3
"""
VANA Project Credential Sanitization Script

This script removes all hardcoded project credentials and replaces them with
environment variable references or template placeholders.

CRITICAL: Run this before any public release or repository sharing.
"""

import os
import re
import glob
from pathlib import Path
from typing import List, Dict, Tuple
from lib.logging_config import get_logger
logger = get_logger("vana.sanitize_credentials")


# Hardcoded values to replace
CREDENTIAL_MAPPINGS = {
    # Project IDs
    "${GOOGLE_CLOUD_PROJECT}": "${GOOGLE_CLOUD_PROJECT}",
    "${PROJECT_NUMBER}": "${PROJECT_NUMBER}",
    
    # Service accounts
    "vana-vector-search-sa@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com": "${VECTOR_SEARCH_SERVICE_ACCOUNT}",
    
    # RAG Corpus paths
    "projects/${GOOGLE_CLOUD_PROJECT}/locations/us-central1/ragCorpora/vana-corpus": "${RAG_CORPUS_RESOURCE_NAME}",
    "projects/${PROJECT_NUMBER}/locations/us-central1/ragCorpora/2305843009213693952": "${RAG_CORPUS_RESOURCE_NAME}",
    
    # URLs
    "https://vana-prod-${PROJECT_NUMBER}.us-central1.run.app": "${VANA_PROD_URL}",
    "https://vana-dev-${PROJECT_NUMBER}.us-central1.run.app": "${VANA_DEV_URL}",
}

# File patterns to process
FILE_PATTERNS = [
    "deployment/*.sh",
    "deployment/*.yaml", 
    "deployment/*.yml",
    "cloud_function*/*.py",
    "cloud_function*.py",
    "scripts/*.py",
    "config/*.py",
    "tests/**/*.py",
    "*.sh",
]

# Files to skip
SKIP_FILES = [
    ".git/",
    "__pycache__/",
    ".pytest_cache/",
    "node_modules/",
    "logs/",
    ".env*",
    "*.pyc",
    "*.log",
]

def should_skip_file(file_path: str) -> bool:
    """Check if file should be skipped."""
    return any(skip in file_path for skip in SKIP_FILES)

def sanitize_file(file_path: str) -> Tuple[bool, List[str]]:
    """
    Sanitize a single file by replacing hardcoded credentials.
    
    Returns:
        Tuple of (was_modified, list_of_changes)
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes = []
        
        # Apply credential mappings
        for hardcoded, replacement in CREDENTIAL_MAPPINGS.items():
            if hardcoded in content:
                content = content.replace(hardcoded, replacement)
                changes.append(f"Replaced '{hardcoded}' with '{replacement}'")
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, changes
        
        return False, []
        
    except Exception as e:
        logger.error(f"❌ Error processing {file_path}: {e}")
        return False, []

def find_files_to_sanitize() -> List[str]:
    """Find all files that need credential sanitization."""
    files_to_process = set()
    
    for pattern in FILE_PATTERNS:
        for file_path in glob.glob(pattern, recursive=True):
            if not should_skip_file(file_path) and os.path.isfile(file_path):
                files_to_process.add(file_path)
    
    return sorted(files_to_process)

def create_environment_template():
    """Create sanitized environment template."""
    template_content = """# VANA Environment Configuration Template
# Replace placeholder values with your actual project configuration

# Core Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
PROJECT_NUMBER=your-project-number
GOOGLE_CLOUD_LOCATION=us-central1

# Service Accounts
VECTOR_SEARCH_SERVICE_ACCOUNT=your-vector-search-sa@your-project-id.iam.gserviceaccount.com

# RAG Configuration
RAG_CORPUS_RESOURCE_NAME=projects/your-project-id/locations/us-central1/ragCorpora/your-corpus

# Service URLs
VANA_PROD_URL=https://your-prod-service-url
VANA_DEV_URL=https://your-dev-service-url

# API Keys (set these securely)
GOOGLE_API_KEY=your-google-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
BRAVE_API_KEY=your-brave-api-key
"""
    
    with open('.env.template', 'w') as f:
        f.write(template_content)
    
    logger.info("✅ Created .env.template with sanitized placeholders")

def main():
    """Main sanitization process."""
    logger.info("🧹 VANA Credential Sanitization")
    logger.info("%s", "=" * 50)
    
    # Find files to process
    files_to_sanitize = find_files_to_sanitize()
    
    if not files_to_sanitize:
        logger.info("✅ No files found that need sanitization!")
        return
    
    logger.info(f"📁 Found {len(files_to_sanitize)} files to sanitize:")
    for file_path in files_to_sanitize[:10]:  # Show first 10
        logger.info(f"  - {file_path}")
    if len(files_to_sanitize) > 10:
        logger.info(f"  ... and {len(files_to_sanitize) - 10} more")
    
    logger.info("\n🚀 Starting sanitization...")
    
    modified_count = 0
    total_changes = 0
    
    for file_path in files_to_sanitize:
        was_modified, changes = sanitize_file(file_path)
        if was_modified:
            modified_count += 1
            total_changes += len(changes)
            logger.info(f"✅ Sanitized: {file_path}")
            for change in changes:
                logger.info(f"    - {change}")
        else:
            logger.info(f"⏭️  No changes: {file_path}")
    
    # Create environment template
    create_environment_template()
    
    logger.info(f"\n🎉 Sanitization complete!")
    logger.info(f"✅ Modified {modified_count} files")
    logger.info(f"🔄 Applied {total_changes} credential replacements")
    logger.info(f"📝 Created .env.template for configuration")
    
    logger.info("\n⚠️  IMPORTANT NEXT STEPS:")
    logger.info("1. Review all changes before committing")
    logger.info("2. Update deployment scripts to use environment variables")
    logger.info("3. Configure secrets in your deployment environment")
    logger.info("4. Test all functionality with new configuration")

if __name__ == "__main__":
    main()

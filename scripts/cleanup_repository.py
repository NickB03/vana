#!/usr/bin/env python3
"""
VANA Repository Cleanup Script

Removes compiled bytecode, log files, and other artifacts that shouldn't be in version control.
Updates .gitignore to prevent future issues.
"""

import os
import shutil
import glob
from pathlib import Path
from typing import List
from lib.logging_config import get_logger
logger = get_logger("vana.cleanup_repository")


# Patterns to remove
CLEANUP_PATTERNS = [
    "**/__pycache__",
    "**/*.pyc", 
    "**/*.pyo",
    "**/*.pyd",
    "**/.pytest_cache",
    "**/logs/*.log",
    "**/logs/*.jsonl",
    "**/.DS_Store",
    "**/Thumbs.db",
    "**/*.tmp",
    "**/*.temp",
]

# Large files to remove (over 100KB)
LARGE_FILE_THRESHOLD = 100 * 1024  # 100KB

def remove_pattern(pattern: str) -> List[str]:
    """Remove files matching pattern and return list of removed items."""
    removed = []
    
    for path in glob.glob(pattern, recursive=True):
        try:
            if os.path.isfile(path):
                os.remove(path)
                removed.append(f"File: {path}")
            elif os.path.isdir(path):
                shutil.rmtree(path)
                removed.append(f"Directory: {path}")
        except Exception as e:
            logger.error(f"❌ Error removing {path}: {e}")
    
    return removed

def find_large_files() -> List[str]:
    """Find large files that might not belong in the repository."""
    large_files = []
    
    for root, dirs, files in os.walk("."):
        # Skip .git directory
        if ".git" in dirs:
            dirs.remove(".git")
            
        for file in files:
            file_path = os.path.join(root, file)
            try:
                if os.path.getsize(file_path) > LARGE_FILE_THRESHOLD:
                    size_mb = os.path.getsize(file_path) / (1024 * 1024)
                    large_files.append(f"{file_path} ({size_mb:.1f}MB)")
            except OSError:
                continue
    
    return large_files

def update_gitignore():
    """Update .gitignore with comprehensive patterns."""
    gitignore_additions = """
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Testing
.pytest_cache/
.coverage
htmlcov/
.tox/
.cache
nosetests.xml
coverage.xml
*.cover
.hypothesis/

# Environments
.env
.env.local
.env.production
.venv
env/
venv/
ENV/
env.bak/
venv.bak/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Logs
logs/
*.log
*.jsonl

# Temporary files
*.tmp
*.temp
*.bak
*.backup

# Google Cloud
credentials.json
service-account-key.json

# VANA specific
sessions.db
test_results/
.pytest_cache/
"""
    
    try:
        # Read existing .gitignore
        existing_content = ""
        if os.path.exists(".gitignore"):
            with open(".gitignore", "r") as f:
                existing_content = f.read()
        
        # Check if additions are needed
        lines_to_add = []
        for line in gitignore_additions.strip().split('\n'):
            line = line.strip()
            if line and not line.startswith('#') and line not in existing_content:
                lines_to_add.append(line)
        
        if lines_to_add:
            with open(".gitignore", "a") as f:
                f.write("\n# Added by cleanup script\n")
                for line in lines_to_add:
                    f.write(f"{line}\n")
            
            logger.info(f"✅ Added {len(lines_to_add)} new patterns to .gitignore")
        else:
            logger.info("✅ .gitignore is already comprehensive")
            
    except Exception as e:
        logger.error(f"❌ Error updating .gitignore: {e}")

def main():
    """Main cleanup process."""
    logger.info("🧹 VANA Repository Cleanup")
    logger.info("%s", "=" * 40)
    
    total_removed = 0
    
    # Remove cleanup patterns
    logger.info("\n📁 Removing compiled bytecode and cache files...")
    for pattern in CLEANUP_PATTERNS:
        removed = remove_pattern(pattern)
        if removed:
            total_removed += len(removed)
            logger.info("%s", f"✅ Removed {len(removed)} items matching '{pattern}'")
            for item in removed[:5]:  # Show first 5
                logger.info(f"    - {item}")
            if len(removed) > 5:
                logger.info(f"    ... and {len(removed) - 5} more")
    
    # Find large files
    logger.info("\n📊 Checking for large files...")
    large_files = find_large_files()
    if large_files:
        logger.info(f"⚠️  Found {len(large_files)} large files:")
        for file_info in large_files[:10]:  # Show first 10
            logger.info(f"    - {file_info}")
        if len(large_files) > 10:
            logger.info(f"    ... and {len(large_files) - 10} more")
        logger.info("    Consider reviewing these files for repository inclusion")
    else:
        logger.info("✅ No unusually large files found")
    
    # Update .gitignore
    logger.info("\n📝 Updating .gitignore...")
    update_gitignore()
    
    logger.info(f"\n🎉 Cleanup complete!")
    logger.info(f"✅ Removed {total_removed} items")
    logger.info(f"📝 Updated .gitignore with comprehensive patterns")
    
    logger.info("\n⚠️  RECOMMENDED NEXT STEPS:")
    logger.info("1. Review changes before committing")
    logger.info("%s", "2. Run 'git status' to see what was removed")
    logger.info("3. Consider adding large files to .gitignore if needed")
    logger.info("4. Test that your application still works correctly")

if __name__ == "__main__":
    main()

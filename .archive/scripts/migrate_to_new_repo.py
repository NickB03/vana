#!/usr/bin/env python3
"""
Migration script to copy core VANA backend files to new repository.
Excludes documentation, frontend (vana-ui), and development artifacts.
"""

import os
import shutil
from pathlib import Path
from typing import List, Set
import argparse
import sys

# Define source and destination
SOURCE_DIR = Path("/Users/nick/Development/vana")
EXCLUDE_PATTERNS = {
    # Documentation
    "*.md",
    "**/*.md",
    "docs/",
    ".development/",
    
    # Frontend (to be handled separately)
    "vana-ui/",
    
    # Generated/cached files
    "__pycache__/",
    "**/__pycache__/",
    "*.pyc",
    "**/*.pyc",
    ".pytest_cache/",
    "**/.pytest_cache/",
    "dist/",
    "**/dist/",
    "build/",
    "**/build/",
    "*.egg-info/",
    "**/*.egg-info/",
    ".coverage",
    "htmlcov/",
    
    # Development artifacts
    "logs/",
    ".venv/",
    "venv/",
    "node_modules/",
    ".env",
    ".env.local",
    ".env.*.local",
    
    # Backups and temporary files
    "*_backup.py",
    "*_broken.py",
    "*.tmp",
    "*.log",
    "*.bak",
    "~*",
    
    # IDE files
    ".idea/",
    ".vscode/settings.json",
    "*.swp",
    "*.swo",
    ".DS_Store",
    
    # Test artifacts
    "tests/one_time_tests/",
    "tests/test_results/",
    
    # Git files (will init fresh)
    ".git/",
    ".gitmodules",
}

# Core directories to migrate
CORE_DIRECTORIES = [
    "agents",
    "lib",
    "api",
    "config",
    "deployment",
    "scripts",
    "tests",
    "dashboard",
]

# Root files to migrate
ROOT_FILES = [
    "main.py",
    "main_agentic.py",
    "__init__.py",
    "pyproject.toml",
    "poetry.lock",
    ".env.example",
    "Dockerfile",
    "Dockerfile.dev",
    "Dockerfile.prod",
    "docker-compose.yml",
    "docker-compose.override.yml",
    ".dockerignore",
    "Makefile",
    ".gitignore",
    ".pre-commit-config.yaml",
    "conftest.py",
    "gunicorn.conf.py",
    "cloudbuild.yaml",
    "cloudbuild-staging.yaml",
    "start_backend.sh",
    "start-vana-ui.sh",
    "deploy-staging.sh",
    "deploy-staging-adk.sh",
    "playwright.config.ts",
]

# VS Code config files to migrate
VSCODE_FILES = [
    ".vscode/launch.json",
    ".vscode/tasks.json",
]


def should_exclude(path: Path, exclude_patterns: Set[str]) -> bool:
    """Check if a path should be excluded based on patterns."""
    path_str = str(path)
    
    # Check each exclude pattern
    for pattern in exclude_patterns:
        # Direct name match
        if path.name == pattern.replace("*/", "").replace("/*", ""):
            return True
        
        # Pattern in path
        if pattern.startswith("**/"):
            if pattern[3:] in path_str:
                return True
        elif pattern.endswith("/"):
            if f"/{pattern}" in path_str or path_str.endswith(pattern):
                return True
        elif "*" in pattern:
            import fnmatch
            if fnmatch.fnmatch(path.name, pattern):
                return True
        elif pattern in path_str:
            return True
    
    return False


def copy_with_structure(src: Path, dest_base: Path, exclude_patterns: Set[str]) -> int:
    """Copy files maintaining directory structure, excluding patterns."""
    copied_count = 0
    
    if src.is_file():
        if not should_exclude(src, exclude_patterns):
            dest = dest_base / src.relative_to(SOURCE_DIR)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            copied_count = 1
    else:
        for item in src.rglob("*"):
            if item.is_file() and not should_exclude(item, exclude_patterns):
                relative_path = item.relative_to(SOURCE_DIR)
                dest = dest_base / relative_path
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(item, dest)
                copied_count += 1
    
    return copied_count


def migrate_backend(dest_dir: Path, dry_run: bool = False) -> None:
    """Migrate backend files to new repository."""
    print(f"🚀 Starting VANA backend migration")
    print(f"Source: {SOURCE_DIR}")
    print(f"Destination: {dest_dir}")
    print(f"Mode: {'DRY RUN' if dry_run else 'ACTUAL COPY'}")
    print("-" * 60)
    
    if not SOURCE_DIR.exists():
        print(f"❌ Source directory not found: {SOURCE_DIR}")
        sys.exit(1)
    
    if not dry_run:
        dest_dir.mkdir(parents=True, exist_ok=True)
    
    total_copied = 0
    
    # Copy core directories
    print("\n📁 Migrating core directories:")
    for directory in CORE_DIRECTORIES:
        src_path = SOURCE_DIR / directory
        if src_path.exists():
            if dry_run:
                file_count = sum(1 for _ in src_path.rglob("*") if _.is_file() and not should_exclude(_, EXCLUDE_PATTERNS))
                print(f"  - {directory}: ~{file_count} files")
            else:
                count = copy_with_structure(src_path, dest_dir, EXCLUDE_PATTERNS)
                total_copied += count
                print(f"  ✓ {directory}: {count} files copied")
        else:
            print(f"  ⚠️  {directory}: directory not found")
    
    # Copy root files
    print("\n📄 Migrating root files:")
    for file_name in ROOT_FILES:
        src_file = SOURCE_DIR / file_name
        if src_file.exists():
            if dry_run:
                print(f"  - {file_name}")
            else:
                dest_file = dest_dir / file_name
                shutil.copy2(src_file, dest_file)
                total_copied += 1
                print(f"  ✓ {file_name}")
        else:
            print(f"  ⚠️  {file_name}: not found")
    
    # Copy VS Code config
    print("\n⚙️  Migrating VS Code configuration:")
    vscode_dir = dest_dir / ".vscode"
    if not dry_run:
        vscode_dir.mkdir(exist_ok=True)
    
    for vscode_file in VSCODE_FILES:
        src_file = SOURCE_DIR / vscode_file
        if src_file.exists():
            if dry_run:
                print(f"  - {vscode_file}")
            else:
                dest_file = dest_dir / vscode_file
                dest_file.parent.mkdir(exist_ok=True)
                shutil.copy2(src_file, dest_file)
                total_copied += 1
                print(f"  ✓ {vscode_file}")
    
    # Summary
    print("\n" + "=" * 60)
    if dry_run:
        print("🔍 DRY RUN COMPLETE - No files were copied")
        print("Run without --dry-run to perform actual migration")
    else:
        print(f"✅ Migration complete! {total_copied} files copied")
        print("\n📝 Next steps:")
        print("1. cd " + str(dest_dir))
        print("2. git init")
        print("3. git remote add origin https://github.com/NickB03/vana-ai.git")
        print("4. Review .env.example and create .env")
        print("5. Run 'poetry install' to set up Python environment")
        print("6. Test with 'python main.py'")
        print("\n⚠️  Remember to migrate vana-ui separately after backend is working!")


def main():
    parser = argparse.ArgumentParser(description="Migrate VANA backend to new repository")
    parser.add_argument(
        "destination",
        type=str,
        help="Destination directory for new repository (e.g., /Users/nick/Development/vana-ai)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be copied without actually copying"
    )
    
    args = parser.parse_args()
    dest_dir = Path(args.destination)
    
    # Confirm before proceeding
    if not args.dry_run and dest_dir.exists() and any(dest_dir.iterdir()):
        response = input(f"⚠️  Destination {dest_dir} is not empty. Continue? (y/N): ")
        if response.lower() != 'y':
            print("Aborted.")
            sys.exit(0)
    
    migrate_backend(dest_dir, args.dry_run)


if __name__ == "__main__":
    main()
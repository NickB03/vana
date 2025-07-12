#!/usr/bin/env python3
"""
Test Phase 1 Tiered Indexing
Validate which files would be indexed with the new approach
"""

from pathlib import Path
from typing import List


def should_process_file(file_path: Path) -> bool:
    """Determine if file should trigger memory update - Phase 1 Tiered Indexing with Enhanced Exclusions"""

    # FIRST: Check exclusions to prevent bad source of truth

    # Archive and legacy directories (ALWAYS exclude)
    exclude_dirs = [
        "archive/",
        "memory-bank/",
        "node_modules/",
        ".git/",
        "__pycache__/",
        ".pytest_cache/",
        "build/",
        "dist/",
        ".venv/",
        "venv/",
        ".mypy_cache/",
        ".coverage/",
        "htmlcov/",
        ".tox/",
        ".env/",
        "logs/",
        "tmp/",
        "temp/",
        ".DS_Store",
        ".idea/",
        ".vscode/settings.json",
    ]
    for exclude_dir in exclude_dirs:
        if exclude_dir in str(file_path):
            return False

    # Old/legacy file patterns (exclude one-time scripts, old docs)
    legacy_patterns = [
        "old_",
        "legacy_",
        "deprecated_",
        "backup_",
        "temp_",
        "test_temp",
        "_backup",
        "_old",
        "_legacy",
        "_deprecated",
        "scratch_",
        "experiment_",
    ]
    if any(pattern in file_path.name.lower() for pattern in legacy_patterns):
        return False

    # One-time scripts and experimental files
    one_time_patterns = [
        "setup_",
        "install_",
        "migration_",
        "fix_",
        "hotfix_",
        "patch_",
        "debug_",
        "troubleshoot_",
        "analyze_",
        "benchmark_",
    ]
    # Only exclude if they're clearly one-time (have dates or temp indicators)
    if any(pattern in file_path.name.lower() for pattern in one_time_patterns):
        name_lower = file_path.name.lower()
        if any(indicator in name_lower for indicator in ["2023", "2024", "2025", "temp", "tmp", "test"]):
            return False

    # Large binary or generated files
    exclude_extensions = [
        ".pyc",
        ".pyo",
        ".pyd",
        ".so",
        ".dll",
        ".dylib",
        ".exe",
        ".zip",
        ".tar",
        ".gz",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".ico",
        ".svg",
        ".pdf",
        ".mp4",
        ".mov",
        ".log",
        ".pid",
        ".lock",
        ".sqlite",
        ".db",
        ".cache",
    ]
    if file_path.suffix.lower() in exclude_extensions:
        return False

    # NOW: Check what TO include

    # Always process .claude/ directory files (current project state)
    if ".claude" in str(file_path):
        return file_path.suffix in [".md", ".json"]

    # Core project files (always index - these define the project)
    core_files = [
        "CLAUDE.md",
        "README.md",
        "requirements.txt",
        "pyproject.toml",
        "setup.py",
        "main.py",
        "__init__.py",
        "Dockerfile",
        "docker-compose.yml",
    ]
    if file_path.name in core_files:
        return True

    # Current documentation (exclude old docs)
    if "docs/" in str(file_path) and file_path.suffix == ".md":
        # Only include if not in a versioned or archived subdirectory
        if not any(old_dir in str(file_path).lower() for old_dir in ["v1/", "v2/", "old/", "archive/", "deprecated/"]):
            return True

    # Phase 1: Core source directories (current active code only)
    core_dirs = ["agents/", "lib/", "tools/", "config/", "scripts/", "tests/framework/"]

    for core_dir in core_dirs:
        if core_dir in str(file_path):
            # Python files in core directories
            if file_path.suffix in [".py"]:
                return True
            # Current configuration files
            elif file_path.suffix in [".json", ".yaml", ".yml", ".toml", ".env"]:
                return True
            # Active shell scripts and deployment files
            elif file_path.suffix in [".sh"] or file_path.name in ["Dockerfile"]:
                return True

    # Deployment and infrastructure (current only)
    deployment_dirs = ["deployment/", "docker/", "k8s/", "terraform/"]
    for deploy_dir in deployment_dirs:
        if deploy_dir in str(file_path):
            if file_path.suffix in [".yml", ".yaml", ".json", ".tf", ".sh", ".dockerfile"]:
                return True

    # Additional high-value files by name pattern (current infrastructure)
    high_value_patterns = ["docker-compose", "requirements", "Makefile", "Dockerfile"]
    if any(pattern in file_path.name.lower() for pattern in high_value_patterns):
        return True

    return False


def analyze_repository_indexing(root_path: Path) -> dict:
    """Analyze what files would be indexed with Phase 1 approach"""

    all_files = []
    indexed_files = []
    excluded_files = []

    # Walk through all files
    for file_path in root_path.rglob("*"):
        if file_path.is_file():
            all_files.append(file_path)

            if should_process_file(file_path):
                indexed_files.append(file_path)
            else:
                excluded_files.append(file_path)

    # Categorize indexed files
    categories = {"python_files": [], "config_files": [], "documentation": [], "scripts": [], "core_files": []}

    for file_path in indexed_files:
        if file_path.suffix == ".py":
            categories["python_files"].append(file_path)
        elif file_path.suffix in [".json", ".yaml", ".yml", ".toml", ".env"]:
            categories["config_files"].append(file_path)
        elif file_path.suffix == ".md":
            categories["documentation"].append(file_path)
        elif file_path.suffix in [".sh"]:
            categories["scripts"].append(file_path)
        else:
            categories["core_files"].append(file_path)

    return {
        "total_files": len(all_files),
        "indexed_files": len(indexed_files),
        "excluded_files": len(excluded_files),
        "index_percentage": round((len(indexed_files) / len(all_files)) * 100, 2),
        "categories": categories,
        "sample_indexed": indexed_files[:10],
        "sample_excluded": excluded_files[:10],
    }


def identify_cleanup_candidates(root_path: Path) -> dict:
    """Identify files that should be cleaned from existing index"""

    cleanup_candidates = []

    for file_path in root_path.rglob("*"):
        if file_path.is_file():
            # Check if this file would be excluded by our new logic
            if not should_process_file(file_path):
                # But might have been indexed before (check common patterns)
                if file_path.suffix in [".py", ".md", ".json", ".yaml", ".yml"]:
                    cleanup_candidates.append(file_path)

    # Categorize cleanup candidates
    categories = {
        "archive_files": [],
        "legacy_files": [],
        "one_time_scripts": [],
        "old_docs": [],
        "generated_files": [],
    }

    for file_path in cleanup_candidates:
        if "archive" in str(file_path).lower():
            categories["archive_files"].append(file_path)
        elif any(pattern in file_path.name.lower() for pattern in ["old_", "legacy_", "deprecated_", "_old"]):
            categories["legacy_files"].append(file_path)
        elif any(pattern in file_path.name.lower() for pattern in ["setup_", "install_", "fix_", "debug_"]):
            categories["one_time_scripts"].append(file_path)
        elif file_path.suffix == ".md" and any(old_dir in str(file_path).lower() for old_dir in ["v1/", "v2/", "old/"]):
            categories["old_docs"].append(file_path)
        else:
            categories["generated_files"].append(file_path)

    return {
        "total_candidates": len(cleanup_candidates),
        "categories": categories,
        "sample_cleanup": cleanup_candidates[:15],
    }


def main():
    """Main analysis function"""

    repo_root = Path("/Users/nick/Development/vana")

    print("🔍 Phase 1 Tiered Indexing Analysis with Index Cleanup Strategy")
    print("=" * 70)

    # Analyze the repository
    results = analyze_repository_indexing(repo_root)

    print(f"📊 Repository Statistics:")
    print(f"   Total files: {results['total_files']:,}")
    print(f"   Files to index: {results['indexed_files']:,}")
    print(f"   Files excluded: {results['excluded_files']:,}")
    print(f"   Index percentage: {results['index_percentage']}%")

    print(f"\n📁 Indexed File Categories:")
    for category, files in results["categories"].items():
        if files:
            print(f"   {category.replace('_', ' ').title()}: {len(files)} files")

    # Index cleanup analysis
    cleanup_results = identify_cleanup_candidates(repo_root)

    print(f"\n🧹 Index Cleanup Strategy:")
    print(f"   Files to clean from existing index: {cleanup_results['total_candidates']:,}")

    print(f"\n🗑️ Cleanup Categories:")
    for category, files in cleanup_results["categories"].items():
        if files:
            print(f"   {category.replace('_', ' ').title()}: {len(files)} files")

    print(f"\n✅ Sample Files to Index (Clean Source of Truth):")
    for file_path in results["sample_indexed"]:
        relative_path = file_path.relative_to(repo_root)
        print(f"   ✓ {relative_path}")

    print(f"\n🧹 Sample Files to Clean from Index:")
    for file_path in cleanup_results["sample_cleanup"]:
        relative_path = file_path.relative_to(repo_root)
        print(f"   🗑️ {relative_path}")

    # Performance impact estimate
    estimated_chunks = results["indexed_files"] * 3  # Average 3 chunks per file
    estimated_size_mb = estimated_chunks * 0.5  # Average 0.5KB per chunk
    cleanup_savings_mb = cleanup_results["total_candidates"] * 0.5 * 3 * 0.5  # Cleanup savings

    print(f"\n📈 Performance Impact & Optimization:")
    print(f"   Estimated chunks (clean index): {estimated_chunks:,}")
    print(f"   Estimated database size: {estimated_size_mb:.1f} MB")
    print(f"   Memory usage (approx): {estimated_size_mb * 2:.1f} MB")
    print(f"   Storage saved by cleanup: {cleanup_savings_mb:.1f} MB")

    # Quality assessment
    quality_ratio = (
        results["indexed_files"] / cleanup_results["total_candidates"]
        if cleanup_results["total_candidates"] > 0
        else float("inf")
    )

    print(f"\n📊 Index Quality Assessment:")
    print(f"   Good files vs cleanup candidates ratio: {quality_ratio:.1f}:1")

    if results["index_percentage"] < 10:
        print(f"   ✅ Efficient - only {results['index_percentage']}% of files indexed")
    elif results["index_percentage"] < 25:
        print(f"   ⚠️ Moderate - {results['index_percentage']}% of files indexed")
    else:
        print(f"   ❌ Too broad - {results['index_percentage']}% of files indexed")

    if quality_ratio > 2:
        print(f"   ✅ Clean source of truth - low contamination from legacy files")
    elif quality_ratio > 1:
        print(f"   ⚠️ Moderate contamination - consider more aggressive cleanup")
    else:
        print(f"   ❌ High contamination - major cleanup needed")

    print(f"\n💡 Recommended Strategy:")
    if results["index_percentage"] < 15 and quality_ratio > 2:
        print("   ✅ Proceed with Phase 1 indexing")
        print("   🧹 Run cleanup to remove legacy content")
        print("   📊 Monitor query quality and adjust exclusions")
    else:
        print("   ⚠️ Consider more restrictive filtering")
        print("   🔄 Test with smaller core directories first")
        print("   📈 Gradually expand based on query performance")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Script Usage Analysis and Archival Tool

Analyzes Python scripts in the repository to identify which are actively used
vs. experimental/legacy scripts that should be archived.
"""

import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set

from lib.logging_config import get_logger

logger = get_logger("vana.analyze_and_archive_scripts")

# Scripts that are definitely active/core (should NOT be archived)
CORE_SCRIPTS = {
    "main.py",
    "scripts/run_tests.sh",
    "scripts/run_all_tests.sh",
    "scripts/run_vana_tests.sh",
    "scripts/cleanup_repository.py",
    "scripts/sanitize_credentials.py",
    "scripts/update_cloud_run_urls.py",
    "scripts/setup_n8n_workflows.py",
    "scripts/populate_vana_memory.py",
    "scripts/create_vana_knowledge_base.py",
    "scripts/github_sync/sync_knowledge.py",
    "scripts/import_claude_history.py",
    "scripts/memory_data_migration.py",
    "scripts/initialize_memory.py",
    "scripts/validate_environment.py",
    "scripts/configure_environment.sh",
    "scripts/run_knowledge_base_update.sh",
    "scripts/run_enhanced_evaluation.sh",
}

# Patterns that indicate experimental/testing scripts
EXPERIMENTAL_PATTERNS = [
    "test_",
    "debug_",
    "diagnose_",
    "verify_",
    "benchmark_",
    "demo_",
    "juno_",  # Specific agent testing
    "phase1_",
    "phase2_",
    "puppeteer_",
    "quick_test",
    "comprehensive_test",
    "enhanced_test",
]


def analyze_script_usage():
    """Analyze which scripts are actively used vs. experimental."""

    # Get all Python scripts
    all_scripts = []
    for root, dirs, files in os.walk("."):
        # Skip certain directories
        if any(skip in root for skip in [".git", "__pycache__", ".pytest_cache", "node_modules"]):
            continue

        for file in files:
            if file.endswith(".py") or file.endswith(".sh"):
                script_path = os.path.join(root, file).replace("./", "")
                all_scripts.append(script_path)

    # Categorize scripts
    core_scripts = set()
    experimental_scripts = set()

    for script in all_scripts:
        script_name = os.path.basename(script)

        # Check if it's a core script
        if script in CORE_SCRIPTS or script_name in CORE_SCRIPTS:
            core_scripts.add(script)
        # Check if it matches experimental patterns
        elif any(pattern in script_name for pattern in EXPERIMENTAL_PATTERNS):
            experimental_scripts.add(script)
        # Scripts in certain directories are likely experimental
        elif "scripts/" in script and script_name.startswith("test_"):
            experimental_scripts.add(script)
        else:
            # Default to core for safety
            core_scripts.add(script)

    return {
        "core_scripts": sorted(core_scripts),
        "experimental_scripts": sorted(experimental_scripts),
        "total_scripts": len(all_scripts),
    }


def get_script_print_counts():
    """Get print statement counts for each script from our audit."""
    try:
        with open("debug_audit_report.json", "r") as f:
            audit_data = json.load(f)

        print_counts = {}
        for category, statements in audit_data["detailed_breakdown"]["by_category"].items():
            for stmt in statements:
                file_path = stmt["file"].replace("./", "")
                if file_path not in print_counts:
                    print_counts[file_path] = 0
                print_counts[file_path] += 1

        return print_counts
    except FileNotFoundError:
        logger.warning("debug_audit_report.json not found, cannot get print counts")
        return {}


def create_archive_directory():
    """Create archive directory structure."""
    archive_dir = Path("archived_scripts")
    archive_dir.mkdir(exist_ok=True)

    # Create subdirectories
    (archive_dir / "experimental_tests").mkdir(exist_ok=True)
    (archive_dir / "debugging_tools").mkdir(exist_ok=True)
    (archive_dir / "legacy_scripts").mkdir(exist_ok=True)

    return archive_dir


def archive_experimental_scripts(experimental_scripts: List[str], print_counts: Dict[str, int]):
    """Archive experimental scripts and return summary."""

    archive_dir = create_archive_directory()
    archived_files = []
    total_print_statements_archived = 0

    for script in experimental_scripts:
        if not os.path.exists(script):
            continue

        # Determine subdirectory
        script_name = os.path.basename(script)
        if any(pattern in script_name for pattern in ["test_", "benchmark_"]):
            subdir = "experimental_tests"
        elif any(pattern in script_name for pattern in ["debug_", "diagnose_", "verify_"]):
            subdir = "debugging_tools"
        else:
            subdir = "legacy_scripts"

        # Archive the file
        dest_path = archive_dir / subdir / script_name
        try:
            shutil.move(script, str(dest_path))
            print_count = print_counts.get(script, 0)
            total_print_statements_archived += print_count

            archived_files.append(
                {
                    "original_path": script,
                    "archived_path": str(dest_path),
                    "print_statements": print_count,
                    "category": subdir,
                }
            )
            logger.info(f"✅ Archived {script} → {dest_path} ({print_count} print statements)")
        except Exception as e:
            logger.error(f"❌ Failed to archive {script}: {e}")

    return archived_files, total_print_statements_archived


def generate_archive_report(analysis: Dict, archived_files: List[Dict], total_archived_prints: int):
    """Generate a comprehensive archive report."""

    report = {
        "timestamp": datetime.now().isoformat(),
        "analysis_summary": {
            "total_scripts_analyzed": analysis["total_scripts"],
            "core_scripts_count": len(analysis["core_scripts"]),
            "experimental_scripts_count": len(analysis["experimental_scripts"]),
            "scripts_archived": len(archived_files),
            "print_statements_archived": total_archived_prints,
        },
        "core_scripts": analysis["core_scripts"],
        "archived_files": archived_files,
        "archive_categories": {
            "experimental_tests": len([f for f in archived_files if f["category"] == "experimental_tests"]),
            "debugging_tools": len([f for f in archived_files if f["category"] == "debugging_tools"]),
            "legacy_scripts": len([f for f in archived_files if f["category"] == "legacy_scripts"]),
        },
    }

    # Save report
    with open("script_archive_report.json", "w") as f:
        json.dump(report, f, indent=2)

    return report


def main():
    """Main execution function."""
    logger.info("🔍 Analyzing Script Usage Patterns...")
    logger.info("=" * 50)

    # Analyze script usage
    analysis = analyze_script_usage()
    logger.info(f"📊 Total scripts found: {analysis['total_scripts']}")
    logger.info(f"🔧 Core scripts: {len(analysis['core_scripts'])}")
    logger.info(f"🧪 Experimental scripts: {len(analysis['experimental_scripts'])}")

    # Get print statement counts
    logger.info("\n📋 Getting print statement counts...")
    print_counts = get_script_print_counts()

    # Calculate print statements in experimental scripts
    experimental_prints = sum(print_counts.get(script, 0) for script in analysis["experimental_scripts"])
    core_prints = sum(print_counts.get(script, 0) for script in analysis["core_scripts"])

    logger.info(f"📈 Print statements in experimental scripts: {experimental_prints}")
    logger.info(f"📈 Print statements in core scripts: {core_prints}")

    # Show what will be archived
    logger.info(f"\n🗂️  Scripts to be archived ({len(analysis['experimental_scripts'])}):")
    for script in analysis["experimental_scripts"][:10]:  # Show first 10
        count = print_counts.get(script, 0)
        logger.info(f"   - {script} ({count} print statements)")
    if len(analysis["experimental_scripts"]) > 10:
        logger.info(f"   ... and {len(analysis['experimental_scripts']) - 10} more")

    # Ask for confirmation
    logger.info(f"\n⚠️  This will archive {len(analysis['experimental_scripts'])} experimental scripts")
    logger.info(f"   and remove {experimental_prints} print statements from active consideration.")
    logger.info(f"   Core scripts ({len(analysis['core_scripts'])}) with {core_prints} print statements will remain.")

    response = input("\nProceed with archiving? (y/N): ").strip().lower()

    if response == "y":
        logger.info("\n📦 Archiving experimental scripts...")
        archived_files, total_archived_prints = archive_experimental_scripts(
            analysis["experimental_scripts"], print_counts
        )

        # Generate report
        generate_archive_report(analysis, archived_files, total_archived_prints)

        logger.info(f"\n🎉 Archive Complete!")
        logger.info(f"📁 Archived {len(archived_files)} scripts")
        logger.info(f"📉 Removed {total_archived_prints} print statements from active consideration")
        logger.info(f"📊 Report saved to: script_archive_report.json")
        logger.info(f"📂 Archived files in: archived_scripts/")

        # Show remaining work
        remaining_prints = core_prints
        logger.info(f"\n🎯 Remaining work for Task #3:")
        logger.info(f"   - {len(analysis['core_scripts'])} core scripts to process")
        logger.info(f"   - {remaining_prints} print statements to replace with logging")

    else:
        logger.info("\n❌ Archive cancelled. No files were moved.")


if __name__ == "__main__":
    main()

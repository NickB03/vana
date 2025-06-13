#!/usr/bin/env python3
"""
VANA Comprehensive Cleanup Orchestrator

Master script that coordinates all cleanup activities based on Codex agent analysis.
Addresses all identified code quality issues systematically.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from lib.logging_config import get_logger
logger = get_logger("vana.comprehensive_cleanup")


def run_script(script_name: str, description: str) -> bool:
    """Run a cleanup script and return success status."""
    logger.info("%s", f"\n{'='*60}")
    logger.info(f"🚀 {description}")
    logger.info("%s", f"{'='*60}")
    
    try:
        result = subprocess.run([
            sys.executable, script_name
        ], check=True, capture_output=True, text=True)
        
        logger.info("%s", result.stdout)
        if result.stderr:
            logger.warning("Warnings:", result.stderr)
        
        logger.info(f"✅ {description} completed successfully")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ {description} failed:")
        logger.info(f"Exit code: {e.returncode}")
        logger.error(f"Error output: {e.stderr}")
        return False
    except FileNotFoundError:
        logger.info(f"❌ Script not found: {script_name}")
        return False

def check_git_status():
    """Check if there are uncommitted changes."""
    try:
        result = subprocess.run([
            "git", "status", "--porcelain"
        ], capture_output=True, text=True, check=True)
        
        if result.stdout.strip():
            logger.info("⚠️  Uncommitted changes detected:")
            logger.info("%s", result.stdout)
            return False
        return True
    except subprocess.CalledProcessError:
        logger.info("⚠️  Could not check git status")
        return False

def create_backup_branch():
    """Create a backup branch before cleanup."""
    try:
        # Get current branch name
        result = subprocess.run([
            "git", "branch", "--show-current"
        ], capture_output=True, text=True, check=True)
        current_branch = result.stdout.strip()
        
        # Create backup branch
        backup_branch = f"backup-before-cleanup-{current_branch}"
        subprocess.run([
            "git", "checkout", "-b", backup_branch
        ], check=True, capture_output=True)
        
        # Switch back to original branch
        subprocess.run([
            "git", "checkout", current_branch
        ], check=True, capture_output=True)
        
        logger.info(f"✅ Created backup branch: {backup_branch}")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to create backup branch: {e}")
        return False

def main():
    """Main cleanup orchestration."""
    parser = argparse.ArgumentParser(description="VANA Comprehensive Cleanup")
    parser.add_argument("--skip-backup", action="store_true", 
                       help="Skip creating backup branch")
    parser.add_argument("--skip-git-check", action="store_true",
                       help="Skip git status check")
    parser.add_argument("--phase", choices=["1", "2", "3", "all"], default="all",
                       help="Run specific cleanup phase")
    
    args = parser.parse_args()
    
    logger.info("🧹 VANA COMPREHENSIVE CLEANUP")
    logger.info("%s", "=" * 50)
    logger.info("Based on Codex Agent Analysis")
    logger.info("Addressing all identified code quality issues")
    logger.info("%s", "=" * 50)
    
    # Pre-cleanup checks
    if not args.skip_git_check:
        logger.info("\n🔍 Checking git status...")
        if not check_git_status():
            response = input("\nContinue with uncommitted changes? (y/N): ")
            if response.lower() != 'y':
                logger.info("Cleanup cancelled. Please commit or stash changes first.")
                return 1
    
    # Create backup branch
    if not args.skip_backup:
        logger.info("\n💾 Creating backup branch...")
        if not create_backup_branch():
            response = input("\nContinue without backup? (y/N): ")
            if response.lower() != 'y':
                logger.info("Cleanup cancelled.")
                return 1
    
    # Define cleanup phases
    cleanup_phases = {
        "1": [
            ("scripts/sanitize_credentials.py", "Phase 1: Security & Credential Sanitization"),
        ],
        "2": [
            ("scripts/cleanup_repository.py", "Phase 2: Repository Hygiene Cleanup"),
        ],
        "3": [
            ("scripts/fix_test_placeholders.py", "Phase 3: Test Framework Analysis"),
        ]
    }
    
    # Determine which phases to run
    if args.phase == "all":
        phases_to_run = ["1", "2", "3"]
    else:
        phases_to_run = [args.phase]
    
    # Execute cleanup phases
    success_count = 0
    total_phases = sum(len(cleanup_phases[phase]) for phase in phases_to_run)
    
    for phase in phases_to_run:
        for script_path, description in cleanup_phases[phase]:
            if run_script(script_path, description):
                success_count += 1
    
    # Final summary
    logger.info("%s", f"\n{'='*60}")
    logger.info("🎉 CLEANUP SUMMARY")
    logger.info("%s", f"{'='*60}")
    logger.info(f"✅ Completed: {success_count}/{total_phases} cleanup tasks")
    
    if success_count == total_phases:
        logger.info("\n🎊 ALL CLEANUP TASKS COMPLETED SUCCESSFULLY!")
        logger.info("\n📋 RECOMMENDED NEXT STEPS:")
        logger.info("1. Review all changes: git status && git diff")
        logger.info("2. Test functionality: poetry run python -m pytest")
        logger.info("3. Update documentation if needed")
        logger.info("%s", "4. Commit changes: git add . && git commit -m 'Complete comprehensive cleanup'")
        logger.info("5. Deploy and test in development environment")
        
        # Check for generated files
        generated_files = [
            ".env.template",
            "TEST_IMPROVEMENT_PLAN.md"
        ]
        
        existing_generated = [f for f in generated_files if os.path.exists(f)]
        if existing_generated:
            logger.info(f"\n📄 Generated files to review:")
            for file in existing_generated:
                logger.info(f"   - {file}")
    else:
        logger.error(f"\n⚠️  {total_phases - success_count} cleanup tasks failed")
        logger.error("Please review the errors above and run individual scripts as needed")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

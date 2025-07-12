#!/usr/bin/env python3
"""
Debug script to identify API error sources.
"""

import logging
import os
import sys
import time
import traceback

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("/tmp/vana_debug.log"), logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)


def check_environment():
    """Check environment configuration."""
    logger.info("=== Environment Check ===")

    # Python version
    logger.info(f"Python version: {sys.version}")

    # Important environment variables
    env_vars = ["PYTHONPATH", "CLAUDE_DEBUG", "VANA_PROJECT_ROOT"]
    for var in env_vars:
        value = os.environ.get(var, "Not set")
        logger.info(f"{var}: {value}")

    # Current working directory
    logger.info(f"Current directory: {os.getcwd()}")

    # Check if running under Claude Code
    if "CLAUDE" in os.environ:
        logger.info("Running under Claude Code environment")
    else:
        logger.warning("Not running under Claude Code environment")


def test_minimal_operation():
    """Test minimal operations to isolate error source."""
    logger.info("=== Testing Minimal Operations ===")

    try:
        # Test 1: Simple file operation
        logger.info("Test 1: File operation")
        test_file = "/tmp/test_debug.txt"
        with open(test_file, "w") as f:
            f.write("Debug test")
        logger.info("✓ File write successful")

        # Test 2: Import memory modules
        logger.info("Test 2: Import modules")
        try:
            import chromadb

            logger.info("✓ ChromaDB import successful")
        except Exception as e:
            logger.error(f"✗ ChromaDB import failed: {e}")

        # Test 3: Memory allocation
        logger.info("Test 3: Memory allocation")
        data = [i for i in range(1000)]
        logger.info(f"✓ Allocated list with {len(data)} items")

        # Test 4: Time delay (API timeout simulation)
        logger.info("Test 4: Time delay test")
        start = time.time()
        time.sleep(0.5)
        elapsed = time.time() - start
        logger.info(f"✓ Sleep completed in {elapsed:.2f}s")

    except Exception as e:
        logger.error(f"Error during minimal operations: {e}")
        logger.error(traceback.format_exc())


def check_api_limits():
    """Check for potential API limit issues."""
    logger.info("=== API Limits Check ===")

    # Check file sizes
    logger.info("Checking file sizes in docs/memory/")
    docs_path = "/Users/nick/Development/vana/docs/memory"

    if os.path.exists(docs_path):
        total_size = 0
        for file in os.listdir(docs_path):
            filepath = os.path.join(docs_path, file)
            if os.path.isfile(filepath):
                size = os.path.getsize(filepath)
                total_size += size
                logger.info(f"{file}: {size:,} bytes")

        logger.info(f"Total size: {total_size:,} bytes ({total_size/1024/1024:.2f} MB)")

        if total_size > 1024 * 1024:  # 1MB
            logger.warning("Total file size exceeds 1MB - may cause API issues")
    else:
        logger.warning(f"Docs path not found: {docs_path}")


def test_memory_operations():
    """Test memory-specific operations."""
    logger.info("=== Memory Operations Test ===")

    try:
        # Check if we can access the memory database
        db_path = "/Users/nick/Development/vana/.memory_db/chroma.sqlite3"
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path)
            logger.info(f"Memory database exists: {db_size:,} bytes")

            # Check if database is locked
            try:
                import sqlite3

                conn = sqlite3.connect(db_path, timeout=1.0)
                conn.close()
                logger.info("✓ Database is accessible")
            except Exception as e:
                logger.error(f"✗ Database may be locked: {e}")
        else:
            logger.warning("Memory database not found")

    except Exception as e:
        logger.error(f"Error checking memory operations: {e}")
        logger.error(traceback.format_exc())


def analyze_recent_activity():
    """Analyze what might be causing API errors."""
    logger.info("=== Recent Activity Analysis ===")

    # List recently modified files
    logger.info("Recently modified files:")
    vana_root = "/Users/nick/Development/vana"

    recent_files = []
    for root, dirs, files in os.walk(vana_root):
        # Skip hidden and cache directories
        dirs[:] = [d for d in dirs if not d.startswith(".") and d != "__pycache__"]

        for file in files:
            if file.endswith((".py", ".md", ".json")):
                filepath = os.path.join(root, file)
                try:
                    mtime = os.path.getmtime(filepath)
                    if time.time() - mtime < 3600:  # Modified in last hour
                        recent_files.append((mtime, filepath))
                except:
                    pass

    recent_files.sort(reverse=True)
    for mtime, filepath in recent_files[:10]:
        rel_path = os.path.relpath(filepath, vana_root)
        time_ago = int((time.time() - mtime) / 60)
        logger.info(f"  {rel_path} - {time_ago} minutes ago")


def main():
    """Run all debug checks."""
    logger.info("Starting API Error Debug Session")
    logger.info("=" * 50)

    try:
        check_environment()
        test_minimal_operation()
        check_api_limits()
        test_memory_operations()
        analyze_recent_activity()

        logger.info("=" * 50)
        logger.info("Debug session completed")
        logger.info("Check /tmp/vana_debug.log for full output")

    except Exception as e:
        logger.error(f"Fatal error during debug: {e}")
        logger.error(traceback.format_exc())
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())

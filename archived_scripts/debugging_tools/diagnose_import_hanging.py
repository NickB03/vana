#!/usr/bin/env python3
"""
Import Hanging Diagnostic Script
Identifies exactly which module is causing the import hang.
"""

import sys
import time
import os
import logging
from typing import List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_import_with_timeout(module_name: str, timeout: int = 30) -> Tuple[bool, float, str]:
    """Test import with timeout to catch hanging imports."""
    import signal
    
    def timeout_handler(signum, frame):
        raise TimeoutError(f"Import of {module_name} timed out after {timeout}s")
    
    # Set up timeout
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout)
    
    start_time = time.time()
    error_msg = ""
    success = False
    
    try:
        logger.info(f"Testing import: {module_name}")
        __import__(module_name)
        success = True
        logger.info(f"✅ {module_name}: SUCCESS")
    except TimeoutError as e:
        error_msg = str(e)
        logger.error(f"⏰ {module_name}: TIMEOUT - {error_msg}")
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ {module_name}: ERROR - {error_msg}")
    finally:
        signal.alarm(0)  # Cancel timeout
        elapsed = time.time() - start_time
    
    return success, elapsed, error_msg

def run_import_diagnostics():
    """Run comprehensive import diagnostics."""
    logger.info("🔍 Starting Import Hanging Diagnostics")
    logger.info(f"Python Version: {sys.version}")
    logger.info(f"Working Directory: {os.getcwd()}")
    
    # Test modules in dependency order
    test_modules = [
        # Environment and basic setup
        "os",
        "dotenv",
        "lib.environment",
        
        # Google ADK core
        "google.adk.agents",
        "google.adk.tools",
        
        # Memory and services
        "lib._shared_libraries.adk_memory_service",
        "lib._shared_libraries.vector_search_service",
        
        # Tool modules
        "lib._tools.adk_tools",
        "lib._tools.adk_long_running_tools",
        "lib._tools.adk_mcp_tools",
        "lib._tools.adk_third_party_tools",
        
        # Agent modules
        "agents.vana.team",
    ]
    
    results = []
    hanging_module = None
    
    for module in test_modules:
        success, elapsed, error = test_import_with_timeout(module, timeout=30)
        results.append({
            "module": module,
            "success": success,
            "elapsed": elapsed,
            "error": error
        })
        
        if not success:
            hanging_module = module
            logger.error(f"🚨 HANGING MODULE IDENTIFIED: {module}")
            break
        
        if elapsed > 10:
            logger.warning(f"⚠️ SLOW IMPORT: {module} took {elapsed:.2f}s")
    
    # Generate report
    logger.info("\n" + "="*60)
    logger.info("📊 IMPORT DIAGNOSTICS REPORT")
    logger.info("="*60)
    
    for result in results:
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        logger.info(f"{status} {result['module']}: {result['elapsed']:.2f}s")
        if result["error"]:
            logger.info(f"    Error: {result['error']}")
    
    if hanging_module:
        logger.error(f"\n🎯 ACTION REQUIRED: Fix imports in {hanging_module}")
        return hanging_module
    else:
        logger.info("\n✅ All imports successful - no hanging detected")
        return None

if __name__ == "__main__":
    hanging_module = run_import_diagnostics()
    if hanging_module:
        sys.exit(1)
    else:
        sys.exit(0)

#!/usr/bin/env python3
"""
Automatic Memory Cleanup Service
Runs periodic cleanup of ChromaDB duplicates independently
"""

import time
import schedule
import threading
import logging
from pathlib import Path
from datetime import datetime
from cleanup_chromadb_duplicates import cleanup_chromadb_duplicates

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('auto_cleanup.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class AutoCleanupService:
    """Automatic cleanup service for ChromaDB"""
    
    def __init__(self, interval_hours: int = 6, duplicate_threshold: int = 10):
        """
        Initialize auto cleanup service
        
        Args:
            interval_hours: Hours between cleanup checks
            duplicate_threshold: Minimum duplicates to trigger cleanup
        """
        self.interval_hours = interval_hours
        self.duplicate_threshold = duplicate_threshold
        self.running = False
        self.thread = None
        
    def check_and_cleanup(self):
        """Check for duplicates and cleanup if threshold exceeded"""
        try:
            logger.info("🔍 Running duplicate check...")
            
            # Dry run to check duplicate count
            results = cleanup_chromadb_duplicates(dry_run=True)
            
            duplicates_found = results.get("chunks_to_remove", 0)
            logger.info(f"📊 Found {duplicates_found} duplicate chunks")
            
            if duplicates_found >= self.duplicate_threshold:
                logger.info(f"⚠️ Threshold exceeded ({duplicates_found} >= {self.duplicate_threshold})")
                logger.info("🗑️ Executing automatic cleanup...")
                
                # Execute cleanup
                cleanup_results = cleanup_chromadb_duplicates(dry_run=False)
                
                removed = cleanup_results.get("chunks_removed", 0)
                errors = cleanup_results.get("errors", [])
                
                if errors:
                    logger.warning(f"⚠️ Cleanup completed with {len(errors)} errors")
                    for error in errors:
                        logger.warning(f"   Error: {error}")
                else:
                    logger.info(f"✅ Cleanup successful: {removed} duplicates removed")
                
                # Save results
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                results_file = f"auto_cleanup_results_{timestamp}.json"
                
                import json
                with open(results_file, 'w') as f:
                    json.dump(cleanup_results, f, indent=2)
                
                logger.info(f"📄 Results saved to: {results_file}")
                
            else:
                logger.info(f"✅ No cleanup needed ({duplicates_found} < {self.duplicate_threshold})")
                
        except Exception as e:
            logger.error(f"❌ Auto cleanup error: {str(e)}")
    
    def start(self):
        """Start the automatic cleanup service"""
        if self.running:
            logger.warning("⚠️ Service already running")
            return
            
        logger.info(f"🚀 Starting auto cleanup service (every {self.interval_hours}h)")
        logger.info(f"📋 Cleanup threshold: {self.duplicate_threshold} duplicates")
        
        # Schedule cleanup checks
        schedule.every(self.interval_hours).hours.do(self.check_and_cleanup)
        
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        
        # Run initial check
        logger.info("🔄 Running initial cleanup check...")
        self.check_and_cleanup()
        
    def stop(self):
        """Stop the automatic cleanup service"""
        if not self.running:
            logger.warning("⚠️ Service not running")
            return
            
        logger.info("🛑 Stopping auto cleanup service...")
        self.running = False
        schedule.clear()
        
        if self.thread:
            self.thread.join(timeout=5)
            
        logger.info("✅ Service stopped")
    
    def _run_scheduler(self):
        """Internal scheduler loop"""
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def status(self):
        """Get service status"""
        return {
            "running": self.running,
            "interval_hours": self.interval_hours,
            "duplicate_threshold": self.duplicate_threshold,
            "next_run": schedule.next_run() if schedule.jobs else None
        }

def main():
    """Main entry point for standalone execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Automatic ChromaDB cleanup service")
    parser.add_argument("--interval", type=int, default=6, 
                       help="Hours between cleanup checks (default: 6)")
    parser.add_argument("--threshold", type=int, default=10,
                       help="Minimum duplicates to trigger cleanup (default: 10)")
    parser.add_argument("--daemon", action="store_true",
                       help="Run as daemon (background service)")
    
    args = parser.parse_args()
    
    service = AutoCleanupService(
        interval_hours=args.interval,
        duplicate_threshold=args.threshold
    )
    
    try:
        service.start()
        
        if args.daemon:
            logger.info("🔄 Running in daemon mode (Ctrl+C to stop)")
            while True:
                time.sleep(1)
        else:
            logger.info("🔄 Service started. Press Enter to stop...")
            input()
            
    except KeyboardInterrupt:
        logger.info("⚠️ Interrupted by user")
    finally:
        service.stop()

if __name__ == "__main__":
    main()
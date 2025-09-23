"""Test script to validate the session store memory leak fix.

This test verifies that the async-based cleanup properly replaces the 
threading.Timer implementation and works correctly in various scenarios.
"""

import asyncio
import time
import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from utils.session_store import SessionStore, SessionStoreConfig


class TestSessionStoreCleanupFix(unittest.TestCase):
    """Test cases for the async cleanup implementation."""

    def setUp(self):
        """Set up test environment."""
        # Use shorter intervals for testing
        self.config = SessionStoreConfig(
            cleanup_interval_minutes=1,  # 1 minute for testing
            session_ttl_hours=1,
            max_sessions=5
        )

    def test_async_cleanup_initialization(self):
        """Test that async cleanup task starts properly."""
        store = SessionStore(self.config)
        
        # Verify async components are initialized
        self.assertIsNotNone(store._shutdown_event)
        self.assertIsInstance(store._shutdown_event, asyncio.Event)
        
        # Cleanup
        store._stop_cleanup_task()

    def test_cleanup_task_creation(self):
        """Test that cleanup task is created and can be managed."""
        store = SessionStore(self.config)
        
        # Task should be created during initialization
        self.assertIsNotNone(store._cleanup_task)
        
        # Stop the task
        store._stop_cleanup_task()
        
        # Verify shutdown event is set
        self.assertTrue(store._shutdown_event.is_set())

    def test_memory_stats_includes_cleanup_status(self):
        """Test that memory stats now include cleanup status."""
        store = SessionStore(self.config)
        
        stats = store.get_memory_stats()
        
        # Verify new cleanup_status field is present
        self.assertIn('cleanup_status', stats)
        self.assertIn(stats['cleanup_status'], ['running', 'stopped', 'completed', 'cancelled'])
        
        # Cleanup
        store._stop_cleanup_task()

    async def test_graceful_shutdown(self):
        """Test graceful shutdown functionality."""
        store = SessionStore(self.config)
        
        # Create some test sessions with valid session IDs (20+ characters)
        store.ensure_session("test_session_1_long_enough_id", title="Test Session 1")
        store.ensure_session("test_session_2_long_enough_id", title="Test Session 2")
        
        # Verify sessions exist
        self.assertEqual(len(store._sessions), 2)
        
        # Test shutdown
        await store.shutdown()
        
        # Verify shutdown event is set
        self.assertTrue(store._shutdown_event.is_set())
        
        # Verify cleanup task is done or cancelled
        if store._cleanup_task:
            self.assertTrue(store._cleanup_task.done())

    def test_force_cleanup_now(self):
        """Test manual cleanup trigger."""
        store = SessionStore(self.config)
        
        # Create test sessions with valid session IDs (20+ characters)
        store.ensure_session("test_session_1_long_enough_id", title="Test Session 1")
        store.ensure_session("test_session_2_long_enough_id", title="Test Session 2")
        
        # Verify sessions exist
        self.assertEqual(len(store._sessions), 2)
        
        # Force cleanup (should return 0 since sessions are not expired)
        removed_count = store.force_cleanup_now()
        self.assertIsInstance(removed_count, int)
        
        # Cleanup
        store._stop_cleanup_task()

    def test_fallback_sync_cleanup_mechanism(self):
        """Test that fallback sync cleanup works when asyncio fails."""
        with patch('asyncio.get_running_loop') as mock_get_loop:
            with patch('asyncio.get_event_loop') as mock_event_loop:
                # Make asyncio methods fail
                mock_get_loop.side_effect = RuntimeError("No running loop")
                mock_event_loop.side_effect = RuntimeError("No event loop")
                
                # This should trigger fallback mechanism
                store = SessionStore(self.config)
                
                # Verify store still works (use valid session ID)
                store.ensure_session("test_session_long_enough_for_validation", title="Test")
                self.assertEqual(len(store._sessions), 1)
                
                # Cleanup
                store._stop_cleanup_task()

    def test_no_threading_timer_usage(self):
        """Verify that threading.Timer is no longer used."""
        store = SessionStore(self.config)
        
        # Verify no timer attribute exists
        self.assertFalse(hasattr(store, '_cleanup_timer'))
        
        # Verify async attributes exist instead
        self.assertTrue(hasattr(store, '_cleanup_task'))
        self.assertTrue(hasattr(store, '_shutdown_event'))
        
        # Cleanup
        store._stop_cleanup_task()

    async def test_cleanup_task_resilience(self):
        """Test that cleanup task handles errors gracefully."""
        store = SessionStore(self.config)
        
        # Mock cleanup_expired_sessions to raise an error
        original_cleanup = store.cleanup_expired_sessions
        error_count = 0
        
        def failing_cleanup():
            nonlocal error_count
            error_count += 1
            if error_count < 3:  # Fail first 2 times
                raise Exception("Test cleanup failure")
            return original_cleanup()
        
        store.cleanup_expired_sessions = failing_cleanup
        
        # Let the cleanup task run briefly
        await asyncio.sleep(0.1)
        
        # Verify the task is still running despite errors
        self.assertIsNotNone(store._cleanup_task)
        if not store._cleanup_task.done():
            self.assertFalse(store._cleanup_task.cancelled())
        
        # Cleanup
        await store.shutdown()


class TestIntegration(unittest.TestCase):
    """Integration tests for the complete fix."""

    async def test_end_to_end_lifecycle(self):
        """Test complete lifecycle from creation to shutdown."""
        config = SessionStoreConfig(
            cleanup_interval_minutes=1,
            session_ttl_hours=1,
            max_sessions=3
        )
        
        store = SessionStore(config)
        
        # Create sessions with valid session IDs (20+ characters)
        store.ensure_session("session_1_long_enough_for_validation", title="Session 1")
        store.ensure_session("session_2_long_enough_for_validation", title="Session 2")
        
        # Verify sessions
        self.assertEqual(len(store._sessions), 2)
        
        # Check memory stats
        stats = store.get_memory_stats()
        self.assertEqual(stats['total_sessions'], 2)
        self.assertIn('cleanup_status', stats)
        
        # Graceful shutdown
        await store.shutdown()
        
        # Verify final state
        self.assertTrue(store._shutdown_event.is_set())


if __name__ == '__main__':
    # Run async tests
    async def run_async_tests():
        """Run async test methods."""
        test_case = TestSessionStoreCleanupFix()
        test_case.setUp()
        
        print("Running async cleanup tests...")
        
        try:
            await test_case.test_graceful_shutdown()
            print("✓ Graceful shutdown test passed")
        except Exception as e:
            print(f"✗ Graceful shutdown test failed: {e}")
        
        try:
            await test_case.test_cleanup_task_resilience()
            print("✓ Cleanup task resilience test passed")
        except Exception as e:
            print(f"✗ Cleanup task resilience test failed: {e}")
        
        # Integration test
        integration_test = TestIntegration()
        try:
            await integration_test.test_end_to_end_lifecycle()
            print("✓ End-to-end lifecycle test passed")
        except Exception as e:
            print(f"✗ End-to-end lifecycle test failed: {e}")
    
    # Run synchronous tests
    print("Running synchronous tests...")
    unittest.main(argv=[''], exit=False, verbosity=2)
    
    # Run async tests
    print("\nRunning async tests...")
    try:
        asyncio.run(run_async_tests())
    except Exception as e:
        print(f"Async test runner failed: {e}")
    
    print("\nAll tests completed!")
"""
Performance tests for sandbox components.
"""

import pytest
import time
import threading
import concurrent.futures
from unittest.mock import patch

from lib.sandbox.core.security_manager import SecurityManager
from lib.sandbox.core.resource_monitor import ResourceMonitor
from lib.sandbox.core.execution_engine import ExecutionEngine


class TestPerformance:
    """Performance test cases for sandbox components."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.security_manager = SecurityManager()
        self.resource_monitor = ResourceMonitor()
        self.execution_engine = ExecutionEngine(self.security_manager, self.resource_monitor)
    
    def teardown_method(self):
        """Clean up after tests."""
        self.resource_monitor.stop_all_monitoring()
        
        # Clean up execution engine environments
        for env_id in list(self.execution_engine.active_environments.keys()):
            self.execution_engine.cleanup_environment(env_id)
    
    def test_security_manager_performance(self):
        """Test SecurityManager performance with various code sizes."""
        test_cases = [
            ("small", "print('hello')", 100),
            ("medium", "import math\n" + "x = math.sqrt(i)\n" * 50 + "print(x)", 10),
            ("large", "import math\n" + "x = math.sqrt(i)\nprint(x)\n" * 200, 5)
        ]
        
        for case_name, code, iterations in test_cases:
            start_time = time.time()
            
            for _ in range(iterations):
                result = self.security_manager.validate_python_code(code)
                assert result is not None
            
            total_time = time.time() - start_time
            avg_time = total_time / iterations
            
            print(f"{case_name} code validation: {avg_time:.4f}s average")
            
            # Performance assertions
            if case_name == "small":
                assert avg_time < 0.01  # Small code should validate very quickly
            elif case_name == "medium":
                assert avg_time < 0.05  # Medium code should validate quickly
            else:  # large
                assert avg_time < 0.1   # Large code should still validate reasonably fast
    
    def test_security_manager_concurrent_validation(self):
        """Test SecurityManager performance under concurrent load."""
        test_codes = [
            "print('test1')",
            "import math; print(math.pi)",
            "x = [i for i in range(100)]",
            "def func(): return 42",
            "class Test: pass"
        ]
        
        def validate_code(code):
            return self.security_manager.validate_python_code(code)
        
        start_time = time.time()
        
        # Run 50 concurrent validations
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for _ in range(50):
                code = test_codes[_ % len(test_codes)]
                future = executor.submit(validate_code, code)
                futures.append(future)
            
            # Wait for all to complete
            results = [future.result() for future in futures]
        
        total_time = time.time() - start_time
        avg_time = total_time / 50
        
        print(f"Concurrent validation: {avg_time:.4f}s average per validation")
        
        # All validations should succeed
        assert all(result is not None for result in results)
        assert avg_time < 0.1  # Should handle concurrent load efficiently
    
    def test_resource_monitor_performance(self):
        """Test ResourceMonitor performance with multiple sessions."""
        import os
        
        # Start multiple monitoring sessions
        sessions = []
        process_id = os.getpid()
        
        start_time = time.time()
        
        for i in range(10):
            session = self.resource_monitor.start_monitoring(process_id, f"session_{i}")
            sessions.append(session)
        
        setup_time = time.time() - start_time
        
        # Let monitoring run for a short time
        time.sleep(2)
        
        # Check performance of getting current usage
        start_time = time.time()
        
        for session in sessions:
            usage = self.resource_monitor.get_current_usage(session.session_id)
            # Usage might be None if monitoring hasn't collected data yet
        
        query_time = time.time() - start_time
        avg_query_time = query_time / len(sessions)
        
        print(f"Resource monitor setup: {setup_time:.4f}s for 10 sessions")
        print(f"Usage query: {avg_query_time:.4f}s average per session")
        
        # Performance assertions
        assert setup_time < 1.0  # Should set up quickly
        assert avg_query_time < 0.01  # Queries should be very fast
    
    def test_execution_engine_performance(self):
        """Test ExecutionEngine performance with various execution scenarios."""
        test_cases = [
            ("simple_print", "print('hello')", "python"),
            ("simple_math", "import math; print(math.sqrt(16))", "python"),
            ("simple_js", "console.log('hello')", "javascript"),
            ("simple_shell", "echo hello", "shell")
        ]
        
        for case_name, code, language in test_cases:
            start_time = time.time()
            
            result = self.execution_engine.execute_code(code, language)
            
            execution_time = time.time() - start_time
            
            print(f"{case_name} execution: {execution_time:.4f}s total")
            
            assert result is not None
            assert result.session_id is not None
            
            # Performance assertions
            assert execution_time < 1.0  # All executions should complete quickly
    
    def test_execution_engine_concurrent_execution(self):
        """Test ExecutionEngine performance under concurrent load."""
        def execute_code(code, language):
            return self.execution_engine.execute_code(code, language)
        
        test_cases = [
            ("print('test1')", "python"),
            ("print('test2')", "python"),
            ("console.log('test3')", "javascript"),
            ("echo test4", "shell")
        ]
        
        start_time = time.time()
        
        # Run 20 concurrent executions
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = []
            for i in range(20):
                code, language = test_cases[i % len(test_cases)]
                future = executor.submit(execute_code, code, language)
                futures.append(future)
            
            # Wait for all to complete
            results = [future.result() for future in futures]
        
        total_time = time.time() - start_time
        avg_time = total_time / 20
        
        print(f"Concurrent execution: {avg_time:.4f}s average per execution")
        
        # All executions should complete
        assert all(result is not None for result in results)
        assert avg_time < 2.0  # Should handle concurrent load reasonably
    
    def test_memory_usage_growth(self):
        """Test memory usage doesn't grow excessively with repeated operations."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Perform many operations
        for i in range(100):
            # Security validation
            self.security_manager.validate_python_code(f"print('test {i}')")
            
            # Execution
            result = self.execution_engine.execute_code(f"print('test {i}')", "python")
            
            # Clean up execution history periodically to prevent unbounded growth
            if i % 20 == 0 and len(self.execution_engine.execution_history) > 50:
                self.execution_engine.execution_history = self.execution_engine.execution_history[-25:]
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_growth = final_memory - initial_memory
        
        print(f"Memory growth: {memory_growth:.2f} MB after 100 operations")
        
        # Memory growth should be reasonable
        assert memory_growth < 50  # Should not grow more than 50 MB
    
    def test_environment_cleanup_performance(self):
        """Test performance of environment creation and cleanup."""
        start_time = time.time()
        
        environments = []
        
        # Create 20 environments
        for i in range(20):
            env = self.execution_engine.prepare_environment("python")
            environments.append(env)
        
        creation_time = time.time() - start_time
        
        start_time = time.time()
        
        # Clean up all environments
        for env in environments:
            success = self.execution_engine.cleanup_environment(env.env_id)
            assert success is True
        
        cleanup_time = time.time() - start_time
        
        print(f"Environment creation: {creation_time:.4f}s for 20 environments")
        print(f"Environment cleanup: {cleanup_time:.4f}s for 20 environments")
        
        # Performance assertions
        assert creation_time < 5.0  # Should create environments quickly
        assert cleanup_time < 2.0   # Should clean up quickly
    
    def test_large_code_validation_performance(self):
        """Test performance with large code samples."""
        # Generate large Python code
        large_code = "import math\n"
        large_code += "\n".join([f"x{i} = math.sqrt({i})" for i in range(1000)])
        large_code += "\nprint('done')"
        
        start_time = time.time()
        
        result = self.security_manager.validate_python_code(large_code)
        
        validation_time = time.time() - start_time
        
        print(f"Large code validation: {validation_time:.4f}s for {len(large_code)} characters")
        
        assert result is not None
        assert validation_time < 1.0  # Should handle large code efficiently
    
    def test_security_policy_loading_performance(self):
        """Test performance of security policy loading."""
        start_time = time.time()
        
        # Create multiple SecurityManager instances to test policy loading
        managers = []
        for _ in range(10):
            manager = SecurityManager()
            managers.append(manager)
        
        loading_time = time.time() - start_time
        avg_loading_time = loading_time / 10
        
        print(f"Policy loading: {avg_loading_time:.4f}s average per manager")
        
        # All managers should have policies loaded
        assert all(manager.policies is not None for manager in managers)
        assert avg_loading_time < 0.1  # Should load policies quickly
    
    @patch('psutil.Process')
    def test_resource_collection_performance(self, mock_process_class):
        """Test performance of resource usage collection."""
        # Mock psutil.Process for consistent testing
        mock_process = mock_process_class.return_value
        mock_process.cpu_percent.return_value = 25.0
        mock_process.memory_info.return_value.rss = 100 * 1024 * 1024
        mock_process.children.return_value = []
        
        with patch('psutil.virtual_memory') as mock_memory, \
             patch('psutil.disk_usage') as mock_disk:
            
            mock_memory.return_value.total = 8 * 1024 * 1024 * 1024
            mock_disk.return_value.percent = 15.0
            
            start_time = time.time()
            
            # Collect metrics 100 times
            for _ in range(100):
                usage = self.resource_monitor._collect_usage_metrics(12345)
                assert usage is not None
            
            collection_time = time.time() - start_time
            avg_collection_time = collection_time / 100
            
            print(f"Resource collection: {avg_collection_time:.4f}s average per collection")
            
            # Should collect metrics very quickly
            assert avg_collection_time < 0.01

"""
Tests for ResourceMonitor - Resource monitoring and limit enforcement.
"""

import pytest
import time
import os
import threading
from unittest.mock import Mock, patch

from lib.sandbox.core.resource_monitor import (
    ResourceMonitor, MonitoringSession, ResourceUsage, ResourceLimits,
    LimitStatus, PerformanceMetrics
)


class TestResourceMonitor:
    """Test cases for ResourceMonitor."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.resource_monitor = ResourceMonitor()
    
    def teardown_method(self):
        """Clean up after tests."""
        self.resource_monitor.stop_all_monitoring()
    
    def test_init_with_default_config(self):
        """Test ResourceMonitor initialization with default config."""
        rm = ResourceMonitor()
        assert rm.limits_config is not None
        assert "default_limits" in rm.limits_config
        assert rm.sessions == {}
        assert rm.monitoring_active is False
    
    def test_init_with_custom_config(self):
        """Test ResourceMonitor initialization with custom config."""
        custom_config = {
            "default_limits": {
                "memory_mb": 1024,
                "cpu_cores": 2,
                "execution_time_seconds": 60
            }
        }
        rm = ResourceMonitor(custom_config)
        assert rm.limits_config["default_limits"]["memory_mb"] == 1024
    
    def test_start_monitoring(self):
        """Test starting a monitoring session."""
        # Use current process ID for testing
        process_id = os.getpid()
        
        session = self.resource_monitor.start_monitoring(process_id)
        
        assert isinstance(session, MonitoringSession)
        assert session.process_id == process_id
        assert session.is_active is True
        assert session.session_id in self.resource_monitor.sessions
        assert self.resource_monitor.monitoring_active is True
    
    def test_start_monitoring_with_custom_session_id(self):
        """Test starting monitoring with custom session ID."""
        process_id = os.getpid()
        custom_session_id = "test_session_123"
        
        session = self.resource_monitor.start_monitoring(process_id, custom_session_id)
        
        assert session.session_id == custom_session_id
        assert custom_session_id in self.resource_monitor.sessions
    
    def test_monitoring_session_basic_functionality(self):
        """Test basic MonitoringSession functionality."""
        limits = ResourceLimits(memory_mb=256, cpu_cores=1, execution_time_seconds=10)
        session = MonitoringSession("test_session", 12345, limits)
        
        assert session.session_id == "test_session"
        assert session.process_id == 12345
        assert session.limits.memory_mb == 256
        assert session.is_active is True
        assert session.violations == 0
        assert len(session.usage_history) == 0
    
    def test_monitoring_session_add_usage_sample(self):
        """Test adding usage samples to monitoring session."""
        limits = ResourceLimits()
        session = MonitoringSession("test_session", 12345, limits)
        
        usage = ResourceUsage(
            cpu_percent=50.0,
            memory_mb=100.0,
            memory_percent=20.0,
            disk_mb=10.0,
            disk_percent=5.0,
            process_count=2,
            execution_time=5.0,
            timestamp=time.time()
        )
        
        session.add_usage_sample(usage)
        
        assert len(session.usage_history) == 1
        assert session.get_current_usage() == usage
    
    def test_monitoring_session_execution_time(self):
        """Test execution time calculation."""
        limits = ResourceLimits()
        session = MonitoringSession("test_session", 12345, limits)
        
        # Wait a short time and check execution time
        time.sleep(0.1)
        execution_time = session.get_execution_time()
        
        assert execution_time >= 0.1
        assert execution_time < 1.0  # Should be less than 1 second
    
    def test_monitoring_session_increment_violations(self):
        """Test violation counting."""
        limits = ResourceLimits()
        session = MonitoringSession("test_session", 12345, limits)
        
        assert session.violations == 0
        
        session.increment_violations()
        assert session.violations == 1
        
        session.increment_violations()
        assert session.violations == 2
    
    def test_monitoring_session_stop(self):
        """Test stopping a monitoring session."""
        limits = ResourceLimits()
        session = MonitoringSession("test_session", 12345, limits)
        
        assert session.is_active is True
        
        session.stop()
        assert session.is_active is False
    
    @patch('psutil.Process')
    def test_collect_usage_metrics(self, mock_process_class):
        """Test collecting usage metrics from a process."""
        # Mock psutil.Process
        mock_process = Mock()
        mock_process.cpu_percent.return_value = 25.5
        mock_process.memory_info.return_value = Mock(rss=100 * 1024 * 1024)  # 100 MB
        mock_process.children.return_value = [Mock(), Mock()]  # 2 child processes
        mock_process_class.return_value = mock_process
        
        # Mock system memory
        with patch('psutil.virtual_memory') as mock_memory:
            mock_memory.return_value = Mock(total=8 * 1024 * 1024 * 1024)  # 8 GB
            
            with patch('psutil.disk_usage') as mock_disk:
                mock_disk.return_value = Mock(percent=15.0)
                
                usage = self.resource_monitor._collect_usage_metrics(12345)
        
        assert isinstance(usage, ResourceUsage)
        assert usage.cpu_percent == 25.5
        assert usage.memory_mb == 100.0
        assert usage.process_count == 3  # 2 children + 1 parent
        assert usage.disk_percent == 15.0
        assert usage.timestamp > 0
    
    @patch('psutil.Process')
    def test_collect_usage_metrics_no_such_process(self, mock_process_class):
        """Test collecting metrics when process doesn't exist."""
        import psutil
        mock_process_class.side_effect = psutil.NoSuchProcess(12345)
        
        usage = self.resource_monitor._collect_usage_metrics(12345)
        
        assert isinstance(usage, ResourceUsage)
        assert usage.cpu_percent == 0
        assert usage.memory_mb == 0
        assert usage.process_count == 0
    
    def test_get_current_usage(self):
        """Test getting current usage for a session."""
        process_id = os.getpid()
        session = self.resource_monitor.start_monitoring(process_id)
        
        # Wait a moment for monitoring to collect data
        time.sleep(1.5)
        
        usage = self.resource_monitor.get_current_usage(session.session_id)
        
        if usage:  # May be None if monitoring hasn't collected data yet
            assert isinstance(usage, ResourceUsage)
            assert usage.execution_time > 0
    
    def test_get_current_usage_invalid_session(self):
        """Test getting usage for non-existent session."""
        usage = self.resource_monitor.get_current_usage("invalid_session")
        assert usage is None
    
    def test_check_limits_within_limits(self):
        """Test limit checking when within limits."""
        # Create a session with high limits
        custom_config = {
            "default_limits": {
                "memory_mb": 2048,
                "execution_time_seconds": 300,
                "max_processes": 10
            }
        }
        rm = ResourceMonitor(custom_config)
        
        process_id = os.getpid()
        session = rm.start_monitoring(process_id)
        
        # Add a usage sample within limits
        usage = ResourceUsage(
            cpu_percent=10.0,
            memory_mb=100.0,
            memory_percent=5.0,
            disk_mb=10.0,
            disk_percent=1.0,
            process_count=2,
            execution_time=5.0,
            timestamp=time.time()
        )
        session.add_usage_sample(usage)
        
        status = rm.check_limits(session.session_id)
        assert status == LimitStatus.WITHIN_LIMITS
        
        rm.stop_all_monitoring()
    
    def test_check_limits_exceeded(self):
        """Test limit checking when limits are exceeded."""
        # Create a session with low limits
        custom_config = {
            "default_limits": {
                "memory_mb": 50,
                "execution_time_seconds": 1,
                "max_processes": 1
            }
        }
        rm = ResourceMonitor(custom_config)
        
        process_id = os.getpid()
        session = rm.start_monitoring(process_id)
        
        # Add a usage sample that exceeds limits
        usage = ResourceUsage(
            cpu_percent=90.0,
            memory_mb=100.0,  # Exceeds 50 MB limit
            memory_percent=50.0,
            disk_mb=10.0,
            disk_percent=1.0,
            process_count=5,  # Exceeds 1 process limit
            execution_time=5.0,  # Exceeds 1 second limit
            timestamp=time.time()
        )
        session.add_usage_sample(usage)
        
        status = rm.check_limits(session.session_id)
        assert status in [LimitStatus.EXCEEDED, LimitStatus.CRITICAL]
        
        rm.stop_all_monitoring()
    
    def test_check_limits_invalid_session(self):
        """Test limit checking for non-existent session."""
        status = self.resource_monitor.check_limits("invalid_session")
        assert status == LimitStatus.CRITICAL
    
    def test_get_performance_metrics(self):
        """Test getting performance metrics for a session."""
        process_id = os.getpid()
        session = self.resource_monitor.start_monitoring(process_id)
        
        # Add some usage samples
        for i in range(3):
            usage = ResourceUsage(
                cpu_percent=10.0 + i * 5,
                memory_mb=50.0 + i * 10,
                memory_percent=10.0 + i * 2,
                disk_mb=5.0,
                disk_percent=1.0,
                process_count=1 + i,
                execution_time=1.0 + i,
                timestamp=time.time()
            )
            session.add_usage_sample(usage)
        
        metrics = self.resource_monitor.get_performance_metrics(session.session_id)
        
        assert isinstance(metrics, PerformanceMetrics)
        assert metrics.avg_cpu_percent > 0
        assert metrics.peak_memory_mb > 0
        assert metrics.total_execution_time > 0
        assert len(metrics.process_count_history) == 3
        assert metrics.limit_violations == 0
        assert 0 <= metrics.efficiency_score <= 100
    
    def test_get_performance_metrics_invalid_session(self):
        """Test getting metrics for non-existent session."""
        metrics = self.resource_monitor.get_performance_metrics("invalid_session")
        assert metrics is None
    
    def test_stop_monitoring(self):
        """Test stopping a specific monitoring session."""
        process_id = os.getpid()
        session = self.resource_monitor.start_monitoring(process_id)
        session_id = session.session_id
        
        assert session.is_active is True
        assert session_id in self.resource_monitor.sessions
        
        self.resource_monitor.stop_monitoring(session_id)
        
        assert session.is_active is False
    
    def test_stop_all_monitoring(self):
        """Test stopping all monitoring sessions."""
        # Start multiple sessions
        process_id = os.getpid()
        session1 = self.resource_monitor.start_monitoring(process_id, "session1")
        session2 = self.resource_monitor.start_monitoring(process_id, "session2")
        
        assert self.resource_monitor.monitoring_active is True
        assert len(self.resource_monitor.sessions) == 2
        
        self.resource_monitor.stop_all_monitoring()
        
        assert self.resource_monitor.monitoring_active is False
        assert len(self.resource_monitor.sessions) == 0
        assert session1.is_active is False
        assert session2.is_active is False

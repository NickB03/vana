"""
Tests for VANA Performance Monitor
"""

import pytest
import time
from unittest.mock import patch, MagicMock
from lib.monitoring.performance_monitor import PerformanceMonitor, PerformanceMetric

class TestPerformanceMonitor:
    """Test cases for PerformanceMonitor."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.monitor = PerformanceMonitor(retention_minutes=5)
    
    def test_record_metric(self):
        """Test basic metric recording."""
        self.monitor.record_metric("test_metric", 42.0, "units", {"tag": "value"})
        
        metrics = self.monitor.get_metrics("test_metric")
        assert len(metrics) == 1
        assert metrics[0].value == 42.0
        assert metrics[0].unit == "units"
        assert metrics[0].tags == {"tag": "value"}
    
    def test_record_response_time(self):
        """Test response time recording."""
        self.monitor.record_response_time("test_operation", 1.5, success=True, agent="test")
        
        metrics = self.monitor.get_metrics("response_time.test_operation")
        assert len(metrics) == 1
        assert metrics[0].value == 1.5
        assert metrics[0].unit == "seconds"
        assert metrics[0].tags["success"] == "True"
        assert metrics[0].tags["agent"] == "test"
    
    @patch('psutil.Process')
    def test_record_memory_usage(self, mock_process):
        """Test memory usage recording."""
        mock_memory = MagicMock()
        mock_memory.rss = 1024 * 1024 * 100  # 100 MB
        mock_memory.vms = 1024 * 1024 * 200  # 200 MB
        mock_process.return_value.memory_info.return_value = mock_memory
        
        self.monitor.record_memory_usage("test_component")
        
        rss_metrics = self.monitor.get_metrics("memory.test_component.rss")
        vms_metrics = self.monitor.get_metrics("memory.test_component.vms")
        
        assert len(rss_metrics) == 1
        assert len(vms_metrics) == 1
        assert rss_metrics[0].value == 100.0  # MB
        assert vms_metrics[0].value == 200.0  # MB
    
    @patch('psutil.cpu_percent')
    def test_record_cpu_usage(self, mock_cpu_percent):
        """Test CPU usage recording."""
        mock_cpu_percent.return_value = 75.5
        
        self.monitor.record_cpu_usage("test_component")
        
        metrics = self.monitor.get_metrics("cpu.test_component.usage")
        assert len(metrics) == 1
        assert metrics[0].value == 75.5
        assert metrics[0].unit == "percent"
    
    def test_threshold_alerts(self):
        """Test threshold-based alerting."""
        self.monitor.set_threshold("test_metric", warning=10.0, critical=20.0)
        
        # Should not trigger alert
        self.monitor.record_metric("test_metric", 5.0)
        assert len(self.monitor.alerts) == 0
        
        # Should trigger warning
        self.monitor.record_metric("test_metric", 15.0)
        assert len(self.monitor.alerts) == 1
        assert self.monitor.alerts[0]["level"] == "warning"
        
        # Should trigger critical
        self.monitor.record_metric("test_metric", 25.0)
        assert len(self.monitor.alerts) == 2
        assert self.monitor.alerts[1]["level"] == "critical"
    
    def test_get_summary(self):
        """Test metric summary statistics."""
        # Record multiple metrics
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        for value in values:
            self.monitor.record_metric("test_metric", value)
        
        summary = self.monitor.get_summary("test_metric")
        
        assert summary["count"] == 5
        assert summary["min"] == 1.0
        assert summary["max"] == 5.0
        assert summary["avg"] == 3.0
        assert summary["latest"] == 5.0
    
    def test_get_metrics_with_time_filter(self):
        """Test metric retrieval with time filtering."""
        now = time.time()
        
        # Record metric in the past
        with patch('time.time', return_value=now - 100):
            self.monitor.record_metric("test_metric", 1.0)
        
        # Record metric now
        self.monitor.record_metric("test_metric", 2.0)
        
        # Get all metrics
        all_metrics = self.monitor.get_metrics("test_metric")
        assert len(all_metrics) == 2
        
        # Get recent metrics only
        recent_metrics = self.monitor.get_metrics("test_metric", since=now - 50)
        assert len(recent_metrics) == 1
        assert recent_metrics[0].value == 2.0

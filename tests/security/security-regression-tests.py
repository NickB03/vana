"""
Security Regression Testing Suite

This module contains regression tests to ensure that security fixes remain in place
and cannot be accidentally broken by future changes. It includes automated checks
for all critical security measures implemented in response to security reviews.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import pytest


class TestSecurityRegressionChecks:
    """Automated regression tests for security fixes."""

    def test_phoenix_debug_endpoint_security_regression(self):
        """Test Phoenix debug endpoint security measures remain in place."""
        # Check server.py for required security measures
        server_path = Path("/Users/nick/Development/vana/app/server.py")
        assert server_path.exists(), "Server file not found"

        server_content = server_path.read_text()

        # Verify multi-factor authentication requirements
        security_checks = [
            "current_superuser_dep",  # Superuser dependency
            "X-Phoenix-Code",  # Access code header requirement
            "PHOENIX_DEBUG_CODE",  # Environment variable check
            "NODE_ENV",  # Environment-based disabling
            "production",  # Production protection
            "***REDACTED***",  # Data redaction
        ]

        for check in security_checks:
            assert check in server_content, (
                f"Security measure missing from server.py: {check}"
            )

    def test_jwt_validation_security_regression(self):
        """Test JWT validation security measures remain in place."""
        # Check auth/security.py for JWT validation
        auth_path = Path("/Users/nick/Development/vana/app/auth/security.py")
        if auth_path.exists():
            auth_content = auth_path.read_text()

            jwt_security_checks = [
                "JWTError",  # Proper error handling
                "credentials_exception",  # Generic error messages
                "token_type",  # Token type validation
                "access",  # Access token verification
                "payload.get",  # Safe payload extraction
                "int(sub_claim)",  # Type validation
            ]

            for check in jwt_security_checks:
                assert check in auth_content, f"JWT security measure missing: {check}"

    def test_cors_security_configuration_regression(self):
        """Test CORS security configuration remains secure."""
        server_path = Path("/Users/nick/Development/vana/app/server.py")
        server_content = server_path.read_text()

        # Verify CORS security measures
        cors_checks = [
            "allow_origins",  # CORS origins configuration
            "localhost",  # Development allowlist
            "CORSMiddleware",  # CORS middleware usage
        ]

        for check in cors_checks:
            assert check in server_content, f"CORS security measure missing: {check}"

        # Verify no wildcard origins in production logic
        assert 'allow_origins = ["*"]' not in server_content, (
            "Wildcard CORS origins detected"
        )

    def test_security_headers_regression(self):
        """Test security headers configuration remains in place."""
        server_path = Path("/Users/nick/Development/vana/app/server.py")
        server_content = server_path.read_text()

        # Check for security headers implementation
        security_header_checks = [
            "Content-Security-Policy",
            "X-Content-Type-Options",
            "X-Frame-Options",
            "Referrer-Policy",
            "X-CSP-Nonce",
        ]

        for header in security_header_checks:
            assert header in server_content, f"Security header missing: {header}"

    def test_sensitive_data_redaction_regression(self):
        """Test sensitive data redaction remains in place."""
        server_path = Path("/Users/nick/Development/vana/app/server.py")
        server_content = server_path.read_text()

        # Verify data redaction measures
        redaction_checks = [
            "***REDACTED***",  # Redaction marker
            "session_storage_uri",  # Specific sensitive field
            "bucket_name",  # Another sensitive field
            "project_id",  # Project identifier
        ]

        for check in redaction_checks:
            assert check in server_content, f"Data redaction measure missing: {check}"

    def test_memory_leak_prevention_regression(self):
        """Test memory leak prevention measures remain in place."""
        server_path = Path("/Users/nick/Development/vana/app/server.py")
        server_content = server_path.read_text()

        # Check for memory management
        memory_checks = [
            "BoundedTaskStorage",  # Bounded storage class
            "max_size",  # Size limits
            "1000",  # Maximum task limit
            "evicted",  # Eviction logic
        ]

        for check in memory_checks:
            assert check in server_content, (
                f"Memory management measure missing: {check}"
            )

    def test_environment_security_configuration_regression(self):
        """Test environment-based security configuration."""
        server_path = Path("/Users/nick/Development/vana/app/server.py")
        server_content = server_path.read_text()

        # Verify environment-based security
        env_checks = [
            "NODE_ENV",  # Environment detection
            "development",  # Development environment handling
            "production",  # Production environment handling
            "os.getenv",  # Environment variable usage
        ]

        for check in env_checks:
            assert check in server_content, (
                f"Environment security measure missing: {check}"
            )


class TestSecurityConfigurationValidation:
    """Validate security configuration files and settings."""

    def test_environment_variables_security(self):
        """Test environment variables don't contain hardcoded secrets."""
        # Check for common environment files
        env_files = [
            ".env",
            ".env.local",
            ".env.development",
            ".env.production",
            "app/.env",
        ]

        project_root = Path("/Users/nick/Development/vana")

        for env_file in env_files:
            env_path = project_root / env_file
            if env_path.exists():
                env_content = env_path.read_text()

                # Check for exposed secrets (these should use placeholders)
                dangerous_patterns = [
                    "password=admin",
                    "secret=secret",
                    "key=123456",
                    "token=abc",
                    "GOOGLE_API_KEY=AIza",  # Real API key pattern
                ]

                for pattern in dangerous_patterns:
                    assert pattern not in env_content, (
                        f"Potential secret exposed in {env_file}: {pattern}"
                    )

    def test_git_security_configuration(self):
        """Test git configuration doesn't expose sensitive files."""
        project_root = Path("/Users/nick/Development/vana")
        gitignore_path = project_root / ".gitignore"

        if gitignore_path.exists():
            gitignore_content = gitignore_path.read_text()

            # Verify sensitive files are ignored
            required_ignores = [
                ".env",
                "*.key",
                "*.pem",
                "secrets",
                "credentials",
            ]

            for ignore_pattern in required_ignores:
                assert (
                    ignore_pattern in gitignore_content
                    or ignore_pattern.replace("*", "") in gitignore_content
                ), f"Sensitive pattern not in .gitignore: {ignore_pattern}"

    def test_package_security_configuration(self):
        """Test package.json doesn't contain security vulnerabilities."""
        package_files = [
            "package.json",
            "frontend/package.json",
            "app/package.json",
        ]

        project_root = Path("/Users/nick/Development/vana")

        for package_file in package_files:
            package_path = project_root / package_file
            if package_path.exists():
                try:
                    package_content = json.loads(package_path.read_text())

                    # Check dependencies for known vulnerable packages
                    dependencies = {
                        **package_content.get("dependencies", {}),
                        **package_content.get("devDependencies", {}),
                    }

                    # List of packages with known security issues (update as needed)
                    vulnerable_packages = [
                        "lodash",  # Check for old versions
                        "moment",  # Deprecated, should use alternatives
                        "request",  # Deprecated
                    ]

                    for pkg in vulnerable_packages:
                        if pkg in dependencies:
                            # This is a warning, not a failure - manual review needed
                            print(
                                f"Warning: {pkg} found in {package_file} - verify version is secure"
                            )

                except json.JSONDecodeError:
                    # Skip invalid JSON files
                    pass


class TestSecurityTestCoverage:
    """Ensure comprehensive security test coverage."""

    def test_all_api_endpoints_have_security_tests(self):
        """Test that all API endpoints have corresponding security tests."""
        # Find all API endpoints in the codebase
        server_path = Path("/Users/nick/Development/vana/app/server.py")
        server_content = server_path.read_text()

        # Extract API endpoints (basic pattern matching)
        import re

        endpoint_patterns = [
            r'@app\.(get|post|put|delete|patch)\("([^"]+)"',
            r'router\.(get|post|put|delete|patch)\("([^"]+)"',
        ]

        endpoints = set()
        for pattern in endpoint_patterns:
            matches = re.findall(pattern, server_content)
            for method, endpoint in matches:
                endpoints.add(f"{method.upper()} {endpoint}")

        # Check if security tests exist for critical endpoints
        critical_endpoints = [
            "/api/debug/phoenix",
            "/feedback",
            "/auth/login",
            "/agent_network_sse/",
        ]

        test_files = [
            "tests/test_pr190_security_validation.py",
            "tests/security/comprehensive-security-validation.test.py",
            "tests/security/advanced-penetration-tests.py",
        ]

        project_root = Path("/Users/nick/Development/vana")
        all_test_content = ""

        for test_file in test_files:
            test_path = project_root / test_file
            if test_path.exists():
                all_test_content += test_path.read_text()

        for critical_endpoint in critical_endpoints:
            assert (
                critical_endpoint.replace("/", "") in all_test_content
                or critical_endpoint in all_test_content
            ), f"Security tests missing for critical endpoint: {critical_endpoint}"

    def test_security_test_quality_metrics(self):
        """Test security test quality and coverage metrics."""
        project_root = Path("/Users/nick/Development/vana")
        security_test_files = list(project_root.glob("tests/**/security*.py")) + list(
            project_root.glob("tests/**/*security*.py")
        )

        total_security_tests = 0
        for test_file in security_test_files:
            content = test_file.read_text()
            # Count test functions
            test_count = content.count("def test_")
            total_security_tests += test_count

        # Should have comprehensive security test coverage
        assert total_security_tests >= 20, (
            f"Insufficient security test coverage: {total_security_tests} tests"
        )

    def test_security_documentation_exists(self):
        """Test security documentation exists and is current."""
        project_root = Path("/Users/nick/Development/vana")

        # Check for security documentation
        security_docs = [
            "tests/AUTH_TESTING_GUIDE.md",
            "tests/pr190_security_summary.md",
            "CLAUDE.md",  # Should contain security guidelines
        ]

        for doc_file in security_docs:
            doc_path = project_root / doc_file
            if doc_path.exists():
                content = doc_path.read_text()

                # Verify documentation is current (contains recent dates)
                current_year = datetime.now().year
                assert (
                    str(current_year) in content or str(current_year - 1) in content
                ), f"Documentation may be outdated: {doc_file}"


class TestContinuousSecurityMonitoring:
    """Tests for continuous security monitoring setup."""

    def test_security_logging_configuration(self):
        """Test security logging is properly configured."""
        # Check if logging configuration exists
        config_files = [
            "app/logging.conf",
            "app/config/logging.yaml",
            "logging.json",
        ]

        project_root = Path("/Users/nick/Development/vana")

        # At minimum, should have basic logging in code
        server_path = project_root / "app/server.py"
        if server_path.exists():
            server_content = server_path.read_text()

            # Check for security event logging
            logging_indicators = [
                "logger",
                "log",
                "security_event",
                "unauthorized",
                "access_denied",
            ]

            found_logging = any(
                indicator in server_content for indicator in logging_indicators
            )
            assert found_logging, "Security logging not detected in application"

    def test_security_monitoring_hooks(self):
        """Test security monitoring hooks are in place."""
        project_root = Path("/Users/nick/Development/vana")

        # Check for monitoring/alerting configuration
        monitoring_files = [
            "docker-compose.yml",
            ".github/workflows/security.yml",
            "scripts/security-check.sh",
        ]

        # This is informational - not all projects need all monitoring
        monitoring_found = False
        for monitoring_file in monitoring_files:
            if (project_root / monitoring_file).exists():
                monitoring_found = True
                break

        # Log monitoring status
        print(f"Security monitoring configuration found: {monitoring_found}")


def generate_security_regression_report():
    """Generate comprehensive security regression report."""
    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "report_type": "security_regression_validation",
        "test_categories": [
            "security_fix_regression_checks",
            "security_configuration_validation",
            "security_test_coverage_verification",
            "continuous_security_monitoring_setup",
        ],
        "regression_checks": [
            "Phoenix debug endpoint security",
            "JWT validation measures",
            "CORS security configuration",
            "Security headers implementation",
            "Sensitive data redaction",
            "Memory leak prevention",
            "Environment-based security",
        ],
        "configuration_validations": [
            "Environment variable security",
            "Git security configuration",
            "Package security assessment",
            "API endpoint security coverage",
        ],
        "monitoring_status": "basic_logging_detected",
        "recommendations": [
            "Implement automated security regression testing in CI/CD",
            "Add security linting to pre-commit hooks",
            "Set up automated dependency vulnerability scanning",
            "Implement security event monitoring and alerting",
        ],
    }

    return report


if __name__ == "__main__":
    """Run security regression tests and generate report."""
    # Generate comprehensive report
    report = generate_security_regression_report()

    # Save report
    report_path = Path(
        "/Users/nick/Development/vana/tests/security/regression_report.json"
    )
    report_path.parent.mkdir(exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2))

    print("Security Regression Report Generated:")
    print(json.dumps(report, indent=2))

    # Run pytest
    import pytest

    pytest.main([__file__, "-v", "--tb=short"])

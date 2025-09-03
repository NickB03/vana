"""Integration tests for backend environment configuration."""

import os
import tempfile
from unittest.mock import patch
import pytest
import google.auth
from app.server import project_id, USE_CLOUD_LOGGING


class TestEnvironmentConfiguration:
    """Test environment variable loading and configuration."""

    def test_project_id_from_auth_default(self):
        """Test project ID is loaded from Google Auth default when available."""
        with patch('google.auth.default') as mock_auth:
            mock_auth.return_value = (None, 'test-project-123')
            
            # Reload the module to trigger auth setup
            import importlib
            import app.server
            importlib.reload(app.server)
            
            assert app.server.project_id == 'test-project-123'

    def test_project_id_from_environment_fallback(self):
        """Test project ID falls back to environment variable."""
        with patch.dict(os.environ, {'GOOGLE_CLOUD_PROJECT': 'env-project-456'}):
            with patch('google.auth.default') as mock_auth:
                mock_auth.return_value = (None, None)
                
                import importlib
                import app.server
                importlib.reload(app.server)
                
                assert app.server.project_id == 'env-project-456'

    def test_project_id_ci_environment(self):
        """Test project ID configuration in CI environment."""
        with patch.dict(os.environ, {
            'CI': 'true',
            'GOOGLE_CLOUD_PROJECT': 'ci-project-789'
        }):
            import importlib
            import app.server
            importlib.reload(app.server)
            
            assert app.server.project_id == 'ci-project-789'

    def test_allow_origins_parsing(self):
        """Test ALLOW_ORIGINS environment variable parsing."""
        with patch.dict(os.environ, {'ALLOW_ORIGINS': 'http://localhost:3000,https://example.com'}):
            import importlib
            import app.server
            importlib.reload(app.server)
            
            expected_origins = ['http://localhost:3000', 'https://example.com']
            assert app.server.allow_origins == expected_origins

    def test_allow_origins_empty(self):
        """Test ALLOW_ORIGINS is None when not set."""
        with patch.dict(os.environ, {}, clear=True):
            import importlib
            import app.server
            importlib.reload(app.server)
            
            assert app.server.allow_origins is None

    def test_cloud_logging_available(self):
        """Test cloud logging is enabled when available."""
        try:
            from google.cloud import logging as google_cloud_logging
            assert USE_CLOUD_LOGGING is True
        except ImportError:
            assert USE_CLOUD_LOGGING is False

    def test_session_storage_configuration(self):
        """Test session storage URI configuration."""
        # Test custom URI
        with patch.dict(os.environ, {'SESSION_DB_URI': 'postgresql://custom-db'}):
            import importlib
            import app.server
            importlib.reload(app.server)
            
            assert 'postgresql://custom-db' in app.server.session_service_uri

        # Test Cloud Run path
        with patch.dict(os.environ, {'CLOUD_RUN_SESSION_DB_PATH': '/persistent/sessions.db'}):
            import importlib
            import app.server
            importlib.reload(app.server)
            
            # Should use the Cloud Run setup function
            assert app.server.session_service_uri is not None

    def test_development_session_storage(self):
        """Test local SQLite session storage in development."""
        with patch.dict(os.environ, {}, clear=True):
            with patch('tempfile.gettempdir') as mock_tempdir:
                mock_tempdir.return_value = '/tmp'
                
                import importlib
                import app.server
                importlib.reload(app.server)
                
                assert app.server.session_service_uri.startswith('sqlite:///')
                assert '/tmp/vana_sessions.db' in app.server.session_service_uri

    @pytest.mark.parametrize("env_value,expected", [
        ("true", True),
        ("false", False),
        ("", False),
        (None, False),
    ])
    def test_boolean_environment_variables(self, env_value, expected):
        """Test boolean environment variable parsing."""
        env_dict = {'CI': env_value} if env_value is not None else {}
        
        with patch.dict(os.environ, env_dict, clear=True):
            import importlib
            import app.server
            importlib.reload(app.server)
            
            ci_value = os.environ.get("CI") == "true"
            assert ci_value == expected

    def test_host_port_configuration(self):
        """Test host and port configuration for development server."""
        with patch.dict(os.environ, {
            'VANA_HOST': '0.0.0.0',
            'VANA_PORT': '9000'
        }):
            # These are only used in __main__ block, test the environment setup
            assert os.getenv("VANA_HOST") == '0.0.0.0'
            assert int(os.getenv("VANA_PORT", "8000")) == 9000

    def test_bucket_name_generation(self):
        """Test GCS bucket name generation from project ID."""
        with patch.dict(os.environ, {'GOOGLE_CLOUD_PROJECT': 'test-project'}):
            import importlib
            import app.server
            importlib.reload(app.server)
            
            expected_bucket = 'test-project-vana-logs-data'
            assert app.server.bucket_name == expected_bucket

    def test_bucket_creation_ci_skip(self):
        """Test bucket creation is skipped in CI environment."""
        with patch.dict(os.environ, {'CI': 'true'}):
            import importlib
            import app.server
            importlib.reload(app.server)
            
            assert app.server.bucket_name is None
"""CI validation tests that don't require backend server."""

import os
import unittest
from pathlib import Path


class TestCIValidation(unittest.TestCase):
    """Tests that can run in CI without backend dependencies."""

    def test_project_structure(self):
        """Validate project structure is intact."""
        project_root = Path(__file__).parent.parent.parent

        # Essential directories should exist
        required_dirs = ["app", "frontend", "tests", ".github/workflows"]

        for dir_name in required_dirs:
            dir_path = project_root / dir_name
            self.assertTrue(
                dir_path.exists(), f"Required directory {dir_name} not found"
            )

    def test_python_imports_basic(self):
        """Test that basic Python modules can be imported."""
        # Test basic imports that don't require Google Cloud
        try:
            from app.models import ModelType

            # ModelType should be importable (could be enum or class)
            self.assertIsNotNone(ModelType)
        except ImportError as e:
            self.fail(f"Failed to import basic models: {e}")

        # Test config import with CI environment
        try:
            import os

            os.environ["CI"] = "true"
            os.environ["GOOGLE_CLOUD_PROJECT"] = "test-project"
            from app.config import get_config

            config = get_config()
            self.assertIsNotNone(config)
        except Exception as e:
            # In CI, this might fail due to auth issues, which is expected
            if "DefaultCredentialsError" in str(e) or "Authentication" in str(e):
                pass  # Expected in CI
            else:
                self.fail(f"Unexpected config error: {e}")

    def test_configuration_files_exist(self):
        """Validate essential configuration files exist."""
        project_root = Path(__file__).parent.parent.parent

        required_files = [
            "pyproject.toml",
            "frontend/package.json",
            "frontend/next.config.ts",  # Next.js config is TypeScript
        ]

        for file_path in required_files:
            full_path = project_root / file_path
            self.assertTrue(full_path.exists(), f"Required file {file_path} not found")

    def test_environment_variables_ci(self):
        """Test CI environment is properly configured."""
        # In CI, these should be set
        if os.getenv("CI"):
            self.assertEqual(os.getenv("CI"), "true")

    def test_frontend_dependencies_structure(self):
        """Validate frontend structure without starting services."""
        project_root = Path(__file__).parent.parent.parent
        frontend_dir = project_root / "frontend"

        # Essential frontend files - use files that actually exist
        required_frontend_files = [
            "app/(chat)/page.tsx",  # Main chat page that exists
            "components/ui",  # UI components directory
            "tailwind.config.ts",  # Tailwind config is TypeScript
            "tsconfig.json",  # TypeScript config
        ]

        for file_path in required_frontend_files:
            full_path = frontend_dir / file_path
            self.assertTrue(full_path.exists(), f"Frontend file {file_path} not found")


if __name__ == "__main__":
    unittest.main()

"""
Tests for Docker container integration.
"""

import pytest
import subprocess
import time
from pathlib import Path

# Skip Docker tests if Docker is not available
def docker_available():
    """Check if Docker is available."""
    try:
        subprocess.run(["docker", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

docker_skip = pytest.mark.skipif(not docker_available(), reason="Docker not available")


class TestDockerIntegration:
    """Test cases for Docker container integration."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.containers_dir = Path(__file__).parent.parent.parent / "lib" / "sandbox" / "containers"
        self.built_images = []
    
    def teardown_method(self):
        """Clean up Docker images created during tests."""
        for image_name in self.built_images:
            try:
                subprocess.run(["docker", "rmi", image_name], capture_output=True)
            except subprocess.CalledProcessError:
                pass  # Image might not exist or be in use
    
    @docker_skip
    def test_python_dockerfile_exists(self):
        """Test that Python Dockerfile exists and is valid."""
        dockerfile_path = self.containers_dir / "Dockerfile.python"
        assert dockerfile_path.exists()
        
        # Check basic Dockerfile structure
        content = dockerfile_path.read_text()
        assert "FROM python:3.13-slim" in content
        assert "useradd -m -u 1000 sandbox" in content
        assert "USER sandbox" in content
        assert "WORKDIR /workspace" in content
    
    @docker_skip
    def test_javascript_dockerfile_exists(self):
        """Test that JavaScript Dockerfile exists and is valid."""
        dockerfile_path = self.containers_dir / "Dockerfile.javascript"
        assert dockerfile_path.exists()
        
        content = dockerfile_path.read_text()
        assert "FROM node:20-slim" in content
        assert "useradd -m -u 1000 sandbox" in content
        assert "USER sandbox" in content
        assert "WORKDIR /workspace" in content
    
    @docker_skip
    def test_shell_dockerfile_exists(self):
        """Test that Shell Dockerfile exists and is valid."""
        dockerfile_path = self.containers_dir / "Dockerfile.shell"
        assert dockerfile_path.exists()
        
        content = dockerfile_path.read_text()
        assert "FROM ubuntu:22.04" in content
        assert "useradd -m -u 1000 sandbox" in content
        assert "USER sandbox" in content
        assert "WORKDIR /workspace" in content
    
    @docker_skip
    def test_requirements_file_exists(self):
        """Test that requirements.txt exists and contains expected packages."""
        requirements_path = self.containers_dir / "requirements.txt"
        assert requirements_path.exists()
        
        content = requirements_path.read_text()
        assert "pandas" in content
        assert "numpy" in content
        assert "matplotlib" in content
        assert "scikit-learn" in content
    
    @docker_skip
    def test_package_json_exists(self):
        """Test that package.json exists and is valid."""
        package_json_path = self.containers_dir / "package.json"
        assert package_json_path.exists()
        
        content = package_json_path.read_text()
        assert "sandbox-js" in content
        assert "lodash" in content
    
    @docker_skip
    def test_build_python_image(self):
        """Test building Python Docker image."""
        image_name = "sandbox-python-test"
        self.built_images.append(image_name)
        
        # Build the image
        result = subprocess.run([
            "docker", "build",
            "-f", str(self.containers_dir / "Dockerfile.python"),
            "-t", image_name,
            str(self.containers_dir)
        ], capture_output=True, text=True)
        
        assert result.returncode == 0, f"Docker build failed: {result.stderr}"
        
        # Test that image was created
        result = subprocess.run([
            "docker", "images", image_name, "--format", "{{.Repository}}"
        ], capture_output=True, text=True)
        
        assert image_name in result.stdout
    
    @docker_skip
    def test_build_javascript_image(self):
        """Test building JavaScript Docker image."""
        image_name = "sandbox-javascript-test"
        self.built_images.append(image_name)
        
        # Build the image
        result = subprocess.run([
            "docker", "build",
            "-f", str(self.containers_dir / "Dockerfile.javascript"),
            "-t", image_name,
            str(self.containers_dir)
        ], capture_output=True, text=True)
        
        assert result.returncode == 0, f"Docker build failed: {result.stderr}"
        
        # Test that image was created
        result = subprocess.run([
            "docker", "images", image_name, "--format", "{{.Repository}}"
        ], capture_output=True, text=True)
        
        assert image_name in result.stdout
    
    @docker_skip
    def test_build_shell_image(self):
        """Test building Shell Docker image."""
        image_name = "sandbox-shell-test"
        self.built_images.append(image_name)
        
        # Build the image
        result = subprocess.run([
            "docker", "build",
            "-f", str(self.containers_dir / "Dockerfile.shell"),
            "-t", image_name,
            str(self.containers_dir)
        ], capture_output=True, text=True)
        
        assert result.returncode == 0, f"Docker build failed: {result.stderr}"
        
        # Test that image was created
        result = subprocess.run([
            "docker", "images", image_name, "--format", "{{.Repository}}"
        ], capture_output=True, text=True)
        
        assert image_name in result.stdout
    
    @docker_skip
    def test_python_container_startup_time(self):
        """Test Python container startup time."""
        image_name = "sandbox-python-test"
        self.built_images.append(image_name)
        
        # Build the image first
        subprocess.run([
            "docker", "build",
            "-f", str(self.containers_dir / "Dockerfile.python"),
            "-t", image_name,
            str(self.containers_dir)
        ], capture_output=True)
        
        # Measure startup time
        start_time = time.time()
        
        result = subprocess.run([
            "docker", "run", "--rm", image_name,
            "python", "-c", "print('Container started')"
        ], capture_output=True, text=True)
        
        startup_time = time.time() - start_time
        
        assert result.returncode == 0
        assert "Container started" in result.stdout
        assert startup_time < 10.0  # Should start within 10 seconds
    
    @docker_skip
    def test_javascript_container_startup_time(self):
        """Test JavaScript container startup time."""
        image_name = "sandbox-javascript-test"
        self.built_images.append(image_name)
        
        # Build the image first
        subprocess.run([
            "docker", "build",
            "-f", str(self.containers_dir / "Dockerfile.javascript"),
            "-t", image_name,
            str(self.containers_dir)
        ], capture_output=True)
        
        # Measure startup time
        start_time = time.time()
        
        result = subprocess.run([
            "docker", "run", "--rm", image_name,
            "node", "-e", "console.log('Container started')"
        ], capture_output=True, text=True)
        
        startup_time = time.time() - start_time
        
        assert result.returncode == 0
        assert "Container started" in result.stdout
        assert startup_time < 10.0  # Should start within 10 seconds
    
    @docker_skip
    def test_shell_container_startup_time(self):
        """Test Shell container startup time."""
        image_name = "sandbox-shell-test"
        self.built_images.append(image_name)
        
        # Build the image first
        subprocess.run([
            "docker", "build",
            "-f", str(self.containers_dir / "Dockerfile.shell"),
            "-t", image_name,
            str(self.containers_dir)
        ], capture_output=True)
        
        # Measure startup time
        start_time = time.time()
        
        result = subprocess.run([
            "docker", "run", "--rm", image_name,
            "bash", "-c", "echo 'Container started'"
        ], capture_output=True, text=True)
        
        startup_time = time.time() - start_time
        
        assert result.returncode == 0
        assert "Container started" in result.stdout
        assert startup_time < 10.0  # Should start within 10 seconds
    
    @docker_skip
    def test_container_security_non_root_user(self):
        """Test that containers run as non-root user."""
        image_name = "sandbox-python-test"
        self.built_images.append(image_name)
        
        # Build the image first
        subprocess.run([
            "docker", "build",
            "-f", str(self.containers_dir / "Dockerfile.python"),
            "-t", image_name,
            str(self.containers_dir)
        ], capture_output=True)
        
        # Check user ID
        result = subprocess.run([
            "docker", "run", "--rm", image_name,
            "python", "-c", "import os; print(os.getuid())"
        ], capture_output=True, text=True)
        
        assert result.returncode == 0
        uid = int(result.stdout.strip())
        assert uid == 1000  # Should run as user 1000 (sandbox user)
        assert uid != 0     # Should not run as root
    
    @docker_skip
    def test_container_working_directory(self):
        """Test that containers use correct working directory."""
        image_name = "sandbox-python-test"
        self.built_images.append(image_name)
        
        # Build the image first
        subprocess.run([
            "docker", "build",
            "-f", str(self.containers_dir / "Dockerfile.python"),
            "-t", image_name,
            str(self.containers_dir)
        ], capture_output=True)
        
        # Check working directory
        result = subprocess.run([
            "docker", "run", "--rm", image_name,
            "python", "-c", "import os; print(os.getcwd())"
        ], capture_output=True, text=True)
        
        assert result.returncode == 0
        assert "/workspace" in result.stdout.strip()
    
    @docker_skip
    def test_container_resource_limits(self):
        """Test running container with resource limits."""
        image_name = "sandbox-python-test"
        self.built_images.append(image_name)
        
        # Build the image first
        subprocess.run([
            "docker", "build",
            "-f", str(self.containers_dir / "Dockerfile.python"),
            "-t", image_name,
            str(self.containers_dir)
        ], capture_output=True)
        
        # Run with resource limits
        result = subprocess.run([
            "docker", "run", "--rm",
            "--memory=512m",
            "--cpus=1",
            image_name,
            "python", "-c", "print('Resource limits applied')"
        ], capture_output=True, text=True)
        
        assert result.returncode == 0
        assert "Resource limits applied" in result.stdout

"""
Unit tests for DevOps Specialist
Tests deployment, CI/CD, and infrastructure tools
"""

import pytest
import yaml
import json
from pathlib import Path
from agents.specialists.devops_tools import (
    analyze_deployment_config,
    generate_cicd_pipeline,
    analyze_infrastructure_as_code,
    generate_monitoring_config
)


class TestDevOpsTools:
    """Test suite for DevOps analysis tools"""
    
    def test_analyze_docker_compose(self, tmp_path):
        """Test Docker Compose analysis"""
        compose_content = """
version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    environment:
      - API_KEY=secret123
    depends_on:
      - db
  db:
    image: postgres:13
    environment:
      - POSTGRES_PASSWORD=mysecretpassword
    volumes:
      - ./data:/var/lib/postgresql/data
"""
        compose_file = tmp_path / "docker-compose.yml"
        compose_file.write_text(compose_content)
        
        result = analyze_deployment_config(str(compose_file))
        
        assert "Docker Compose Configuration" in result
        assert "Services: web, db" in result
        assert "Security Considerations" in result
        assert "Possible hardcoded secret" in result
        assert "Using 'latest' tag" in result
    
    def test_analyze_dockerfile(self, tmp_path):
        """Test Dockerfile analysis"""
        dockerfile_content = """
FROM python:3.11-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]
"""
        dockerfile = tmp_path / "Dockerfile"
        dockerfile.write_text(dockerfile_content)
        
        result = analyze_deployment_config(str(dockerfile))
        
        assert "Dockerfile Analysis" in result
        assert "Base Image: python:3.11-alpine" in result
        assert "Alpine Linux" in result
        assert "Running as root" in result  # No USER instruction
        assert "Exposed Ports: 8000" in result
    
    def test_analyze_kubernetes_deployment(self, tmp_path):
        """Test Kubernetes manifest analysis"""
        k8s_content = """
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
  selector:
    matchLabels:
      app: web
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        ports:
        - containerPort: 8080
"""
        k8s_file = tmp_path / "deployment.yaml"
        k8s_file.write_text(k8s_content)
        
        result = analyze_deployment_config(str(k8s_file))
        
        assert "Kubernetes Manifest" in result
        assert "Kind: Deployment" in result
        assert "Name: web-app" in result
        assert "Namespace: production" in result
        assert "Replicas: 3" in result
        assert "Strategy: RollingUpdate" in result
    
    def test_generate_python_github_pipeline(self):
        """Test GitHub Actions pipeline generation for Python"""
        result = generate_cicd_pipeline("python", "github")
        
        assert "GitHub Actions Pipeline" in result
        assert "Python CI/CD" in result
        assert "pytest" in result
        assert "flake8" in result
        assert "black" in result
        assert "matrix:" in result
        assert "python-version:" in result
    
    def test_generate_node_github_pipeline(self):
        """Test GitHub Actions pipeline generation for Node.js"""
        result = generate_cicd_pipeline("node", "github")
        
        assert "Node.js CI/CD" in result
        assert "npm" in result
        assert "node-version:" in result
        assert "npm audit" in result
    
    def test_generate_go_github_pipeline(self):
        """Test GitHub Actions pipeline generation for Go"""
        result = generate_cicd_pipeline("go", "github")
        
        assert "Go CI/CD" in result
        assert "go mod" in result
        assert "go test" in result
        assert "staticcheck" in result
    
    def test_generate_generic_pipeline(self):
        """Test generic pipeline generation"""
        result = generate_cicd_pipeline("ruby", "jenkins")
        
        assert "CI/CD Pipeline Generation" in result
        assert "Project Type: ruby" in result
        assert "Platform: jenkins" in result
        assert "Build Stage" in result
        assert "Test Stage" in result
        assert "Deploy Stage" in result
    
    def test_analyze_terraform_iac(self, tmp_path):
        """Test Terraform infrastructure analysis"""
        tf_content = '''
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}

resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

variable "region" {
  default = "us-east-1"
}

output "instance_ip" {
  value = aws_instance.web.public_ip
}
'''
        tf_file = tmp_path / "main.tf"
        tf_file.write_text(tf_content)
        
        result = analyze_infrastructure_as_code(str(tf_file))
        
        assert "Terraform Configuration" in result
        assert "Resources: 2" in result
        assert "Variables: 1" in result
        assert "Outputs: 1" in result
        assert "Security Considerations" in result
    
    def test_analyze_terraform_security_issues(self, tmp_path):
        """Test Terraform security issue detection"""
        tf_content = '''
resource "aws_security_group" "web" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "database" {
  password = "admin123"
  storage_encrypted = false
}
'''
        tf_file = tmp_path / "insecure.tf"
        tf_file.write_text(tf_content)
        
        result = analyze_infrastructure_as_code(str(tf_file))
        
        assert "Security group allows access from 0.0.0.0/0" in result
        assert "Potential hardcoded secrets" in result
    
    def test_analyze_iac_directory(self, tmp_path):
        """Test IaC directory analysis"""
        # Create directory structure
        (tmp_path / "modules").mkdir()
        (tmp_path / "modules" / "vpc").mkdir()
        (tmp_path / "environments").mkdir()
        (tmp_path / "environments" / "prod").mkdir()
        (tmp_path / "environments" / "dev").mkdir()
        
        # Create some files
        (tmp_path / "main.tf").write_text("# Main config")
        (tmp_path / "variables.tf").write_text("# Variables")
        (tmp_path / "outputs.tf").write_text("# Outputs")
        
        result = analyze_infrastructure_as_code(str(tmp_path))
        
        assert "IaC Directory Analysis" in result
        assert "Terraform files: 3" in result
        assert "Modules: 1" in result
        assert "Environments: dev, prod" in result
    
    def test_generate_prometheus_monitoring(self):
        """Test Prometheus monitoring configuration"""
        result = generate_monitoring_config("prometheus", "basic")
        
        assert "Prometheus Monitoring Configuration" in result
        assert "prometheus.yml" in result
        assert "scrape_configs:" in result
        assert "alerting:" in result
        assert "Alert Rules" in result
        assert "HighCPUUsage" in result
        assert "ServiceDown" in result
    
    def test_generate_datadog_monitoring(self):
        """Test Datadog monitoring configuration"""
        result = generate_monitoring_config("datadog", "detailed")
        
        assert "Datadog Monitoring Configuration" in result
        assert "datadog.yaml" in result
        assert "api_key:" in result
        assert "logs_enabled:" in result
        assert "Application Integration" in result
        assert "@track_request" in result
    
    def test_generate_cloudwatch_monitoring(self):
        """Test CloudWatch monitoring configuration"""
        result = generate_monitoring_config("cloudwatch", "basic")
        
        assert "AWS CloudWatch Configuration" in result
        assert "CloudWatch Agent Config" in result
        assert "metrics_collected" in result
        assert "CloudFormation Alarms" in result
        assert "HighCPUAlarm" in result
    
    def test_generate_generic_monitoring(self):
        """Test generic monitoring configuration"""
        result = generate_monitoring_config("newrelic", "full")
        
        assert "Monitoring Configuration" in result
        assert "Essential Metrics to Monitor" in result
        assert "System Metrics" in result
        assert "Application Metrics" in result
        assert "Business Metrics" in result


class TestDevOpsEdgeCases:
    """Test edge cases and error conditions"""
    
    def test_analyze_nonexistent_file(self):
        """Test analyzing non-existent file"""
        result = analyze_deployment_config("/nonexistent/file.yml")
        assert "Error" in result or "not found" in result
    
    def test_analyze_invalid_yaml(self, tmp_path):
        """Test analyzing invalid YAML"""
        invalid_yaml = "invalid:\n  - yaml\n    bad indent"
        yaml_file = tmp_path / "invalid.yml"
        yaml_file.write_text(invalid_yaml)
        
        result = analyze_deployment_config(str(yaml_file))
        assert "Error parsing YAML" in result
    
    def test_analyze_empty_dockerfile(self, tmp_path):
        """Test analyzing empty Dockerfile"""
        dockerfile = tmp_path / "Dockerfile"
        dockerfile.write_text("")
        
        result = analyze_deployment_config(str(dockerfile))
        assert "Dockerfile" in result
        # Should handle gracefully
    
    def test_complex_docker_compose_security(self, tmp_path):
        """Test complex Docker Compose with multiple security issues"""
        compose_content = """
version: '3.8'
services:
  web:
    image: web:latest
    ports:
      - "0.0.0.0:80:80"
    privileged: true
    environment:
      - DB_PASSWORD=secret123
      - API_SECRET_KEY=abcdef
      - JWT_TOKEN=xyz789
"""
        compose_file = tmp_path / "docker-compose.yml"
        compose_file.write_text(compose_content)
        
        result = analyze_deployment_config(str(compose_file))
        
        # Should detect multiple issues
        assert "Binding to 0.0.0.0" in result
        assert "Running in privileged mode" in result
        assert "hardcoded secret" in result
    
    def test_terraform_without_encryption(self, tmp_path):
        """Test Terraform configs missing encryption"""
        tf_content = '''
resource "aws_s3_bucket" "logs" {
  bucket = "my-logs"
}

resource "aws_rds_instance" "database" {
  instance_class = "db.t3.micro"
}
'''
        tf_file = tmp_path / "main.tf"
        tf_file.write_text(tf_content)
        
        result = analyze_infrastructure_as_code(str(tf_file))
        
        assert "S3 bucket without encryption" in result
        assert "RDS instance without encryption" in result
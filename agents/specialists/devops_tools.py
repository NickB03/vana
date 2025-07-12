"""
DevOps Specialist Tools - ADK Aligned Implementation

Synchronous tools for deployment, infrastructure, and CI/CD analysis.
Focuses on containerization, orchestration, and automation best practices.
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List

import yaml


def analyze_deployment_config(config_path: str) -> str:
    """
    Analyze deployment configuration files (Docker, K8s, etc.).

    Args:
        config_path: Path to configuration file

    Returns:
        Deployment configuration analysis
    """
    try:
        path = Path(config_path)
        if not path.exists():
            return f"Error: Configuration file {config_path} not found"

        content = path.read_text()
        analysis = f"## Deployment Configuration Analysis\n\n"
        analysis += f"**File**: {path.name}\n"
        analysis += f"**Type**: "

        # Determine file type and analyze accordingly
        if path.suffix in [".yml", ".yaml"]:
            analysis += "YAML Configuration\n\n"

            try:
                data = yaml.safe_load(content)

                # Docker Compose analysis
                if "services" in data:
                    analysis += "### Docker Compose Configuration\n"
                    analysis += f"- **Services**: {', '.join(data['services'].keys())}\n"
                    analysis += f"- **Version**: {data.get('version', 'Not specified')}\n\n"

                    # Analyze each service
                    for service, config in data["services"].items():
                        analysis += f"#### Service: {service}\n"
                        if "image" in config:
                            analysis += f"- Image: `{config['image']}`\n"
                        if "build" in config:
                            analysis += f"- Build: `{config['build']}`\n"
                        if "ports" in config:
                            analysis += f"- Ports: {config['ports']}\n"
                        if "environment" in config:
                            analysis += f"- Environment vars: {len(config.get('environment', []))} defined\n"
                        if "volumes" in config:
                            analysis += f"- Volumes: {len(config.get('volumes', []))} mounted\n"
                        if "depends_on" in config:
                            analysis += f"- Dependencies: {', '.join(config['depends_on'])}\n"
                        analysis += "\n"

                    # Security analysis
                    analysis += "### Security Considerations\n"
                    security_issues = []

                    for service, config in data["services"].items():
                        # Check for exposed ports
                        if "ports" in config:
                            for port in config["ports"]:
                                if isinstance(port, str) and port.startswith("0.0.0.0"):
                                    security_issues.append(f"- {service}: Binding to 0.0.0.0 (consider localhost)")

                        # Check for privileged mode
                        if config.get("privileged"):
                            security_issues.append(f"- {service}: Running in privileged mode")

                        # Check for hardcoded secrets
                        if "environment" in config:
                            for env in config.get("environment", []):
                                if isinstance(env, str) and any(
                                    secret in env.upper() for secret in ["PASSWORD", "SECRET", "KEY", "TOKEN"]
                                ):
                                    security_issues.append(f"- {service}: Possible hardcoded secret in environment")

                    if security_issues:
                        analysis += "\n".join(security_issues[:5])  # Limit to first 5
                    else:
                        analysis += "- No immediate security issues detected"

                # Kubernetes manifest analysis
                elif "apiVersion" in data:
                    analysis += "### Kubernetes Manifest\n"
                    analysis += f"- **API Version**: {data['apiVersion']}\n"
                    analysis += f"- **Kind**: {data['kind']}\n"
                    analysis += f"- **Name**: {data.get('metadata', {}).get('name', 'unnamed')}\n"
                    analysis += f"- **Namespace**: {data.get('metadata', {}).get('namespace', 'default')}\n\n"

                    # Deployment specific analysis
                    if data["kind"] == "Deployment":
                        spec = data.get("spec", {})
                        analysis += "#### Deployment Details\n"
                        analysis += f"- Replicas: {spec.get('replicas', 1)}\n"
                        analysis += f"- Strategy: {spec.get('strategy', {}).get('type', 'RollingUpdate')}\n"

                        # Container analysis
                        containers = spec.get("template", {}).get("spec", {}).get("containers", [])
                        if containers:
                            analysis += f"- Containers: {len(containers)}\n"
                            for container in containers:
                                analysis += (
                                    f"  - {container.get('name', 'unnamed')}: {container.get('image', 'no-image')}\n"
                                )

                    # Service specific analysis
                    elif data["kind"] == "Service":
                        spec = data.get("spec", {})
                        analysis += "#### Service Details\n"
                        analysis += f"- Type: {spec.get('type', 'ClusterIP')}\n"
                        analysis += f"- Ports: {spec.get('ports', [])}\n"
                        analysis += f"- Selector: {spec.get('selector', {})}\n"

            except yaml.YAMLError as e:
                analysis += f"\nError parsing YAML: {str(e)}\n"

        elif path.name == "Dockerfile":
            analysis += "Dockerfile\n\n"
            lines = content.split("\n")

            # Extract key information
            base_image = None
            user_specified = False
            exposed_ports = []

            for line in lines:
                line = line.strip()
                if line.startswith("FROM"):
                    base_image = line.split()[1] if len(line.split()) > 1 else "unknown"
                elif line.startswith("USER"):
                    user_specified = True
                elif line.startswith("EXPOSE"):
                    ports = line.split()[1:]
                    exposed_ports.extend(ports)

            analysis += "### Dockerfile Analysis\n"
            if base_image:
                analysis += f"- **Base Image**: `{base_image}`\n"

                # Security checks for base image
                if ":latest" in base_image or not ":" in base_image:
                    analysis += "  - ⚠️ Using 'latest' tag or no tag (pin specific version)\n"
                if "alpine" in base_image:
                    analysis += "  - ✅ Using Alpine Linux (minimal attack surface)\n"

            analysis += f"- **User Configuration**: {'✅ Non-root user' if user_specified else '⚠️ Running as root (add USER instruction)'}\n"

            if exposed_ports:
                analysis += f"- **Exposed Ports**: {', '.join(exposed_ports)}\n"

            # Check for common issues
            analysis += "\n### Best Practices Check\n"
            issues = []

            if not user_specified:
                issues.append("- Add USER instruction to run as non-root")

            if "apt-get install" in content and "apt-get update" not in content:
                issues.append("- Missing apt-get update before install")

            if "COPY . ." in content or "ADD . ." in content:
                issues.append("- Copying entire directory (be specific about files)")

            if not any(line.strip().startswith("HEALTHCHECK") for line in lines):
                issues.append("- Consider adding HEALTHCHECK instruction")

            if issues:
                analysis += "\n".join(issues)
            else:
                analysis += "- All basic checks passed"

        elif path.suffix == ".json":
            analysis += "JSON Configuration\n\n"
            try:
                data = json.loads(content)
                analysis += f"- **Keys**: {', '.join(list(data.keys())[:10])}\n"

                # Check for common CI/CD configurations
                if "scripts" in data:
                    analysis += f"- **Scripts defined**: {len(data['scripts'])}\n"
                if "dependencies" in data:
                    analysis += f"- **Dependencies**: {len(data['dependencies'])}\n"
                if "devDependencies" in data:
                    analysis += f"- **Dev Dependencies**: {len(data['devDependencies'])}\n"

            except json.JSONDecodeError as e:
                analysis += f"Error parsing JSON: {str(e)}\n"

        return analysis

    except Exception as e:
        return f"Error analyzing deployment config: {str(e)}"


def generate_cicd_pipeline(project_type: str, platform: str = "github") -> str:
    """
    Generate CI/CD pipeline configuration for different platforms.

    Args:
        project_type: Type of project (python, node, go, etc.)
        platform: CI/CD platform (github, gitlab, jenkins)

    Returns:
        Generated CI/CD configuration
    """
    pipelines = {
        (
            "python",
            "github",
        ): """## Generated GitHub Actions Pipeline

```yaml
name: Python CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.9", "3.10", "3.11", "3.12"]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v5
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
        restore-keys: |
          ${{ runner.os }}-pip-
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest pytest-cov flake8 black mypy
    
    - name: Lint with flake8
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    
    - name: Format check with black
      run: black --check .
    
    - name: Type check with mypy
      run: mypy . --ignore-missing-imports
    
    - name: Test with pytest
      run: |
        pytest tests/ -v --cov=./ --cov-report=xml --cov-report=html
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
        flags: unittests
        name: codecov-umbrella

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Bandit Security Scan
      uses: gaurav-nelson/bandit-action@v1
      with:
        path: "."
    
    - name: Safety check
      run: |
        pip install safety
        safety check

  build:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build Docker image
      run: |
        docker build -t ${{ github.repository }}:${{ github.sha }} .
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: '${{ github.repository }}:${{ github.sha }}'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: |
        echo "Deployment steps would go here"
        # Example: kubectl apply -f k8s/
        # Example: aws ecs update-service
```

### Key Features
- **Matrix Testing**: Tests against multiple Python versions
- **Dependency Caching**: Speeds up builds
- **Code Quality**: Linting, formatting, type checking
- **Security Scanning**: Bandit and Safety checks
- **Test Coverage**: With Codecov integration
- **Container Security**: Trivy scanning
- **Conditional Deployment**: Only on main branch""",
        (
            "node",
            "github",
        ): """## Generated GitHub Actions Pipeline

```yaml
name: Node.js CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x, 21.x]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint
      run: npm run lint
    
    - name: Type check
      run: npm run type-check
      
    - name: Test
      run: npm run test:ci
    
    - name: Build
      run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run npm audit
      run: npm audit --audit-level=high
    
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: |
        echo "Deploy to Vercel, Netlify, or cloud provider"
```

### Key Features
- **Node.js Matrix**: Tests on multiple versions
- **NPM Caching**: Faster dependency installation
- **Security Audit**: npm audit and Snyk
- **Type Checking**: If TypeScript is used
- **Automated Deployment**: On main branch""",
        (
            "go",
            "github",
        ): """## Generated GitHub Actions Pipeline

```yaml
name: Go CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        go-version: ["1.20", "1.21", "1.22"]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Go ${{ matrix.go-version }}
      uses: actions/setup-go@v5
      with:
        go-version: ${{ matrix.go-version }}
    
    - name: Cache Go modules
      uses: actions/cache@v3
      with:
        path: ~/go/pkg/mod
        key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
        restore-keys: |
          ${{ runner.os }}-go-
    
    - name: Download dependencies
      run: go mod download
    
    - name: Verify dependencies
      run: go mod verify
    
    - name: Run go vet
      run: go vet ./...
    
    - name: Run staticcheck
      uses: dominikh/staticcheck-action@v1.3.0
      with:
        version: "2023.1.6"
    
    - name: Run tests
      run: go test -v -race -coverprofile=coverage.out ./...
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.out

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Go
      uses: actions/setup-go@v5
      with:
        go-version: "1.21"
    
    - name: Build
      run: |
        CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app .
    
    - name: Build Docker image
      run: |
        docker build -t ${{ github.repository }}:${{ github.sha }} .
```

### Key Features
- **Go Version Matrix**: Tests on multiple Go versions
- **Module Caching**: Faster builds
- **Static Analysis**: go vet and staticcheck
- **Race Detection**: Tests with -race flag
- **Cross-compilation**: Linux binary build""",
    }

    key = (project_type.lower(), platform.lower())
    if key in pipelines:
        return pipelines[key]
    else:
        return f"""## CI/CD Pipeline Generation

**Project Type**: {project_type}
**Platform**: {platform}

### Basic Pipeline Structure

1. **Build Stage**
   - Install dependencies
   - Compile/build project
   - Run unit tests

2. **Test Stage**
   - Run integration tests
   - Code quality checks
   - Security scanning

3. **Deploy Stage**
   - Build artifacts
   - Deploy to staging
   - Deploy to production

### Recommended Tools
- **Testing**: pytest, jest, go test
- **Security**: Snyk, Trivy, Safety
- **Code Quality**: SonarQube, CodeClimate
- **Deployment**: Kubernetes, Docker, Terraform

💡 Use the specific project_type and platform combination for a detailed pipeline configuration."""


def analyze_infrastructure_as_code(iac_path: str) -> str:
    """
    Analyze Infrastructure as Code files (Terraform, CloudFormation, etc.).

    Args:
        iac_path: Path to IaC file or directory

    Returns:
        IaC analysis report
    """
    try:
        path = Path(iac_path)
        if not path.exists():
            return f"Error: Path {iac_path} not found"

        analysis = "## Infrastructure as Code Analysis\n\n"

        if path.is_file():
            content = path.read_text()

            # Terraform analysis
            if path.suffix == ".tf":
                analysis += "### Terraform Configuration\n"

                # Count resources
                resource_count = len(re.findall(r'resource\s+"[^"]+"\s+"[^"]+"', content))
                data_count = len(re.findall(r'data\s+"[^"]+"\s+"[^"]+"', content))
                variable_count = len(re.findall(r'variable\s+"[^"]+"', content))
                output_count = len(re.findall(r'output\s+"[^"]+"', content))

                analysis += f"- **Resources**: {resource_count}\n"
                analysis += f"- **Data Sources**: {data_count}\n"
                analysis += f"- **Variables**: {variable_count}\n"
                analysis += f"- **Outputs**: {output_count}\n\n"

                # Security analysis
                analysis += "### Security Considerations\n"
                security_issues = []

                # Check for hardcoded values
                if re.search(r'(password|secret|key)\s*=\s*"[^"]+"', content, re.IGNORECASE):
                    security_issues.append("- Potential hardcoded secrets detected")

                # Check for public access
                if "ingress" in content and "0.0.0.0/0" in content:
                    security_issues.append("- Security group allows access from 0.0.0.0/0")

                # Check for encryption
                if "aws_s3_bucket" in content and "server_side_encryption_configuration" not in content:
                    security_issues.append("- S3 bucket without encryption configuration")

                if "aws_rds_instance" in content and "storage_encrypted" not in content:
                    security_issues.append("- RDS instance without encryption")

                if security_issues:
                    analysis += "\n".join(security_issues)
                else:
                    analysis += "- No immediate security issues detected"

                # Best practices
                analysis += "\n\n### Best Practices\n"
                if "terraform" not in content:
                    analysis += "- Add terraform version constraint\n"
                if "backend" not in content:
                    analysis += "- Configure remote state backend\n"
                if not re.search(r"tags\s*=\s*{", content):
                    analysis += "- Add resource tags for organization\n"

            # CloudFormation analysis
            elif path.suffix in [".yml", ".yaml", ".json"] and "AWSTemplateFormatVersion" in content:
                analysis += "### CloudFormation Template\n"

                try:
                    if path.suffix == ".json":
                        template = json.loads(content)
                    else:
                        template = yaml.safe_load(content)

                    analysis += f"- **Format Version**: {template.get('AWSTemplateFormatVersion', 'Not specified')}\n"
                    analysis += f"- **Description**: {template.get('Description', 'No description')[:100]}...\n"

                    if "Parameters" in template:
                        analysis += f"- **Parameters**: {len(template['Parameters'])}\n"
                    if "Resources" in template:
                        analysis += f"- **Resources**: {len(template['Resources'])}\n"
                    if "Outputs" in template:
                        analysis += f"- **Outputs**: {len(template['Outputs'])}\n"

                except (json.JSONDecodeError, yaml.YAMLError) as e:
                    analysis += f"Error parsing template: {str(e)}\n"

        else:  # Directory
            analysis += f"### IaC Directory Analysis: {path.name}\n"

            # Count files by type
            tf_files = list(path.rglob("*.tf"))
            yaml_files = list(path.rglob("*.yaml")) + list(path.rglob("*.yml"))
            json_files = list(path.rglob("*.json"))

            analysis += f"- **Terraform files**: {len(tf_files)}\n"
            analysis += f"- **YAML files**: {len(yaml_files)}\n"
            analysis += f"- **JSON files**: {len(json_files)}\n"

            # Check for modules
            if (path / "modules").exists():
                modules = [d for d in (path / "modules").iterdir() if d.is_dir()]
                analysis += f"- **Modules**: {len(modules)} ({', '.join(m.name for m in modules[:5])})\n"

            # Check for environments
            env_dirs = ["dev", "staging", "prod", "production"]
            envs = [d for d in path.iterdir() if d.is_dir() and d.name in env_dirs]
            if envs:
                analysis += f"- **Environments**: {', '.join(e.name for e in envs)}\n"

        return analysis

    except Exception as e:
        return f"Error analyzing IaC: {str(e)}"


def generate_monitoring_config(stack: str, metrics_type: str = "basic") -> str:
    """
    Generate monitoring and observability configuration.

    Args:
        stack: Technology stack (prometheus, datadog, cloudwatch, etc.)
        metrics_type: Level of metrics (basic, detailed, full)

    Returns:
        Monitoring configuration
    """
    from .devops_monitoring_configs import DEFAULT_CONFIG_TEMPLATE, MONITORING_CONFIGS

    if stack.lower() in MONITORING_CONFIGS:
        return MONITORING_CONFIGS[stack.lower()]
    else:
        return DEFAULT_CONFIG_TEMPLATE.format(stack=stack, metrics_type=metrics_type)

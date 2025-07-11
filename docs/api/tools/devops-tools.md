# DevOps Tools API Reference

**Status**: Phase 3 Complete ✅  
**Location**: `agents/specialists/devops_tools.py`

The DevOps Specialist provides 6 tools for infrastructure automation, CI/CD pipeline generation, deployment configuration, and monitoring setup.

## Tool Overview

| Tool | Purpose | Output Format | Performance |
|------|---------|---------------|-------------|
| `generate_ci_cd_pipeline` | Create CI/CD configurations | YAML | 200-400ms |
| `create_deployment_config` | Generate K8s/Docker configs | YAML/JSON | 300-500ms |
| `setup_monitoring` | Configure monitoring stack | YAML | 250-400ms |
| `analyze_infrastructure` | Assess current infrastructure | Markdown | 400-600ms |
| `optimize_deployment` | Improve deployment performance | Markdown | 300-500ms |
| `generate_iac` | Create Infrastructure as Code | HCL/YAML | 400-800ms |

## Tool Details

### 1. generate_ci_cd_pipeline

Generates CI/CD pipeline configurations for various platforms.

**Parameters:**
```python
generate_ci_cd_pipeline(
    project_type: str,
    platform: str = "github",
    features: List[str] = None
) -> str
```

**Input:**
- `project_type` (str): Type of project (python, node, java, go, etc.)
- `platform` (str): CI/CD platform (github, gitlab, jenkins, azure)
- `features` (List[str]): Optional features (testing, security, deploy)

**Supported Platforms:**
- GitHub Actions
- GitLab CI
- Jenkins (Jenkinsfile)
- Azure DevOps
- CircleCI
- Travis CI

**Example:**
```python
result = generate_ci_cd_pipeline(
    "python",
    "github",
    ["testing", "security", "docker", "deploy"]
)
# Returns:
"""
## Generated CI/CD Pipeline

### Platform: GitHub Actions
### Project Type: Python
### Features: testing, security, docker, deploy

### File: .github/workflows/ci-cd.yml

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

env:
  PYTHON_VERSION: '3.13'
  
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.11', '3.12', '3.13']
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Cache dependencies
      uses: actions/cache@v3
      with:
        path: ~/.cache/pip
        key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install poetry
        poetry install
    
    - name: Run tests
      run: |
        poetry run pytest --cov=./ --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  security:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Bandit security scan
      run: |
        pip install bandit
        bandit -r . -f json -o bandit-report.json
    
    - name: Run Safety check
      run: |
        pip install safety
        safety check --json
    
    - name: SonarCloud Scan
      uses: SonarSource/sonarcloud-github-action@master
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  build-docker:
    runs-on: ubuntu-latest
    needs: [test, security]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          ${{ secrets.DOCKERHUB_USERNAME }}/app:latest
          ${{ secrets.DOCKERHUB_USERNAME }}/app:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  deploy:
    runs-on: ubuntu-latest
    needs: build-docker
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to Kubernetes
      run: |
        # Configure kubectl
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
        
        # Update deployment
        kubectl set image deployment/app app=${{ secrets.DOCKERHUB_USERNAME }}/app:${{ github.sha }}
        kubectl rollout status deployment/app
```

### Additional Files Generated:

1. **.github/dependabot.yml** - Dependency updates
2. **sonar-project.properties** - SonarCloud config
3. **.dockerignore** - Docker build optimization
"""
```

### 2. create_deployment_config

Generates deployment configurations for Kubernetes, Docker Compose, or cloud platforms.

**Parameters:**
```python
create_deployment_config(
    app_name: str,
    config_type: str = "kubernetes",
    environment: str = "production",
    replicas: int = 3
) -> str
```

**Input:**
- `app_name` (str): Application name
- `config_type` (str): Type of config (kubernetes, docker-compose, helm)
- `environment` (str): Target environment (dev, staging, production)
- `replicas` (int): Number of replicas for scaling

**Example:**
```python
result = create_deployment_config(
    "vana-api",
    "kubernetes",
    "production",
    replicas=3
)
# Returns:
"""
## Deployment Configuration

### Application: vana-api
### Type: Kubernetes
### Environment: production

### File: k8s/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vana-api
  namespace: production
  labels:
    app: vana-api
    environment: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vana-api
  template:
    metadata:
      labels:
        app: vana-api
        version: stable
    spec:
      containers:
      - name: vana-api
        image: vana/api:latest
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: ENVIRONMENT
          value: "production"
        - name: LOG_LEVEL
          value: "info"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          readOnlyRootFilesystem: true
---
apiVersion: v1
kind: Service
metadata:
  name: vana-api
  namespace: production
spec:
  selector:
    app: vana-api
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: vana-api
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: vana-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Additional Files:

1. **k8s/service.yaml** - Service configuration
2. **k8s/ingress.yaml** - Ingress rules
3. **k8s/configmap.yaml** - Configuration data
4. **k8s/secrets.yaml** - Secret template
"""
```

### 3. setup_monitoring

Configures monitoring stack with Prometheus, Grafana, and alerts.

**Parameters:**
```python
setup_monitoring(
    app_name: str,
    monitoring_stack: str = "prometheus",
    include_logging: bool = True
) -> str
```

**Input:**
- `app_name` (str): Application to monitor
- `monitoring_stack` (str): Stack type (prometheus, datadog, newrelic)
- `include_logging` (bool): Include logging configuration

**Example:**
```python
result = setup_monitoring("vana-api", "prometheus", True)
# Returns:
"""
## Monitoring Configuration

### Application: vana-api
### Stack: Prometheus + Grafana
### Logging: Enabled (Loki)

### File: monitoring/prometheus-config.yaml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093

rule_files:
  - "alerts/*.yml"

scrape_configs:
  - job_name: 'vana-api'
    static_configs:
    - targets: ['vana-api:8080']
    metrics_path: '/metrics'
    
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
      action: replace
      target_label: __metrics_path__
      regex: (.+)
```

### File: monitoring/alerts/vana-api-alerts.yml

```yaml
groups:
- name: vana-api
  interval: 30s
  rules:
  - alert: HighErrorRate
    expr: |
      rate(http_requests_total{job="vana-api",status=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
      team: platform
    annotations:
      summary: "High error rate on {{ $labels.instance }}"
      description: "Error rate is {{ $value }} errors per second"
      
  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High latency on {{ $labels.instance }}"
      description: "95th percentile latency is {{ $value }}s"
      
  - alert: PodCrashLooping
    expr: |
      rate(kube_pod_container_status_restarts_total[15m]) > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
```

### File: monitoring/grafana-dashboard.json

{
  "dashboard": {
    "title": "VANA API Dashboard",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='vana-api'}[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='vana-api',status=~'5..'}[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}

### File: monitoring/loki-config.yaml

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h
```
"""
```

### 4. analyze_infrastructure

Analyzes current infrastructure and provides optimization recommendations.

**Parameters:**
```python
analyze_infrastructure(
    infrastructure_type: str,
    cloud_provider: str = "aws"
) -> str
```

**Input:**
- `infrastructure_type` (str): Type to analyze (kubernetes, serverless, vm)
- `cloud_provider` (str): Cloud provider (aws, gcp, azure)

**Example:**
```python
result = analyze_infrastructure("kubernetes", "aws")
# Returns detailed analysis with recommendations
```

### 5. optimize_deployment

Provides deployment optimization strategies.

**Parameters:**
```python
optimize_deployment(
    current_setup: str,
    optimization_goals: List[str] = None
) -> str
```

**Input:**
- `current_setup` (str): Description of current deployment
- `optimization_goals` (List[str]): Goals (cost, performance, reliability)

**Example:**
```python
result = optimize_deployment(
    "3 EC2 instances running containers",
    ["cost", "performance"]
)
# Returns optimization strategies
```

### 6. generate_iac

Generates Infrastructure as Code templates.

**Parameters:**
```python
generate_iac(
    infrastructure_spec: str,
    iac_tool: str = "terraform"
) -> str
```

**Input:**
- `infrastructure_spec` (str): Infrastructure requirements
- `iac_tool` (str): IaC tool (terraform, cloudformation, ansible)

**Example:**
```python
result = generate_iac(
    "Web app with load balancer and RDS",
    "terraform"
)
# Returns:
"""
## Infrastructure as Code

### Tool: Terraform
### Provider: AWS

### File: main.tf

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.app_name}-vpc"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true

  tags = {
    Name = "${var.app_name}-alb"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_encrypted     = true
  
  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  deletion_protection = true

  tags = {
    Name = "${var.app_name}-db"
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "main" {
  name                = "${var.app_name}-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.main.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 2
  max_size         = 10
  desired_capacity = 3

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.app_name}-instance"
    propagate_at_launch = true
  }
}
```

### File: variables.tf

```hcl
variable "app_name" {
  description = "Application name"
  type        = string
  default     = "vana"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_username" {
  description = "Database username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
```
"""
```

## Usage Examples

### Complete DevOps Pipeline
```python
# 1. Generate CI/CD pipeline
pipeline = generate_ci_cd_pipeline(
    "python",
    "github",
    ["testing", "security", "deploy"]
)

# 2. Create deployment config
deployment = create_deployment_config(
    "my-app",
    "kubernetes",
    "production"
)

# 3. Setup monitoring
monitoring = setup_monitoring(
    "my-app",
    "prometheus"
)

# 4. Generate infrastructure
infra = generate_iac(
    "Load balanced web app",
    "terraform"
)
```

### Infrastructure Analysis
```python
# Analyze current setup
analysis = analyze_infrastructure("kubernetes", "aws")

# Get optimization suggestions
optimizations = optimize_deployment(
    analysis,
    ["cost", "performance", "security"]
)
```

## Best Practices

1. **Version Control**: Commit all generated configs
2. **Environment Separation**: Use different configs per environment
3. **Security First**: Always include security scanning
4. **Monitor Everything**: Setup monitoring before production
5. **Automate Deployments**: Use CI/CD for all changes
6. **Infrastructure as Code**: Never manually configure
7. **Test Infrastructure**: Include infrastructure tests

## Performance Notes

- Config generation is CPU-bound
- Large infrastructures may take up to 800ms
- Results are cached for 10 minutes
- Parallel generation supported

## Integration Tips

```python
# Integrate with existing tools
import yaml

# Modify generated configs
config = generate_ci_cd_pipeline("python", "github")
parsed = yaml.safe_load(config)
# Add custom steps
parsed['jobs']['custom'] = {...}
```

## Error Handling

All tools return informative error messages:
```
"Error: Unsupported project type: 'rust'"
"Error: Invalid platform: 'unknown-ci'"
"Error: Missing required feature: 'database'"
```
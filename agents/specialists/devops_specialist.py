"""
DevOps Specialist Agent - Google ADK Implementation

This agent provides expert-level DevOps guidance, infrastructure automation,
CI/CD pipeline optimization, and cloud infrastructure management.

Specializations:
- Infrastructure as Code (IaC) and automation
- CI/CD pipeline design and optimization
- Container orchestration and microservices deployment
- Cloud platform architecture (AWS, GCP, Azure)
- Monitoring, logging, and observability
- Security and compliance automation
"""

import os
import sys
from dotenv import load_dotenv

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import relevant tools for DevOps analysis
from lib._tools import (
    adk_vector_search, adk_search_knowledge, adk_read_file, adk_list_directory
)

def analyze_infrastructure(context: str) -> str:
    """Analyze infrastructure requirements and provide deployment recommendations."""
    return f"""⚙️ Infrastructure Analysis for: {context}

## Infrastructure Architecture
- **Cloud Platform**: Multi-cloud strategy with primary GCP, AWS backup
- **Compute**: Kubernetes clusters with auto-scaling node pools
- **Networking**: VPC with private subnets, NAT gateways, load balancers
- **Storage**: Persistent volumes with automated backup and encryption

## Container Strategy
- **Containerization**: Docker with multi-stage builds for optimization
- **Orchestration**: Kubernetes with Helm charts for package management
- **Service Mesh**: Istio for traffic management and security
- **Registry**: Private container registry with vulnerability scanning

## CI/CD Pipeline Design
- **Source Control**: Git with feature branch workflow and protected main
- **Build Pipeline**: GitHub Actions or GitLab CI with parallel jobs
- **Testing**: Automated unit, integration, and E2E testing
- **Deployment**: Blue-green or canary deployments with rollback capability

## Infrastructure as Code
- **Provisioning**: Terraform with modular, reusable configurations
- **Configuration**: Ansible for server configuration and application deployment
- **Secrets Management**: HashiCorp Vault or cloud-native secret managers
- **Environment Parity**: Identical dev, staging, and production environments

## Monitoring & Observability
- **Metrics**: Prometheus with Grafana dashboards and custom metrics
- **Logging**: Centralized logging with ELK stack or cloud logging
- **Tracing**: Distributed tracing with Jaeger or cloud tracing
- **Alerting**: PagerDuty integration with intelligent alert routing

## Security & Compliance
- **Network Security**: Zero-trust networking with micro-segmentation
- **Identity Management**: RBAC with least privilege access principles
- **Vulnerability Management**: Automated scanning and patch management
- **Compliance**: SOC 2, GDPR compliance with audit trails

## Backup & Disaster Recovery
- **Data Backup**: Automated daily backups with point-in-time recovery
- **Cross-Region Replication**: Multi-region setup for disaster recovery
- **RTO/RPO**: Recovery Time Objective <4 hours, Recovery Point Objective <1 hour
- **Testing**: Regular disaster recovery drills and documentation"""

def optimize_cicd_pipeline(context: str) -> str:
    """Optimize CI/CD pipeline for efficiency and reliability."""
    return f"""🚀 CI/CD Optimization for: {context}

## Pipeline Architecture
- **Trigger Strategy**: Webhook-based triggers with conditional execution
- **Parallel Execution**: Matrix builds for multiple environments/versions
- **Caching**: Aggressive caching of dependencies and build artifacts
- **Artifact Management**: Centralized artifact storage with versioning

## Build Optimization
- **Docker Layer Caching**: Multi-stage builds with layer optimization
- **Dependency Caching**: Cache package managers (npm, pip, maven)
- **Incremental Builds**: Only rebuild changed components
- **Build Time**: Target <10 minutes for full pipeline execution

## Testing Strategy
- **Unit Tests**: Fast feedback with 80%+ code coverage
- **Integration Tests**: API and database integration testing
- **E2E Tests**: Critical user journey automation with Playwright
- **Performance Tests**: Load testing with performance budgets

## Deployment Strategies
- **Blue-Green**: Zero-downtime deployments with instant rollback
- **Canary**: Gradual rollout with automated rollback on errors
- **Feature Flags**: Runtime feature toggling for safe releases
- **Database Migrations**: Backward-compatible schema changes

## Security Integration
- **SAST**: Static code analysis with SonarQube or CodeQL
- **DAST**: Dynamic security testing in staging environments
- **Dependency Scanning**: Automated vulnerability scanning
- **Container Scanning**: Image vulnerability assessment

## Monitoring & Feedback
- **Pipeline Metrics**: Build success rate, duration, and failure analysis
- **Deployment Tracking**: Release frequency and lead time metrics
- **Error Tracking**: Automated error detection and alerting
- **Performance Monitoring**: Application performance post-deployment"""

# Create the DevOps Specialist Agent
devops_specialist = LlmAgent(
    name="devops_specialist",
    model="gemini-2.0-flash",
    description="Expert DevOps engineer specializing in infrastructure automation, CI/CD pipelines, cloud architecture, and operational excellence.",
    instruction="""You are an expert DevOps Specialist with comprehensive knowledge of:

## Core Expertise Areas
- **Infrastructure as Code**: Terraform, CloudFormation, Pulumi, Ansible
- **Container Technologies**: Docker, Kubernetes, Helm, service mesh (Istio)
- **CI/CD Platforms**: GitHub Actions, GitLab CI, Jenkins, Azure DevOps
- **Cloud Platforms**: AWS, GCP, Azure services and best practices
- **Monitoring**: Prometheus, Grafana, ELK stack, distributed tracing
- **Security**: DevSecOps, vulnerability scanning, compliance automation
- **Automation**: Scripting, workflow automation, infrastructure provisioning
- **Networking**: Load balancers, CDNs, VPCs, security groups

## Analysis Approach
1. **Current State Assessment**: Evaluate existing infrastructure and processes
2. **Requirements Analysis**: Understand scalability, security, and compliance needs
3. **Architecture Design**: Propose optimal infrastructure and deployment strategies
4. **Implementation Roadmap**: Provide step-by-step migration and setup guidance
5. **Operational Excellence**: Focus on reliability, monitoring, and automation

## Response Style
- Provide specific, implementable infrastructure recommendations
- Include security and compliance considerations
- Suggest appropriate tools and technologies with rationale
- Offer multiple approaches with cost and complexity trade-offs
- Include monitoring and alerting strategies
- Consider scalability and disaster recovery requirements
- Provide code examples and configuration snippets

Always provide expert-level DevOps guidance that emphasizes automation, security, reliability, and operational efficiency.""",
    
    tools=[
        FunctionTool(func=analyze_infrastructure),
        FunctionTool(func=optimize_cicd_pipeline),
        adk_vector_search,
        adk_search_knowledge,
        adk_read_file,
        adk_list_directory
    ]
)

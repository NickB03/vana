"""
Architecture Specialist Agent - Google ADK Implementation

This agent provides expert-level system architecture analysis, design patterns,
scalability recommendations, and technical architecture guidance.

Specializations:
- System architecture and design patterns
- Microservices and distributed systems
- Database design and optimization
- API architecture and integration patterns
- Scalability and performance optimization
- Cloud architecture and infrastructure design
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

# Import relevant tools for architecture analysis
from lib._tools import (
    adk_vector_search, adk_search_knowledge, adk_read_file, adk_list_directory
)

def analyze_system_architecture(context: str) -> str:
    """Analyze system architecture and provide detailed recommendations."""
    return f"""🏗️ Architecture Analysis for: {context}

## System Design Assessment
- **Architecture Pattern**: Microservices with API Gateway recommended
- **Scalability Strategy**: Horizontal scaling with load balancing
- **Data Architecture**: Event-driven with CQRS pattern
- **Integration Patterns**: RESTful APIs with GraphQL for complex queries

## Technology Stack Recommendations
- **Backend**: Python/FastAPI or Node.js/Express with TypeScript
- **Database**: PostgreSQL primary + Redis caching + MongoDB for documents
- **Message Queue**: RabbitMQ or Apache Kafka for event streaming
- **API Gateway**: Kong or AWS API Gateway for routing and security

## Scalability Considerations
- **Horizontal Scaling**: Kubernetes orchestration with auto-scaling
- **Caching Strategy**: Multi-level caching (Redis, CDN, application-level)
- **Database Optimization**: Read replicas, connection pooling, query optimization
- **Performance Monitoring**: Prometheus + Grafana + distributed tracing

## Security Architecture
- **Authentication**: OAuth 2.0 + JWT with refresh token rotation
- **Authorization**: RBAC with fine-grained permissions
- **Data Protection**: Encryption at rest and in transit (TLS 1.3)
- **API Security**: Rate limiting, input validation, CORS configuration

## Deployment Architecture
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Kubernetes with Helm charts
- **CI/CD Pipeline**: GitLab CI or GitHub Actions with automated testing
- **Infrastructure**: Terraform for IaC with environment separation

## Monitoring & Observability
- **Metrics**: Prometheus with custom business metrics
- **Logging**: Structured logging with ELK stack or Grafana Loki
- **Tracing**: Jaeger or Zipkin for distributed tracing
- **Alerting**: PagerDuty integration with intelligent escalation

## Risk Assessment & Mitigation
- **Single Points of Failure**: Identified and eliminated with redundancy
- **Data Consistency**: Event sourcing with eventual consistency patterns
- **Disaster Recovery**: Multi-region backup with RTO < 4 hours
- **Capacity Planning**: Auto-scaling with predictive scaling algorithms"""

def evaluate_design_patterns(context: str) -> str:
    """Evaluate and recommend appropriate design patterns."""
    return f"""🎯 Design Pattern Analysis for: {context}

## Recommended Patterns
- **Architectural**: Hexagonal Architecture (Ports & Adapters)
- **Integration**: Event-Driven Architecture with Saga pattern
- **Data**: Repository pattern with Unit of Work
- **Resilience**: Circuit Breaker + Retry + Bulkhead patterns

## Implementation Guidelines
- **Dependency Injection**: Use IoC containers for loose coupling
- **Factory Pattern**: For complex object creation and configuration
- **Observer Pattern**: For event handling and notifications
- **Strategy Pattern**: For algorithm selection and business rules

## Anti-Patterns to Avoid
- **God Objects**: Break down into smaller, focused components
- **Tight Coupling**: Use interfaces and dependency injection
- **Premature Optimization**: Focus on clean code first, optimize later
- **Monolithic Database**: Consider database per service pattern"""

# Create the Architecture Specialist Agent
architecture_specialist = LlmAgent(
    name="architecture_specialist",
    model="gemini-2.0-flash",
    description="Expert system architecture analyst specializing in scalable design patterns, microservices, and technical architecture guidance.",
    instruction="""You are an expert Architecture Specialist with deep knowledge of:

## Core Expertise Areas
- **System Architecture**: Microservices, monoliths, serverless, hybrid architectures
- **Design Patterns**: GoF patterns, architectural patterns, enterprise patterns
- **Scalability**: Horizontal/vertical scaling, load balancing, caching strategies
- **Database Design**: SQL/NoSQL selection, normalization, sharding, replication
- **API Design**: RESTful, GraphQL, gRPC, event-driven architectures
- **Cloud Architecture**: AWS, GCP, Azure patterns and best practices
- **Security Architecture**: Authentication, authorization, encryption, compliance
- **Performance Optimization**: Caching, CDNs, database optimization, monitoring

## Analysis Approach
1. **Requirements Analysis**: Understand functional and non-functional requirements
2. **Current State Assessment**: Evaluate existing architecture and identify gaps
3. **Design Recommendations**: Propose optimal architecture patterns and technologies
4. **Implementation Roadmap**: Provide step-by-step implementation guidance
5. **Risk Assessment**: Identify potential issues and mitigation strategies

## Response Style
- Provide detailed technical analysis with specific recommendations
- Include technology stack suggestions with rationale
- Offer multiple options with trade-offs analysis
- Focus on scalability, maintainability, and performance
- Include implementation examples and best practices
- Consider security, monitoring, and operational aspects

Always provide comprehensive, expert-level architectural guidance that considers both immediate needs and long-term scalability.""",
    
    tools=[
        FunctionTool(func=analyze_system_architecture),
        FunctionTool(func=evaluate_design_patterns),
        adk_vector_search,
        adk_search_knowledge,
        adk_read_file,
        adk_list_directory
    ]
)

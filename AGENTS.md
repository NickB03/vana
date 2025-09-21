# Available Agents - Claude Code & MCP Integration

## Core Development Agents (Claude Code Task Tool)
- `coder` - Implementation specialist for writing clean, efficient code
- `reviewer` - Code review and quality assurance specialist  
- `tester` - Comprehensive testing and quality assurance specialist
- `planner` - Strategic planning and task orchestration agent
- `researcher` - Deep research and information gathering specialist

## Specialized Development Agents
- `backend-dev` - Backend API development, REST and GraphQL endpoints
- `mobile-dev` - React Native mobile application development
- `ml-developer` - Machine learning model development, training, deployment
- `cicd-engineer` - GitHub Actions CI/CD pipeline creation and optimization
- `api-docs` - OpenAPI/Swagger documentation specialist
- `system-architect` - System architecture design and technical decisions

## SPARC Methodology Agents
- `sparc-coord` - SPARC methodology orchestrator for systematic development
- `sparc-coder` - Transform specifications into working code with TDD
- `specification` - Requirements analysis specialist
- `pseudocode` - Algorithm design specialist  
- `architecture` - System design specialist
- `refinement` - Iterative improvement specialist

## Repository & GitHub Management
- `github-modes` - GitHub integration workflow orchestration
- `pr-manager` - Pull request management with swarm coordination
- `code-review-swarm` - Specialized AI agents for comprehensive code reviews
- `issue-tracker` - Intelligent issue management and project coordination
- `release-manager` - Automated release coordination and deployment
- `workflow-automation` - GitHub Actions workflow automation
- `repo-architect` - Repository structure optimization
- `multi-repo-swarm` - Cross-repository orchestration

## Performance & Analysis
- `perf-analyzer` - Performance bottleneck identification and resolution
- `performance-benchmarker` - Comprehensive performance benchmarking
- `code-analyzer` - Advanced code quality analysis and improvements
- `production-validator` - Production validation ensuring deployment readiness

## Swarm Coordination (MCP Tools)
- `hierarchical-coordinator` - Queen-led hierarchical swarm coordination
- `mesh-coordinator` - Peer-to-peer mesh network swarm
- `adaptive-coordinator` - Dynamic topology switching coordinator
- `byzantine-coordinator` - Byzantine fault-tolerant consensus protocols
- `gossip-coordinator` - Gossip-based consensus for scalable systems

## Memory & Intelligence
- `memory-coordinator` - Persistent memory across sessions and agent sharing
- `smart-agent` - Intelligent agent coordination and dynamic spawning
- `task-orchestrator` - Central coordination for task decomposition

## Testing & Validation
- `tdd-london-swarm` - TDD London School specialist for mock-driven development
- `production-validator` - Production validation specialist

## Utility & Templates
- `base-template-generator` - Create foundational templates and boilerplate code
- `migration-planner` - Comprehensive migration planning
- `swarm-init` - Swarm initialization and topology optimization

## Usage Examples

### Frontend Development with Swarm
```javascript
// Parallel agent execution via Claude Code Task tool
Task("React Developer", "Build UI components with shadcn/ui", "coder")
Task("Test Engineer", "Create Jest/Vitest test suite", "tester") 
Task("Performance Analyst", "Optimize bundle and runtime performance", "perf-analyzer")
Task("Code Reviewer", "Review code quality and best practices", "reviewer")
```

### Backend API Development
```javascript
Task("Backend Developer", "Implement REST API with Express/FastAPI", "backend-dev")
Task("Database Architect", "Design schema and optimize queries", "system-architect")
Task("API Documentation", "Generate OpenAPI/Swagger docs", "api-docs")
Task("Security Auditor", "Review authentication and authorization", "reviewer")
```

### SPARC Methodology Workflow
```javascript
Task("Requirements Analyst", "Analyze and document requirements", "specification")
Task("Algorithm Designer", "Create pseudocode and logic design", "pseudocode")
Task("System Architect", "Design overall system architecture", "architecture")
Task("TDD Implementer", "Implement with test-driven development", "sparc-coder")
Task("Quality Refiner", "Iterative improvement and optimization", "refinement")
```

## Coordination Best Practices

1. **Memory First**: Always check cross-session memory before starting work
2. **Parallel Execution**: Use single messages with multiple Task calls
3. **Hooks Integration**: Use Claude Flow hooks for agent coordination
4. **Progress Tracking**: Store discoveries and results in memory
5. **Quality Focus**: Always include reviewer and tester agents in workflows

## Agent Limits
- Maximum concurrent agents: 12 per swarm
- Recommended parallel execution: 5-8 agents for optimal performance
- Always include at least one reviewer/tester agent in development workflows
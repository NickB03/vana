# ADK Memory Integration Test Suite

This comprehensive test suite validates the migration from VANA's custom knowledge graph to Google ADK's native memory systems. The test suite covers unit tests, integration tests, and performance benchmarks to ensure the ADK memory integration meets all requirements.

## 📋 Test Suite Overview

### Test Structure
```
tests/adk_memory/
├── unit/                    # Unit tests for individual components
├── integration/             # Integration tests for component interactions  
├── performance/             # Performance tests and benchmarks
├── conftest.py             # Shared fixtures and configuration
└── README.md               # This documentation
```

### Test Categories

#### 🔧 Unit Tests (15+ test files)
- **VanaMemoryService**: Core memory service functionality
- **ADK Session Management**: Session state and lifecycle management
- **Load Memory Tool**: Memory search and retrieval tool
- **Document Processing**: Document migration and processing
- **Configuration Management**: Service configuration and validation
- **Error Handling**: Exception handling and fallback mechanisms

#### 🔗 Integration Tests (10+ test files)
- **Hybrid Search Integration**: ADK memory + vector search + web search
- **Agent-Memory Integration**: Agent interaction with memory systems
- **Session State Persistence**: Cross-session data sharing
- **Multi-Agent Coordination**: Agent communication through memory
- **Tool Context Integration**: Memory access from custom tools

#### ⚡ Performance Tests (8+ test files)
- **Benchmark Comparisons**: ADK memory vs custom knowledge graph
- **Load Testing**: System performance under various load conditions
- **Scalability Testing**: Performance with increasing data volumes
- **Memory Usage Analysis**: Resource utilization optimization
- **Cost Analysis**: Performance per cost metrics

## 🚀 Quick Start

### Prerequisites
```bash
# Install test dependencies
pip install pytest pytest-asyncio psutil

# Install ADK memory dependencies
pip install google-adk[vertexai]

# Set environment variables
export RAG_CORPUS_RESOURCE_NAME="projects/analystai-454200/locations/us-central1/ragCorpora/test-corpus"
export SIMILARITY_TOP_K=5
export VECTOR_DISTANCE_THRESHOLD=0.7
```

### Running Tests

#### Run All ADK Memory Tests
```bash
# From project root
pytest tests/adk_memory/ -v

# With coverage
pytest tests/adk_memory/ --cov=vana_multi_agent.memory --cov-report=html
```

#### Run Specific Test Categories
```bash
# Unit tests only
pytest tests/adk_memory/unit/ -v

# Integration tests only
pytest tests/adk_memory/integration/ -v

# Performance tests only
pytest tests/adk_memory/performance/ -v
```

## 📊 Performance Targets

### Latency Requirements
- **Simple queries**: < 200ms average, < 500ms P95
- **Medium queries**: < 500ms average, < 1000ms P95
- **Complex queries**: < 1000ms average, < 2000ms P95

### Throughput Requirements
- **Minimum**: 50 requests/second sustained
- **Target**: 100+ requests/second sustained
- **Peak**: 200+ requests/second for short bursts

### Reliability Requirements
- **Error rate**: < 1% under normal load
- **Availability**: > 99.9% uptime
- **Recovery time**: < 30 seconds from failures

### Resource Efficiency
- **Memory usage**: < 512MB for typical workloads
- **CPU utilization**: < 70% under normal load
- **Cost efficiency**: 50%+ reduction vs custom KG

## 🎯 Success Criteria

### Test Coverage
- **Unit tests**: 95%+ code coverage
- **Integration tests**: All major workflows covered
- **Performance tests**: All performance targets validated

### Test Quality
- **Reliability**: Tests pass consistently (>99% success rate)
- **Speed**: Test suite completes in <10 minutes
- **Maintainability**: Tests are easy to understand and modify

### Performance Validation
- **Latency**: ADK memory 2x+ faster than custom KG
- **Throughput**: 50+ RPS sustained performance
- **Scalability**: Linear performance scaling with load
- **Resource efficiency**: 50%+ reduction in resource usage

---

**Note**: This test suite is designed to validate the ADK memory migration. All tests use mocks and simulated data to ensure consistent, reproducible results without depending on external services during development and CI/CD execution.

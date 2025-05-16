# Changelog

All notable changes to the VANA project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Vector Search Health Monitoring System
  - Comprehensive health checker for Vector Search
  - Circuit breaker pattern for error resilience
  - Scheduled monitoring service with adaptive intervals
  - Dashboard integration with authentication and visualization
  - Data retention policies for historical data
  - Detailed metrics and trend analysis
  - Actionable recommendations for issues

## [1.2.0] - 2025-05-05

### Added
- Enhanced Vector Search Client
  - Added missing methods to VectorSearchClient class
  - Added SimpleMockVectorSearchClient for fallback
  - Added comprehensive documentation
  - Added test script for enhanced functionality

### Fixed
- Vector Search Authentication Issues
  - Fixed the "must be real number, not str" error with explicit type conversion
  - Added validation for embedding values
  - Enhanced error handling with fallback mechanisms
  - Added detailed logging for troubleshooting

## [1.1.0] - 2025-04-15

### Added
- Web Search Integration
  - Google Custom Search API integration
  - Configurable result count
  - Source attribution for web results
  - Error handling and fallback mechanisms

- Enhanced Hybrid Search
  - Multi-source search in parallel
  - Sophisticated result ranking
  - Source weighting and diversity
  - Query classification and preprocessing

### Changed
- Improved Knowledge Graph Integration
  - Enhanced entity extraction
  - Relationship inference
  - Entity linking with confidence scoring

## [1.0.0] - 2025-03-01

### Added
- Initial release of VANA
- Primary Agent (Vana) with specialist sub-agents
- Vertex AI Vector Search integration
- MCP Knowledge Graph integration
- ADK integration
- Context management system
- Team coordination system
- Testing framework with Juno agent

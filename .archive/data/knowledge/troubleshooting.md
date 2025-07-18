---
title: Troubleshooting
created: 2025-06-08T14:45:13.054668
source: vana_knowledge_base_creator
type: system_documentation
---

# VANA Troubleshooting Guide

## Common Issues

### Import Hanging Issues
- **Symptoms**: Python imports hang or timeout
- **Causes**: Heavy dependency chains, blocking authentication
- **Solutions**:
  - Recreate Poetry environment
  - Use lazy loading patterns
  - Check authentication configuration

### Memory Search Returns Fallback Results
- **Symptoms**: search_knowledge returns "fallback results"
- **Causes**: Empty RAG corpus, no populated content
- **Solutions**:
  - Run memory population script
  - Check ADK memory service configuration
  - Validate environment variables

### Tool Failures
- **Symptoms**: Tools return errors or empty results
- **Causes**: Missing API keys, configuration issues
- **Solutions**:
  - Check environment variables
  - Validate API key configuration
  - Test tool functionality individually

### Agent Coordination Issues
- **Symptoms**: Agents not sharing information properly
- **Causes**: Session state problems, coordination failures
- **Solutions**:
  - Debug session state content
  - Check agent coordination patterns
  - Validate session management

### Deployment Issues
- **Symptoms**: Cloud Run deployment failures
- **Causes**: Configuration errors, resource constraints
- **Solutions**:
  - Check environment variables
  - Validate resource allocation
  - Review deployment logs

## Environment Configuration

### Required Variables
```
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=960076421399
GOOGLE_CLOUD_LOCATION=us-central1
BRAVE_API_KEY=<your_brave_api_key>
```

### Development vs Production
- **Development**: Use vana-dev environment for testing
- **Production**: Deploy to vana-prod only after validation
- **Testing**: Use Playwright for comprehensive validation

## Debugging Steps
1. **Check Logs**: Review application and deployment logs
2. **Test Components**: Validate individual tools and agents
3. **Environment**: Verify all required variables are set
4. **Memory**: Check memory service availability and content
5. **Coordination**: Debug agent communication patterns

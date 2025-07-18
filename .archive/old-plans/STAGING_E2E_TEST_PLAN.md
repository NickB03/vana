# VANA Staging End-to-End Test Plan

## 🎯 Test Objectives

Validate that VANA staging deployment with ADK events provides:
1. **Silent agent handoffs** - No transfer messages visible to users
2. **Real-time progress tracking** - Activity shown in thinking panel
3. **Specialist activation** - Appropriate specialists invoked for queries
4. **Production-ready performance** - <2s response times, <100ms event processing

## 📋 Pre-Test Setup

### 1. Environment Validation
```bash
# Verify production features enabled
grep "USE_ADK_EVENTS=true" .env
grep "VANA_MODEL=gemini-2.0-flash" .env
grep "VANA_ENABLE_SPECIALISTS=true" .env

# Check API key configured
echo $GOOGLE_API_KEY | cut -c1-10  # First 10 chars only
```

### 2. Staging Deployment
```bash
# Build staging image
docker build -t vana:staging .

# Run staging container
docker run -d \
  --name vana-staging \
  -p 8082:8081 \
  --env-file .env \
  -e NODE_ENV=staging \
  vana:staging

# Verify container health
curl http://localhost:8082/health
```

### 3. Frontend Setup
```bash
cd vana-ui
npm run build
npm run preview -- --port 5174 --host
```

## 🧪 Core Test Scenarios

### Test 1: Silent Agent Handoffs ⭐ CRITICAL
**Objective**: Verify no transfer messages appear in chat

**Test Cases**:
1. **Security Query**: "What security vulnerabilities should I check?"
   - Expected: Security specialist activated silently
   - Validate: No "Transferring to security specialist" message
   - Monitor: ThinkingPanel shows specialist activity

2. **Data Analysis Request**: "Analyze trends in our user data"
   - Expected: Data science specialist activated
   - Validate: Clean response without routing messages
   - Monitor: Real-time events in thinking panel

3. **Architecture Review**: "Review my React component architecture"
   - Expected: Architecture specialist invoked
   - Validate: Professional response without transfer details
   - Monitor: Specialist reasoning visible in thinking panel

**Success Criteria**:
- ✅ 0% transfer messages visible in chat
- ✅ Appropriate specialists activated (check logs)
- ✅ ThinkingPanel shows real agent activity

### Test 2: Real-Time Event Streaming
**Objective**: Validate ADK event streaming functionality

**Test Cases**:
1. **Long Processing Query**: "Generate a comprehensive security audit report"
   - Monitor: Real-time progress updates in thinking panel
   - Validate: Streaming events show specialist work
   - Check: No UI freezing during processing

2. **Multi-Specialist Coordination**: "Review security and performance of my API"
   - Expected: Multiple specialists coordinated
   - Monitor: Handoff events in thinking panel
   - Validate: Seamless coordination without user-visible transfers

**Success Criteria**:
- ✅ Real-time event streaming active
- ✅ Progress visible throughout processing
- ✅ No UI blocking during long operations

### Test 3: Specialist Activation Matrix
**Objective**: Ensure correct specialist routing

| Query Type | Expected Specialist | Test Query |
|------------|-------------------|------------|
| Security | Security Specialist | "Scan for SQL injection vulnerabilities" |
| Data Analysis | Data Science | "Calculate correlation between user engagement and retention" |
| Architecture | Architecture | "Refactor this component for better performance" |
| DevOps | DevOps | "Set up CI/CD pipeline for this project" |
| QA | QA | "Generate comprehensive test suite" |
| UI/UX | UI/UX | "Design a modern dashboard component" |

**Success Criteria**:
- ✅ 90%+ correct specialist activation
- ✅ No routing errors or fallbacks
- ✅ Specialists provide domain-specific responses

### Test 4: Performance Benchmarks
**Objective**: Validate production-ready performance

**Metrics to Track**:
- Response initiation: <500ms
- Event processing: <100ms per event
- Total response time: <2s for simple queries
- Memory usage: <500MB stable
- CPU usage: <50% during processing

**Test Queries**:
1. Simple: "Hello, how are you?"
2. Medium: "Explain React hooks"
3. Complex: "Full security audit with recommendations"

**Success Criteria**:
- ✅ All performance targets met
- ✅ No memory leaks after 10 queries
- ✅ Consistent response times

### Test 5: Error Handling & Fallbacks
**Objective**: Validate graceful degradation

**Test Cases**:
1. **Invalid API Key**: Temporarily set wrong key
   - Expected: Graceful error message
   - Validate: No system crash
   
2. **Specialist Failure**: Simulate specialist timeout
   - Expected: Fallback to general agent
   - Validate: User gets helpful response

3. **Network Issues**: Simulate connection problems
   - Expected: Retry logic activates
   - Validate: User informed of delays

**Success Criteria**:
- ✅ No system crashes
- ✅ User-friendly error messages
- ✅ Automatic recovery when possible

## 🔍 Technical Validation

### ADK Integration Checks
```bash
# Verify ADK events in logs
docker logs vana-staging | grep "ADK Event"
docker logs vana-staging | grep "Enhanced pattern matching"
docker logs vana-staging | grep "Transfer message filtered"

# Check event streaming endpoint
curl -H "Accept: text/event-stream" \
  "http://localhost:8082/stream_agent_response" \
  -d '{"message": "test security review"}'
```

### Memory System Validation
```bash
# Verify memory service active
docker logs vana-staging | grep "Memory service initialized"

# Check no MCP conflicts in production
docker logs vana-staging | grep -i "mcp" | wc -l  # Should be 0
```

## 📊 Test Execution Framework

### Automated Test Runner
```bash
#!/bin/bash
# run_e2e_tests.sh

echo "🚀 VANA Staging E2E Test Execution"
echo "================================="

# Pre-flight checks
./scripts/validate-env.sh

# Start services
docker-compose -f docker-compose.staging.yml up -d

# Wait for health check
sleep 10
curl -f http://localhost:8082/health || exit 1

# Execute test scenarios
echo "✅ Running Test 1: Silent Handoffs"
python tests/e2e/test_silent_handoffs.py

echo "✅ Running Test 2: Event Streaming"
python tests/e2e/test_event_streaming.py

echo "✅ Running Test 3: Specialist Matrix"
python tests/e2e/test_specialist_routing.py

echo "✅ Running Test 4: Performance"
python tests/e2e/test_performance.py

echo "✅ Running Test 5: Error Handling"
python tests/e2e/test_error_handling.py

# Generate report
python tests/e2e/generate_report.py
```

### Manual Testing Checklist

#### Before Testing
- [ ] Production features enabled (`USE_ADK_EVENTS=true`)
- [ ] Staging container running on port 8082
- [ ] Frontend accessible on port 5174
- [ ] API key configured and valid
- [ ] Browser developer tools open for monitoring

#### During Testing
- [ ] Network tab shows SSE connections
- [ ] Console shows no JavaScript errors
- [ ] ThinkingPanel displays real-time events
- [ ] No transfer messages in chat interface
- [ ] Response times under 2 seconds

#### After Testing
- [ ] Docker logs reviewed for errors
- [ ] Performance metrics collected
- [ ] All test scenarios documented
- [ ] Issues logged with reproduction steps

## 🎯 Success Criteria Summary

**Must Pass (Blocking)**:
- ✅ 0% transfer messages visible to users
- ✅ ADK event streaming functional
- ✅ All 6 specialists activate correctly
- ✅ Performance targets met
- ✅ No critical errors in logs

**Should Pass (Non-blocking)**:
- ✅ Error handling graceful
- ✅ Memory usage optimized
- ✅ UI responsive throughout
- ✅ Logs clean and informative

## 🚀 Deployment Approval

Upon successful completion of all tests:

1. **Tag successful build**:
   ```bash
   docker tag vana:staging vana:prod-ready
   ```

2. **Document results**:
   - Update PRODUCTION_READY.md with test results
   - Create deployment approval ticket
   - Notify stakeholders of staging validation

3. **Prepare production deployment**:
   - Configure production secrets
   - Set up monitoring and alerting
   - Schedule deployment window

---

**Next Steps**: Execute this test plan on staging environment to validate production readiness.
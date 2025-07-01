# OpenWebUI Integration Implementation Plan

## Executive Summary
This plan addresses the issues found in Cline's OpenWebUI implementation and provides a step-by-step approach to successfully integrate OpenWebUI with VANA using proper API patterns and error handling.

## Critical Issues Identified
1. **Container Hostname Mismatch**: Adapter references `vana-orchestrator` but container is named `vana-orchestrator-local`
2. **Non-existent Endpoint**: VANA doesn't expose `/execute` endpoint - it uses Google ADK's standard endpoints
3. **No Error Handling**: Adapter lacks connection error handling and logging
4. **Oversimplified Streaming**: Current implementation doesn't properly format OpenAI-compatible SSE responses
5. **No Session Management**: No way to maintain conversation context across requests

## Implementation Strategy

### Phase 1: Immediate Fixes (30 minutes)

#### 1.1 Fix Container Communication
```python
# vana-api-adapter/main.py line 9
# Change from:
VANA_ORCHESTRATOR_URL = "http://vana-orchestrator:8080/execute"
# To:
VANA_ORCHESTRATOR_URL = "http://vana-orchestrator-local:8080/chat"
```

#### 1.2 Add Chat Endpoint to VANA
Add after line 183 in main.py:
```python
@app.post("/chat")
async def chat_endpoint(request: dict):
    """Handle chat requests from the API adapter"""
    from agents.vana import agent as vana_agent
    from google.adk.session import Session
    
    try:
        # Extract message from request
        message = request.get("message", "")
        session_id = request.get("session_id", "default")
        
        # Create or retrieve session
        session = Session(id=session_id)
        
        # Execute agent
        response = await vana_agent.run(session, message)
        
        return {
            "success": True,
            "response": response,
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        return {"success": False, "error": str(e)}
```

#### 1.3 Improve Adapter Error Handling
Replace vana-api-adapter/main.py with:
```python
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
import requests
import json
import logging
from typing import AsyncGenerator

app = FastAPI()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

VANA_ORCHESTRATOR_URL = "http://vana-orchestrator-local:8080/chat"

@app.post("/v1/chat/completions")
async def chat_completions(request: dict):
    try:
        # Extract user's prompt
        messages = request.get("messages", [])
        if not messages:
            raise HTTPException(400, "No messages provided")
        
        user_prompt = messages[-1].get("content", "")
        stream = request.get("stream", False)
        
        # Prepare VANA request
        vana_request = {
            "message": user_prompt,
            "session_id": request.get("session_id", "default")
        }
        
        if stream:
            return StreamingResponse(
                stream_vana_response(vana_request),
                media_type="text/event-stream"
            )
        else:
            # Non-streaming response
            response = requests.post(VANA_ORCHESTRATOR_URL, json=vana_request)
            response.raise_for_status()
            
            vana_data = response.json()
            if not vana_data.get("success"):
                raise HTTPException(500, vana_data.get("error", "Unknown error"))
            
            return {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": vana_data["response"]
                    },
                    "finish_reason": "stop"
                }],
                "model": "vana-orchestrator"
            }
            
    except requests.exceptions.ConnectionError:
        logger.error("Failed to connect to VANA orchestrator")
        raise HTTPException(503, "VANA orchestrator unavailable")
    except Exception as e:
        logger.error(f"Chat completion error: {e}")
        raise HTTPException(500, str(e))

async def stream_vana_response(vana_request: dict) -> AsyncGenerator[str, None]:
    try:
        # For MVP, we'll use non-streaming and simulate streaming
        response = requests.post(VANA_ORCHESTRATOR_URL, json=vana_request)
        response.raise_for_status()
        
        vana_data = response.json()
        if not vana_data.get("success"):
            yield f"data: {json.dumps({'error': vana_data.get('error')})}\n\n"
            return
        
        # Simulate streaming by chunking the response
        content = vana_data["response"]
        chunk_size = 20  # characters per chunk
        
        for i in range(0, len(content), chunk_size):
            chunk = content[i:i + chunk_size]
            response_chunk = {
                "choices": [{
                    "delta": {
                        "content": chunk
                    },
                    "index": 0
                }],
                "model": "vana-orchestrator"
            }
            yield f"data: {json.dumps(response_chunk)}\n\n"
        
        # Send completion chunk
        yield f"data: {json.dumps({'choices': [{'delta': {}, 'finish_reason': 'stop'}]})}\n\n"
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check VANA connectivity
        response = requests.get(f"{VANA_ORCHESTRATOR_URL.replace('/chat', '/health')}")
        vana_healthy = response.status_code == 200
    except:
        vana_healthy = False
    
    return {
        "status": "healthy" if vana_healthy else "degraded",
        "vana_connected": vana_healthy
    }
```

### Phase 2: Proper Integration (1-2 hours)

#### 2.1 Research ADK Session Management
1. Use context7 to search: "Google ADK session management FastAPI"
2. Find documentation on:
   - How ADK manages agent sessions
   - Proper way to interact with ADK agents via API
   - Session persistence and context management

#### 2.2 Implement Session-Based Chat
Based on ADK research, implement proper session handling:
- Create session manager in VANA
- Store conversation history
- Handle multi-turn conversations properly
- Implement proper tool execution feedback

#### 2.3 Implement True Streaming
Research and implement:
- ADK's streaming response mechanism
- Proper SSE formatting for OpenAI compatibility
- Real-time token streaming from VANA

### Phase 3: Testing Strategy (1 hour)

#### 3.1 Component Testing
1. **Test VANA Standalone**
   ```bash
   # Start only VANA
   docker compose -f docker-compose.local.yml up vana-orchestrator -d
   
   # Test chat endpoint
   curl -X POST http://localhost:8081/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello, VANA!", "session_id": "test-123"}'
   ```

2. **Test Adapter Standalone**
   ```bash
   # Start adapter with mock VANA
   cd vana-api-adapter
   python main.py
   
   # Test OpenAI-compatible endpoint
   curl -X POST http://localhost:8080/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"messages": [{"role": "user", "content": "Hello"}], "stream": false}'
   ```

3. **Test Full Integration**
   ```bash
   # Start all services
   docker compose -f docker-compose.local.yml up -d
   
   # Test through OpenWebUI
   # Navigate to http://localhost:3000
   ```

### Phase 4: Production Enhancements (Optional)

#### 4.1 Add Comprehensive Features
- Rate limiting with Redis
- Request/response logging
- Metrics collection (Prometheus)
- Authentication/authorization
- Multi-model support

#### 4.2 Performance Optimizations
- Connection pooling
- Response caching
- Async request handling
- Load balancing

## Implementation Order

1. **Immediate Priority** (Do first after /clear):
   - Fix container hostname (5 min)
   - Add basic /chat endpoint to VANA (15 min)
   - Update adapter with error handling (10 min)
   - Test basic connectivity (10 min)

2. **Secondary Priority** (After basic connectivity works):
   - Research ADK documentation (30 min)
   - Implement proper session management (45 min)
   - Add streaming support (30 min)

3. **Final Priority** (After everything works):
   - Add monitoring and logging
   - Performance optimization
   - Documentation

## Success Criteria

- [ ] VANA responds to chat requests via new endpoint
- [ ] Adapter successfully translates OpenAI API to VANA
- [ ] OpenWebUI can connect and chat with VANA
- [ ] Error handling prevents cascading failures
- [ ] All three containers start without errors
- [ ] Basic conversation flow works end-to-end

## Risk Mitigation

1. **If ADK doesn't support custom endpoints**: 
   - Implement MCP client in adapter
   - Use ADK's web UI API endpoints

2. **If streaming is too complex**:
   - Start with non-streaming responses
   - Add streaming in later iteration

3. **If session management is problematic**:
   - Use stateless requests initially
   - Add session support incrementally

## Notes for Implementation

- Always test each component individually before integration
- Use docker logs to debug container issues
- Keep the initial implementation simple - avoid over-engineering
- Document any deviations from this plan
- Prioritize getting a working MVP over perfect implementation

This plan provides a clear path to successful OpenWebUI integration while addressing all identified issues systematically.
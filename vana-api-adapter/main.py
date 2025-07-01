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
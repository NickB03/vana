import os
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import logging

# Import the VANA agent
from agents.vana.team import root_agent

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Load API_KEY as environment variable:
app.add_event_handler("startup", lambda: os.environ.setdefault("VITE_API_KEY", "secret-dev-vana-123"))

# Enhanced CORS Configuration
app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5177"],
  allow_credentials=True,
  allow_methods=["GET", "POST", "OPTIONS"],
  allow_headers=["Content-Type", "Authorization"]
)

# OPTIONS Preflight Handler
@app.middleware("http")
async def preflight_handler(request: Request, call_next):
    if request.method == "OPTIONS":
        return Response("{'content': 'Preflight check successful'}", media_type='application/json', headers={
            "Access-Control-Allow-Origin": "http://localhost:5177",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true"
        })
    return await call_next(request)

# VANA Agent Endpoint - Process requests through the actual VANA orchestrator
@app.post("/run")
async def run_vana(request: Request) -> Dict[str, Any]:
    """Process user input through the VANA orchestrator agent."""
    try:
        # Get request data
        data = await request.json()
        user_input = data.get("input", "")
        
        if not user_input:
            raise HTTPException(status_code=400, detail="No input provided")
        
        logger.info(f"Processing request: {user_input[:50]}...")
        
        # Process through VANA agent
        try:
            # Use the agent's run method to process the input
            response = root_agent.run(user_input)
            
            # Extract the response text
            if hasattr(response, 'text'):
                output_text = response.text
            elif isinstance(response, str):
                output_text = response
            else:
                output_text = str(response)
            
            logger.info(f"Agent response: {output_text[:100]}...")
            
            # Return in the expected format
            return {
                "result": {
                    "output": output_text,
                    "id": f"vana_{os.getpid()}_{id(response)}"  # Generate unique session ID
                }
            }
            
        except Exception as agent_error:
            logger.error(f"Agent processing error: {agent_error}")
            # Fallback to a helpful error message
            return {
                "result": {
                    "output": f"I encountered an error processing your request: {str(agent_error)}. Please try again.",
                    "id": "error"
                }
            }
            
    except Exception as e:
        logger.error(f"Request handling error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Existing endpoints can remain here
@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    # Ensure proper port binding and logging
    uvicorn.run(app, host="0.0.0.0", port=8081, log_level="debug")

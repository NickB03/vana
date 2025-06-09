"""
WebUI Routes for VANA Dashboard
FastAPI routes for authentication and chat functionality
"""

import uuid
import json
import logging
import requests
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api", tags=["webui"])

# Security scheme
security = HTTPBearer(auto_error=False)

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    agent: str = "vana"
    sessionId: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class ChatResponse(BaseModel):
    messageId: str
    response: str
    sessionId: str
    status: str

class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    message: Optional[str] = None

# VANA Service Configuration
VANA_SERVICE_URL = "https://vana-prod-960076421399.us-central1.run.app"

# Simple authentication (for demo purposes)
DEMO_USERS = {
    "test@vana.ai": {
        "password": "test123",
        "name": "Test User",
        "role": "user"
    }
}

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify authentication token (simplified for demo)"""
    if token == "demo-token-12345":
        return {"email": "test@vana.ai", "name": "Test User", "role": "user"}
    return None

def get_current_user(request: Request, token: Optional[str] = Depends(security)):
    """Get current authenticated user"""
    if not token:
        return None
    
    user = verify_token(token.credentials if token else None)
    return user

@router.post("/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Authenticate user and return token"""
    try:
        user_data = DEMO_USERS.get(credentials.email)
        
        if not user_data or user_data["password"] != credentials.password:
            return LoginResponse(
                success=False,
                message="Invalid email or password"
            )
        
        # Generate simple token (in production, use proper JWT)
        token = "demo-token-12345"
        
        return LoginResponse(
            success=True,
            token=token,
            user={
                "email": credentials.email,
                "name": user_data["name"],
                "role": user_data["role"]
            },
            message="Login successful"
        )
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, current_user: Optional[Dict] = Depends(get_current_user)):
    """Handle chat requests to VANA service"""
    try:
        # Generate session ID if not provided
        session_id = request.sessionId or str(uuid.uuid4())
        message_id = str(uuid.uuid4())
        
        # Prepare payload for VANA service
        payload = {
            "appName": "vana-webui",
            "userId": current_user.get("email", "anonymous") if current_user else "anonymous",
            "sessionId": session_id,
            "newMessage": {
                "parts": [{"text": request.message}],
                "role": "user"
            },
            "streaming": False
        }
        
        # Send request to VANA service
        logger.info(f"Sending request to VANA service: {VANA_SERVICE_URL}")
        response = requests.post(
            f"{VANA_SERVICE_URL}/api/chat",
            json=payload,
            timeout=30,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            vana_response = response.json()
            
            # Extract response text from VANA response
            response_text = ""
            if "response" in vana_response:
                if isinstance(vana_response["response"], dict):
                    response_text = vana_response["response"].get("parts", [{}])[0].get("text", "")
                else:
                    response_text = str(vana_response["response"])
            elif "message" in vana_response:
                response_text = vana_response["message"]
            else:
                response_text = "Response received from VANA"
            
            return ChatResponse(
                messageId=message_id,
                response=response_text,
                sessionId=session_id,
                status="sent"
            )
        else:
            logger.error(f"VANA service error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=502,
                detail=f"VANA service error: {response.status_code}"
            )
            
    except requests.exceptions.Timeout:
        logger.error("VANA service timeout")
        raise HTTPException(status_code=504, detail="VANA service timeout")
    except requests.exceptions.RequestException as e:
        logger.error(f"VANA service connection error: {e}")
        raise HTTPException(status_code=502, detail="Cannot connect to VANA service")
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/health")
async def webui_health():
    """WebUI health check endpoint"""
    try:
        # Test connection to VANA service
        response = requests.get(f"{VANA_SERVICE_URL}/health", timeout=10)
        vana_healthy = response.status_code == 200
        
        return {
            "service": "vana-webui-api",
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "vana_service": VANA_SERVICE_URL,
            "vana_healthy": vana_healthy
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "service": "vana-webui-api", 
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/user/profile")
async def get_user_profile(current_user: Dict = Depends(get_current_user)):
    """Get current user profile"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "user": current_user,
        "authenticated": True
    }

@router.post("/auth/logout")
async def logout():
    """Logout endpoint (token invalidation would happen here)"""
    return {"success": True, "message": "Logged out successfully"}

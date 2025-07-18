"""
API endpoints for VANA system
"""

from fastapi import APIRouter

# Create the main router
router = APIRouter()

@router.get("/status")
async def get_status():
    """Get API status"""
    return {"status": "active", "version": "2.0.0"}
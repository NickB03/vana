"""
Authentication Bridge for React-Streamlit Integration

This module provides authentication sharing between React WebUI and Streamlit dashboard,
enabling seamless single sign-on (SSO) across both interfaces.
"""

import jwt
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from flask import Blueprint, request, jsonify, session
import logging

logger = logging.getLogger(__name__)

# Create blueprint for auth bridge
auth_bridge_bp = Blueprint('auth_bridge', __name__, url_prefix='/api/auth')

# Configuration
JWT_SECRET_KEY = secrets.token_urlsafe(32)  # In production, use environment variable
JWT_ALGORITHM = 'HS256'
TOKEN_EXPIRY_HOURS = 24
STREAMLIT_SESSION_KEY = 'streamlit_auth_token'

class AuthBridge:
    """Authentication bridge between React and Streamlit"""
    
    def __init__(self, secret_key: str = None):
        self.secret_key = secret_key or JWT_SECRET_KEY
        self.algorithm = JWT_ALGORITHM
        self.token_expiry = timedelta(hours=TOKEN_EXPIRY_HOURS)
    
    def generate_token(self, user_data: Dict[str, Any]) -> str:
        """Generate JWT token for user"""
        try:
            payload = {
                'user_id': user_data.get('id', user_data.get('email')),
                'email': user_data.get('email'),
                'name': user_data.get('name'),
                'role': user_data.get('role', 'user'),
                'permissions': user_data.get('permissions', []),
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + self.token_expiry,
                'iss': 'vana-auth-bridge'
            }
            
            token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
            logger.info(f"Generated token for user: {user_data.get('email')}")
            return token
            
        except Exception as e:
            logger.error(f"Failed to generate token: {e}")
            raise
    
    def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate JWT token and return user data"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check if token is expired
            exp_timestamp = payload.get('exp')
            if exp_timestamp and datetime.fromtimestamp(exp_timestamp) < datetime.utcnow():
                logger.warning("Token has expired")
                return None
            
            logger.info(f"Validated token for user: {payload.get('email')}")
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None
    
    def refresh_token(self, token: str) -> Optional[str]:
        """Refresh an existing token"""
        try:
            # Validate current token
            payload = self.validate_token(token)
            if not payload:
                return None
            
            # Generate new token with same user data
            user_data = {
                'id': payload.get('user_id'),
                'email': payload.get('email'),
                'name': payload.get('name'),
                'role': payload.get('role'),
                'permissions': payload.get('permissions', [])
            }
            
            return self.generate_token(user_data)
            
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            return None
    
    def create_streamlit_session(self, token: str) -> Dict[str, Any]:
        """Create session data for Streamlit"""
        try:
            user_data = self.validate_token(token)
            if not user_data:
                return {"error": "Invalid token"}
            
            # Create session hash for Streamlit
            session_hash = hashlib.sha256(f"{token}{datetime.utcnow()}".encode()).hexdigest()[:16]
            
            streamlit_session = {
                'session_id': session_hash,
                'user_id': user_data.get('user_id'),
                'email': user_data.get('email'),
                'name': user_data.get('name'),
                'role': user_data.get('role'),
                'permissions': user_data.get('permissions', []),
                'authenticated': True,
                'auth_time': datetime.utcnow().isoformat(),
                'token': token
            }
            
            logger.info(f"Created Streamlit session for user: {user_data.get('email')}")
            return streamlit_session
            
        except Exception as e:
            logger.error(f"Failed to create Streamlit session: {e}")
            return {"error": str(e)}

# Initialize auth bridge
auth_bridge = AuthBridge()

@auth_bridge_bp.route('/generate-token', methods=['POST'])
def generate_auth_token():
    """Generate authentication token for user"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate required fields
        required_fields = ['email']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Generate token
        token = auth_bridge.generate_token(data)
        
        return jsonify({
            "success": True,
            "token": token,
            "expires_in": TOKEN_EXPIRY_HOURS * 3600,  # seconds
            "token_type": "Bearer"
        })
        
    except Exception as e:
        logger.error(f"Failed to generate token: {e}")
        return jsonify({"error": "Failed to generate token"}), 500

@auth_bridge_bp.route('/validate-token', methods=['POST'])
def validate_auth_token():
    """Validate authentication token"""
    try:
        data = request.get_json()
        token = data.get('token') if data else None
        
        if not token:
            # Try to get token from Authorization header
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({"error": "No token provided"}), 400
        
        # Validate token
        user_data = auth_bridge.validate_token(token)
        
        if user_data:
            return jsonify({
                "valid": True,
                "user": {
                    "id": user_data.get('user_id'),
                    "email": user_data.get('email'),
                    "name": user_data.get('name'),
                    "role": user_data.get('role'),
                    "permissions": user_data.get('permissions', [])
                },
                "expires_at": user_data.get('exp')
            })
        else:
            return jsonify({"valid": False, "error": "Invalid or expired token"}), 401
            
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return jsonify({"error": "Token validation failed"}), 500

@auth_bridge_bp.route('/refresh-token', methods=['POST'])
def refresh_auth_token():
    """Refresh authentication token"""
    try:
        data = request.get_json()
        token = data.get('token') if data else None
        
        if not token:
            return jsonify({"error": "No token provided"}), 400
        
        # Refresh token
        new_token = auth_bridge.refresh_token(token)
        
        if new_token:
            return jsonify({
                "success": True,
                "token": new_token,
                "expires_in": TOKEN_EXPIRY_HOURS * 3600,
                "token_type": "Bearer"
            })
        else:
            return jsonify({"error": "Failed to refresh token"}), 401
            
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({"error": "Token refresh failed"}), 500

@auth_bridge_bp.route('/streamlit-session', methods=['POST'])
def create_streamlit_session():
    """Create Streamlit session from React token"""
    try:
        data = request.get_json()
        token = data.get('token') if data else None
        
        if not token:
            return jsonify({"error": "No token provided"}), 400
        
        # Create Streamlit session
        session_data = auth_bridge.create_streamlit_session(token)
        
        if "error" in session_data:
            return jsonify(session_data), 401
        
        return jsonify({
            "success": True,
            "session": session_data,
            "streamlit_url": "/streamlit",  # URL to Streamlit interface
            "redirect_params": {
                "session_id": session_data.get('session_id'),
                "auth_token": token
            }
        })
        
    except Exception as e:
        logger.error(f"Streamlit session creation error: {e}")
        return jsonify({"error": "Failed to create Streamlit session"}), 500

@auth_bridge_bp.route('/logout', methods=['POST'])
def logout_user():
    """Logout user and invalidate tokens"""
    try:
        data = request.get_json()
        token = data.get('token') if data else None
        
        # In a production system, you would add the token to a blacklist
        # For now, we'll just return success since JWT tokens are stateless
        
        logger.info("User logged out successfully")
        return jsonify({
            "success": True,
            "message": "Logged out successfully"
        })
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({"error": "Logout failed"}), 500

@auth_bridge_bp.route('/user-info', methods=['GET'])
def get_user_info():
    """Get current user information from token"""
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "No valid authorization header"}), 401
        
        token = auth_header.split(' ')[1]
        
        # Validate token and get user data
        user_data = auth_bridge.validate_token(token)
        
        if user_data:
            return jsonify({
                "user": {
                    "id": user_data.get('user_id'),
                    "email": user_data.get('email'),
                    "name": user_data.get('name'),
                    "role": user_data.get('role'),
                    "permissions": user_data.get('permissions', []),
                    "authenticated": True
                }
            })
        else:
            return jsonify({"error": "Invalid or expired token"}), 401
            
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        return jsonify({"error": "Failed to get user info"}), 500

# Utility functions for other modules
def get_current_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """Utility function to get current user from token"""
    return auth_bridge.validate_token(token)

def require_auth(f):
    """Decorator to require authentication for API endpoints"""
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authentication required"}), 401
        
        token = auth_header.split(' ')[1]
        user_data = auth_bridge.validate_token(token)
        
        if not user_data:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Add user data to request context
        request.current_user = user_data
        return f(*args, **kwargs)
    
    decorated_function.__name__ = f.__name__
    return decorated_function

def require_role(required_role: str):
    """Decorator to require specific role for API endpoints"""
    def decorator(f):
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({"error": "Authentication required"}), 401
            
            user_role = request.current_user.get('role', 'user')
            if user_role != required_role and user_role != 'admin':
                return jsonify({"error": "Insufficient permissions"}), 403
            
            return f(*args, **kwargs)
        
        decorated_function.__name__ = f.__name__
        return decorated_function
    return decorator

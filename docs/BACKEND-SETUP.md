# Backend Server Setup

## Quick Start (Development)

1. **Install Python dependencies:**
   ```bash
   cd <repo-root>  # Navigate to the directory where you cloned the repository
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -e .
   ```

2. **Set environment variables:**
   ```bash
   # Option 1: Create .env file (recommended for persistent setup)
   cat > .env << 'EOF'
   SECRET_KEY=dev-secret-key-CHANGEME-$(openssl rand -hex 32)
   VANA_PORT=8000
   VANA_HOST=127.0.0.1
   GOOGLE_CLOUD_PROJECT=analystai-454200
   EOF
   
   # Option 2: Export variables (for quick testing)
   export SECRET_KEY="dev-secret-$(openssl rand -hex 16)"
   export VANA_PORT="8000"
   export VANA_HOST="127.0.0.1"
   ```

3. **Start the server:**
   ```bash
   python app/server.py
   ```

4. **Verify it's running:**
   ```bash
   curl http://localhost:8000/health
   # Should return JSON with status: "healthy"
   
   # Check API documentation
   curl http://localhost:8000/docs
   # Opens interactive FastAPI documentation
   ```

## Available Endpoints

### Core API Endpoints
- **Health Check**: `GET http://localhost:8000/health`
  - Returns server status and configuration info
- **API Documentation**: `http://localhost:8000/docs`
  - Interactive OpenAPI/Swagger documentation
- **Authentication Login**: `POST http://localhost:8000/auth/login`
  - User authentication endpoint
- **SSE Stream**: `GET http://localhost:8000/agent_network_sse/{session_id}`
  - Real-time event streaming for agent network events
- **Agent Network History**: `GET http://localhost:8000/agent_network_history`
  - Get historical agent network events
- **Feedback Collection**: `POST http://localhost:8000/feedback`
  - Submit user feedback (requires authentication)

### Authentication Endpoints
- **Login**: `POST http://localhost:8000/auth/login`
- **Logout**: `POST http://localhost:8000/auth/logout`
- **Token Refresh**: `POST http://localhost:8000/auth/refresh`
- **User Profile**: `GET http://localhost:8000/auth/me`
- **User Management**: `GET/POST/PUT/DELETE http://localhost:8000/users`
- **Admin Routes**: `http://localhost:8000/admin/*` (admin only)

## Environment Variables

### Required Variables
- `SECRET_KEY`: Cryptographic secret for JWT tokens (use a strong random value in production)
- `VANA_PORT`: Port number for the server (default: 8000)
- `VANA_HOST`: Host to bind to (default: 127.0.0.1 for security)

### Optional Variables
- `GOOGLE_CLOUD_PROJECT`: Google Cloud project ID (default: analystai-454200)
- `ALLOW_ORIGINS`: Comma-separated list of allowed CORS origins
- `SESSION_DB_URI`: Custom database URI for sessions
- `CLOUD_RUN_SESSION_DB_PATH`: Path for Cloud Run persistent sessions
- `REQUIRE_SSE_AUTH`: Whether SSE endpoints require authentication (default: true in production)
- `CI`: Set to "true" to enable CI mode (skips cloud services)

## Authentication & Security

The server includes comprehensive authentication and security features:

### Authentication Flow
1. Users authenticate via Google OAuth or email/password
2. Server issues JWT tokens for authenticated sessions
3. Protected endpoints require valid JWT tokens
4. Tokens can be refreshed using refresh tokens

### Security Features
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: 100 requests per minute per IP
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Audit Logging**: All authentication events are logged
- **Input Validation**: Pydantic models for request validation

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :8000

# Use a different port
export VANA_PORT="8001"
# Update frontend .env.local to match: NEXT_PUBLIC_API_URL=http://localhost:8001
```

### Authentication Issues
```bash
# Check if auth database is initialized
ls -la auth.db

# Reset auth database (CAUTION: deletes all users)
rm auth.db
python app/server.py  # Will recreate database
```

### Google Cloud Authentication
```bash
# For local development, authenticate with Google Cloud
gcloud auth application-default login

# Or set service account credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### Memory/Session Storage
```bash
# Check session storage location
ls -la /tmp/vana_sessions.db  # Default local location

# Monitor session backup to GCS (if configured)
tail -f server.log | grep "session"
```

### Development vs Production
- **Development**: Uses local SQLite for sessions, minimal authentication
- **Production**: Uses Cloud SQL/persistent storage, full authentication required
- **CI Environment**: Skips cloud services, uses minimal configuration

## Health Check Response Example

```json
{
  "status": "healthy",
  "timestamp": "2025-08-28T10:30:00.000Z",
  "service": "vana",
  "version": "1.0.0",
  "session_storage_enabled": true,
  "session_storage_uri": "sqlite:///tmp/vana_sessions.db",
  "session_storage_bucket": "analystai-454200-vana-session-storage"
}
```

## Frontend Integration

Once the backend is running, update your frontend configuration:

1. Copy `frontend/.env.local.example` to `frontend/.env.local`
2. Set `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Start the frontend with `npm run dev`

## Development Workflow

1. **Start Backend**: `python app/server.py`
2. **Verify Health**: `curl http://localhost:8000/health`
3. **Start Frontend**: `cd frontend && npm run dev`
4. **Access Application**: `http://localhost:3000`

The backend provides a robust FastAPI server with authentication, real-time event streaming, and comprehensive security features for the vana agent platform.
# VANA Frontend Integration Architecture

## Recommended Approach: Monorepo with Integrated Deployment

For your personal VANA project, I recommend keeping the frontend in the main `/vana` repository and deploying it as a single integrated service. Here's why and how:

### Why This Approach?

1. **Simplicity First**
   - One repository to manage
   - Single deployment command
   - One Cloud Run service to monitor
   - No complex orchestration needed

2. **Cost Efficiency**
   - Single Cloud Run instance (vs multiple services)
   - Shared resources between frontend/backend
   - No additional hosting costs (Firebase, Netlify, etc.)

3. **Development Experience**
   - No CORS configuration needed (same origin)
   - WebSocket works seamlessly
   - Single `git clone` for everything
   - Unified CI/CD pipeline

4. **Perfect for Personal Projects**
   - Less infrastructure to manage
   - Faster iteration cycles
   - Easier debugging (all logs in one place)

### Architecture Structure

```
/vana
├── frontend/                    # React application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── agents/                      # Existing ADK agents
├── lib/                         # Existing backend libraries
├── main.py                      # Modified to serve frontend
├── Dockerfile                   # Updated for multi-stage build
├── Makefile                     # Updated with frontend commands
└── pyproject.toml              # Existing Python deps
```

### Implementation Plan

#### 1. Update main.py to Serve Static Files

```python
# main.py additions
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# After creating the FastAPI app
app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    allow_origins=ALLOWED_ORIGINS,
    web=SERVE_WEB_INTERFACE,
)

# Serve static files (React build)
if os.path.exists("frontend/dist"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
    
    # Catch-all route for React Router
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API routes take precedence
        if full_path.startswith("api/") or full_path.startswith("health"):
            return {"detail": "Not found"}, 404
            
        # Serve index.html for all other routes (React Router handles them)
        return FileResponse("frontend/dist/index.html")
```

#### 2. Multi-Stage Dockerfile

```dockerfile
# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Python backend stage
FROM python:3.13-slim
RUN apt-get update && apt-get install -y gcc python3-dev
WORKDIR /app

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./frontend/dist

# Create non-root user
RUN adduser --disabled-password --gecos "" vanauser && \
    chown -R vanauser:vanauser /app

USER vanauser
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8081}"]
```

#### 3. Update Makefile

```makefile
# Add frontend commands
frontend-dev:
	@echo "$(GREEN)🎨 Starting frontend dev server...$(NC)"
	cd frontend && npm run dev

frontend-build:
	@echo "$(GREEN)📦 Building frontend...$(NC)"
	cd frontend && npm run build

# Update dev command to run both
dev-full:
	@echo "$(GREEN)🚀 Starting full stack development...$(NC)"
	@make -j2 backend frontend-dev

# Update deployment
deploy-staging: frontend-build
	@echo "$(GREEN)☁️  Deploying to Cloud Run...$(NC)"
	gcloud run deploy vana-dev --source . --region=us-central1
```

#### 4. Development Workflow

```bash
# Local development (two terminals)
make backend          # Terminal 1: Backend on :8081
make frontend-dev     # Terminal 2: Frontend on :5173 with proxy

# Or use concurrent development
make dev-full         # Runs both with proper output handling

# Production build & deploy
make frontend-build   # Build React app
make deploy-staging   # Deploy everything to Cloud Run
```

#### 5. Frontend Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8081',
      '/health': 'http://localhost:8081',
      '/ws': {
        target: 'ws://localhost:8081',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    // Ensure assets are referenced correctly
    assetsDir: 'assets'
  }
});
```

### Alternative Approaches (Not Recommended for Your Case)

#### Option 2: Separate Static Hosting
- **When to use**: If you need CDN benefits, separate scaling
- **Complexity**: CORS setup, separate deployments, API gateway
- **Cost**: Additional hosting service (Firebase, Netlify)

#### Option 3: Microservices
- **When to use**: Large teams, complex requirements
- **Complexity**: Service mesh, API gateway, orchestration
- **Cost**: Multiple Cloud Run services, load balancer

#### Option 4: Separate Repository
- **When to use**: Different teams, different deployment cycles
- **Complexity**: Coordination between repos, versioning
- **Cost**: More CI/CD complexity

### Migration Path

1. **Phase 1**: Add frontend to monorepo
   ```bash
   cd /vana
   npm create vite@latest frontend -- --template react-ts
   ```

2. **Phase 2**: Update backend to serve static files
   - Modify main.py
   - Test locally

3. **Phase 3**: Update Dockerfile
   - Add multi-stage build
   - Test with Docker locally

4. **Phase 4**: Deploy
   ```bash
   make frontend-build
   gcloud run deploy vana-dev --source .
   ```

### Benefits of This Approach

1. **One URL**: `https://vana-dev.run.app` serves everything
2. **WebSocket Just Works**: No CORS or proxy issues
3. **Simple Deployment**: One command deploys everything
4. **Easy Rollbacks**: Single service to revert
5. **Unified Logging**: All logs in Cloud Run console
6. **Cost Effective**: ~$0 for low traffic personal project

### Environment Variables

```bash
# .env.local (frontend)
VITE_API_URL=  # Empty in production (same origin)
VITE_WS_URL=   # Empty in production (same origin)

# In development, Vite proxy handles it
# In production, same origin so no config needed
```

### Summary

For a personal VANA project, the monorepo with integrated deployment is the optimal choice. It provides the simplest development experience, lowest operational overhead, and most cost-effective deployment while maintaining the flexibility to evolve the architecture later if needed.

The key is starting simple and adding complexity only when actually needed. This approach gets you a working full-stack application with minimal configuration and maximum development velocity.
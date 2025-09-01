# Package Integration Strategy for Vana-Chat Migration

## Root Package.json Updates

### Current Root Package.json Structure
The main Vana repository has a minimal package.json focused on development tooling. We need to transform it into a proper monorepo workspace configuration.

### Recommended Root Package.json Changes

```json
{
  "name": "vana-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:frontend": "cd frontend && pnpm dev",
    "dev:backend": "python app/server.py",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && pnpm build",
    "build:backend": "echo 'Backend build - add specific commands'",
    "test": "npm run test:frontend && npm run test:backend",
    "test:frontend": "cd frontend && pnpm test",
    "test:backend": "python -m pytest tests/",
    "lint": "npm run lint:frontend && npm run lint:backend",
    "lint:frontend": "cd frontend && pnpm lint",
    "lint:backend": "ruff check .",
    "typecheck": "npm run typecheck:frontend",
    "typecheck:frontend": "cd frontend && pnpm typecheck",
    "clean": "npm run clean:frontend && npm run clean:backend",
    "clean:frontend": "cd frontend && rm -rf .next node_modules",
    "clean:backend": "find . -name '__pycache__' -type d -exec rm -rf {} +",
    "install:all": "npm install && cd frontend && pnpm install",
    "postinstall": "cd frontend && pnpm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "@types/node": "^22.8.6",
    "typescript": "^5.6.3"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### Frontend Package.json Updates

The vana-chat package.json needs these modifications for monorepo integration:

```json
{
  "name": "@vana/frontend",
  "version": "3.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "tsx lib/db/migrate && next build",
    "start": "next start --port 3000",
    "lint": "next lint && biome lint --write --unsafe",
    "lint:fix": "next lint --fix && biome lint --write --unsafe", 
    "format": "biome format --write",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "npx tsx lib/db/migrate.ts",
    "db:studio": "drizzle-kit studio",
    "db:push": "drizzle-kit push",
    "db:pull": "drizzle-kit pull",
    "db:check": "drizzle-kit check",
    "db:up": "drizzle-kit up",
    "test": "export PLAYWRIGHT=True && pnpm exec playwright test",
    "test:unit": "jest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    // Keep existing dependencies from vana-chat
  },
  "devDependencies": {
    // Keep existing devDependencies from vana-chat
  },
  "packageManager": "pnpm@9.12.3"
}
```

## Dependency Resolution Strategy

### 1. Conflicting Dependencies
Handle version conflicts between main repo and vana-chat:

```bash
# Check for conflicts
npm ls --depth=0 2>&1 | grep "UNMET DEPENDENCY\|npm ERR!"
cd frontend && pnpm ls --depth=0 2>&1 | grep "WARN\|ERR"
```

### 2. Resolution Approach
- **Frontend**: Use pnpm for faster builds and better dependency management
- **Backend**: Keep existing Python dependency management
- **Root**: Minimal npm for workspace coordination

### 3. Package Manager Configuration
```json
// .npmrc (root)
{
  "workspaces": true,
  "legacy-peer-deps": false
}
```

```ini
# .npmrc (frontend)
shamefully-hoist=false
strict-peer-dependencies=false
auto-install-peers=true
```

## Environment Configuration Strategy

### 1. Environment File Structure
```
/Users/nick/Development/vana/
├── .env                    # Root environment (backend configs)
├── .env.local             # Local overrides
├── frontend/.env.local    # Frontend-specific configs
└── frontend/.env.example  # Frontend example configs
```

### 2. Environment Variables Mapping
```bash
# Root .env (for backend)
DATABASE_URL=...
REDIS_URL=...
SECRET_KEY=...

# frontend/.env.local (for frontend)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
OPENAI_API_KEY=...
DATABASE_URL=...  # Same as backend for shared DB
```

## Build System Integration

### 1. Development Workflow
```bash
# Single command to start everything
npm run dev

# This runs:
# - Backend: python app/server.py (port 8000)
# - Frontend: next dev (port 3000)
```

### 2. Production Build
```bash
# Build everything
npm run build

# This runs:
# - Frontend build with database migration
# - Backend preparation (if needed)
```

### 3. Testing Integration
```bash
# Run all tests
npm test

# This runs:
# - Frontend: Playwright + Jest tests
# - Backend: Pytest tests
```

## CI/CD Pipeline Updates

### GitHub Actions Workflow
```yaml
# .github/workflows/main.yml
name: Vana Monorepo CI/CD

on:
  push:
    branches: [main, feat/vana-chat-integration]
  pull_request:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9.12.3
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
          cache-dependency-path: './frontend/pnpm-lock.yaml'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Type check
        run: pnpm typecheck
      
      - name: Lint
        run: pnpm lint
      
      - name: Test
        run: pnpm test
      
      - name: Build
        run: pnpm build

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      
      - name: Lint
        run: ruff check .
      
      - name: Test
        run: python -m pytest tests/
      
      - name: Type check
        run: mypy app/

  integration:
    needs: [frontend, backend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Integration tests
        run: |
          # Start backend
          python app/server.py &
          # Wait for backend
          sleep 10
          # Run frontend integration tests
          cd frontend && pnpm test:e2e
```

## Deployment Strategy

### 1. Vercel Configuration
```json
// vercel.json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "app/server.py", 
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/app/server.py"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ]
}
```

### 2. Docker Configuration Updates
```dockerfile
# Dockerfile.monorepo
FROM node:18-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install
COPY frontend/ .
RUN pnpm build

FROM python:3.11-slim AS backend
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ ./app/
COPY --from=frontend /app/frontend/dist ./frontend/dist

EXPOSE 8000
CMD ["python", "app/server.py"]
```

## Risk Mitigation

### 1. Backup Strategy
- Complete backup of current frontend before migration
- Git branch protection for rollback capability
- Database backup before schema changes

### 2. Testing Strategy
- Comprehensive testing at each migration step
- Integration testing between frontend and backend
- User acceptance testing for UI compatibility

### 3. Rollback Plan
- Clear rollback commands documented
- Automated rollback scripts if needed
- Branch-based recovery strategy

## Timeline Estimate

### Phase 1-2: Preparation (30 minutes)
- Backup creation
- Branch setup
- Git history preservation

### Phase 3-4: Migration (1 hour)
- File structure changes
- Configuration updates
- Dependency resolution

### Phase 5-6: Testing (45 minutes)
- Integration testing
- Build validation
- Development workflow testing

### Phase 7: PR Creation (15 minutes)
- Commit preparation
- PR creation and documentation

**Total Estimated Time: 2.5 hours**
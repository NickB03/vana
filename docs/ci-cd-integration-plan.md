# CI/CD Integration Plan for Vana-Chat Migration

## GitHub Actions Workflow Updates

### Updated Main Workflow
```yaml
# .github/workflows/vana-monorepo.yml
name: Vana Monorepo CI/CD

on:
  push:
    branches: [main, feat/vana-chat-integration-v2]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'
  PNPM_VERSION: '9.12.3'

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.changes.outputs.frontend }}
      backend: ${{ steps.changes.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            frontend:
              - 'frontend/**'
              - 'package.json'
            backend:
              - 'app/**'
              - 'requirements.txt'
              - 'pyproject.toml'

  frontend:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
          cache-dependency-path: './frontend/pnpm-lock.yaml'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Type check
        run: pnpm typecheck
      
      - name: Lint
        run: pnpm lint
      
      - name: Format check
        run: pnpm format --check
      
      - name: Build
        run: pnpm build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      
      - name: Unit Tests
        run: pnpm test:unit
      
      - name: Install Playwright
        run: pnpm exec playwright install --with-deps
      
      - name: E2E Tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
      
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30

  backend:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      
      - name: Lint with ruff
        run: ruff check .
      
      - name: Format check with ruff
        run: ruff format --check .
      
      - name: Type check with mypy
        run: mypy app/
      
      - name: Run tests
        run: python -m pytest tests/ -v --cov=app --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  integration:
    needs: [frontend, backend]
    if: always() && (needs.frontend.result == 'success' || needs.frontend.result == 'skipped') && (needs.backend.result == 'success' || needs.backend.result == 'skipped')
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: vana_test
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
          cache-dependency-path: './frontend/pnpm-lock.yaml'
      
      - name: Install backend dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      
      - name: Install frontend dependencies
        run: cd frontend && pnpm install --frozen-lockfile
      
      - name: Start backend
        run: |
          python app/server.py &
          echo $! > backend.pid
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vana_test
          REDIS_URL: redis://localhost:6379
      
      - name: Wait for backend
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:8000/health; do sleep 2; done'
      
      - name: Build frontend
        run: cd frontend && pnpm build
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/vana_test
          NEXTAUTH_SECRET: test-secret-key
          NEXTAUTH_URL: http://localhost:3000
      
      - name: Start frontend
        run: |
          cd frontend && pnpm start &
          echo $! > frontend.pid
      
      - name: Wait for frontend
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:3000; do sleep 2; done'
      
      - name: Run integration tests
        run: |
          cd frontend && pnpm test:e2e
        env:
          BASE_URL: http://localhost:3000
          API_URL: http://localhost:8000
      
      - name: Cleanup processes
        if: always()
        run: |
          [[ -f backend.pid ]] && kill $(cat backend.pid) || true
          [[ -f frontend.pid ]] && kill $(cat frontend.pid) || true

  deploy-preview:
    needs: [frontend, backend, integration]
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
          cache-dependency-path: './frontend/pnpm-lock.yaml'
      
      - name: Install dependencies
        run: cd frontend && pnpm install --frozen-lockfile
      
      - name: Build for deployment
        run: cd frontend && pnpm build
        env:
          DATABASE_URL: ${{ secrets.PREVIEW_DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXTAUTH_URL: ${{ secrets.PREVIEW_URL }}
      
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### Workflow Optimizations

#### 1. Conditional Execution
- Only run frontend jobs when frontend files change
- Only run backend jobs when backend files change
- Always run integration tests when either changes

#### 2. Caching Strategy
```yaml
# Cache optimization
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-

- name: Cache Python dependencies
  uses: actions/cache@v3
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

#### 3. Parallel Job Execution
- Frontend and backend jobs run in parallel
- Integration tests run only after both pass
- Deploy preview runs independently

## Vercel Deployment Configuration

### Updated vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next",
      "config": {
        "distDir": ".next"
      }
    },
    {
      "src": "app/server.py",
      "use": "@vercel/python",
      "config": {
        "maxLambdaSize": "50mb"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/app/server.py"
    },
    {
      "src": "/health",
      "dest": "/app/server.py"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "@nextauth_url"
  },
  "build": {
    "env": {
      "DATABASE_URL": "@database_url"
    }
  }
}
```

### Frontend-Specific Vercel Configuration
```json
// frontend/vercel.json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "outputDirectory": ".next"
}
```

## Docker Integration Updates

### Multi-Stage Dockerfile
```dockerfile
# Dockerfile.monorepo
FROM node:18-alpine AS frontend-deps
WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY frontend/ .
RUN corepack enable pnpm && pnpm build

FROM python:3.11-slim AS backend
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/

FROM backend AS final
COPY --from=frontend-builder /app/.next ./frontend/.next
COPY --from=frontend-builder /app/public ./frontend/public
COPY --from=frontend-builder /app/package.json ./frontend/package.json

EXPOSE 8000 3000
CMD ["python", "app/server.py"]
```

### Docker Compose for Development
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NEXTAUTH_URL=http://localhost:3000
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/vana_dev
    depends_on:
      - postgres

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend.dev
    ports:
      - "8000:8000"
    volumes:
      - ./app:/app/app
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/vana_dev
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: vana_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## Testing Strategy Integration

### 1. Frontend Testing
```json
// frontend/package.json - Updated test scripts
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:visual": "playwright test tests/visual --reporter=html",
    "test:integration": "jest --config=jest.integration.config.js"
  }
}
```

### 2. Backend Testing Integration
```bash
# pytest.ini updates for monorepo
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --verbose
    --tb=short
    --cov=app
    --cov-report=term-missing
    --cov-report=xml
    --cov-report=html:htmlcov
```

### 3. Integration Testing
```javascript
// tests/integration/frontend-backend.test.js
describe('Frontend-Backend Integration', () => {
  beforeAll(async () => {
    // Start backend server
    // Start frontend server
  });

  test('API connectivity', async () => {
    // Test API endpoints from frontend
  });

  test('Authentication flow', async () => {
    // Test auth integration
  });

  test('Database operations', async () => {
    // Test DB operations
  });
});
```

## Environment Management

### 1. Environment File Structure
```bash
# Root .env (backend configuration)
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SECRET_KEY=...
OPENAI_API_KEY=...

# frontend/.env.local (frontend configuration)  
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
DATABASE_URL=postgresql://...  # Shared with backend
OPENAI_API_KEY=...             # Shared with backend
```

### 2. Environment Validation
```javascript
// scripts/validate-env.js
const requiredEnvVars = {
  root: ['DATABASE_URL', 'REDIS_URL', 'SECRET_KEY'],
  frontend: ['NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'DATABASE_URL']
};

function validateEnvironment() {
  // Validate all required environment variables
  // Fail fast if any are missing
}
```

## Security Considerations

### 1. Secret Management
```yaml
# GitHub Secrets Required
DATABASE_URL: Production database connection
NEXTAUTH_SECRET: NextAuth encryption key
VERCEL_TOKEN: Deployment token
VERCEL_ORG_ID: Organization ID
VERCEL_PROJECT_ID: Project ID
OPENAI_API_KEY: AI service key
```

### 2. Security Scanning
```yaml
# Add to GitHub Actions
- name: Security scan
  uses: github/super-linter@v4
  env:
    DEFAULT_BRANCH: main
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    VALIDATE_TYPESCRIPT_ES: true
    VALIDATE_PYTHON: true
```

## Monitoring and Observability

### 1. Build Metrics
```yaml
- name: Report build metrics
  run: |
    echo "Frontend build size:"
    du -sh frontend/.next
    echo "Bundle analysis:"
    cd frontend && pnpm analyze
```

### 2. Performance Testing
```yaml
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v9
  with:
    configPath: './frontend/lighthouserc.json'
    uploadArtifacts: true
```

### 3. Deployment Health Checks
```bash
# Health check script
#!/bin/bash
curl -f $FRONTEND_URL/api/health || exit 1
curl -f $BACKEND_URL/health || exit 1
echo "✅ All services healthy"
```

This CI/CD integration plan ensures robust testing, deployment, and monitoring for the migrated vana-chat frontend while maintaining backend compatibility and operational excellence.
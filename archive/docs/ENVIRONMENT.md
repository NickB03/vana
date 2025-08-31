# Environment Configuration Guide

This document describes the environment variable configuration for the Vana project, including setup instructions and security considerations.

## Project Structure

The Vana project uses a monorepo structure with separate environment configurations for different components:

```
vana/
├── .env                    # Root environment variables
├── .env.local             # Root local development with secrets
├── .env.production        # Root production configuration
├── .env.local.template    # Root configuration template
└── frontend/
    ├── .env.local         # Frontend local development
    ├── .env.local.template # Frontend configuration template
    └── .env.example       # Frontend configuration examples
```

## Environment Files Overview

### 1. Root Environment Files

#### `.env` - Base Development Configuration
Contains shared development settings without secrets:
- `NODE_ENV=development`
- `ENVIRONMENT=development`  
- `LOG_LEVEL=debug`
- `PORT=8000`
- CORS origins for development

#### `.env.local` - Local Development with Secrets
Contains API keys and tokens for development:
- OpenRouter API key
- Brave Search API key
- GitHub tokens
- Session secrets

#### `.env.production` - Production Configuration
Template for production deployment:
- Production-ready settings
- Security configurations
- References to Google Secret Manager

### 2. Frontend Environment Files

#### `frontend/.env.local` - Frontend Development
Contains Next.js specific variables:
- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- OAuth configurations (Google, GitHub)
- Feature flags
- Debug settings

## Required Environment Variables

### Backend (Root) Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Node.js environment | Yes | `development` |
| `PORT` | Server port | No | `8000` |
| `HOST` | Server host | No | `localhost` |
| `LOG_LEVEL` | Logging level | No | `debug` |
| `ALLOW_ORIGINS` | CORS origins | Yes | Various localhost ports |
| `GOOGLE_CLOUD_PROJECT` | GCP project ID | Yes | `analystai-454200` |
| `SESSION_TIMEOUT` | Session timeout (seconds) | No | `3600` |
| `SESSION_SECRET` | Session encryption key | Production | Generate with OpenSSL |
| `OPENROUTER_API_KEY` | OpenRouter API access | Optional | From OpenRouter dashboard |
| `BRAVE_API_KEY` | Brave Search API access | Optional | From Brave dashboard |
| `GITHUB_OAUTH_TOKEN` | GitHub OAuth token | Optional | From GitHub settings |

### Frontend Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | Yes | `ws://localhost:8000` |
| `NEXT_PUBLIC_SSE_URL` | Server-Sent Events URL | Yes | `http://localhost:8000` |
| `NEXT_PUBLIC_APP_URL` | Frontend app URL | Yes | `http://localhost:5173` |
| `NEXTAUTH_URL` | NextAuth.js URL | Yes | `http://localhost:5173` |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Production | Generate with OpenSSL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | OAuth | From Google Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | OAuth | From Google Console |
| `GITHUB_CLIENT_ID` | GitHub OAuth client ID | OAuth | From GitHub settings |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret | OAuth | From GitHub settings |

### Feature Flags

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ENABLE_CANVAS` | Enable canvas features | `true` |
| `NEXT_PUBLIC_ENABLE_CHAT` | Enable chat features | `true` |
| `NEXT_PUBLIC_ENABLE_AGENTS` | Enable agent features | `true` |
| `NEXT_PUBLIC_ENABLE_AUTH` | Enable authentication | `true` |
| `NEXT_PUBLIC_MOCK_AUTH` | Use mock authentication | `true` (dev) |
| `NEXT_PUBLIC_DEBUG` | Enable debug mode | `true` (dev) |

## Setup Instructions

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd vana

# Copy environment templates
cp .env.local.template .env.local
cp frontend/.env.local.template frontend/.env.local
```

### 2. Generate Secrets

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Generate session secret  
openssl rand -base64 32
```

### 3. Configure OAuth Applications

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `analystai-454200`
3. Navigate to APIs & Credentials
4. Create OAuth 2.0 Client ID:
   - Type: Web application
   - Origins: `http://localhost:5173`
   - Redirect URIs: `http://localhost:5173/auth/callback/google`

#### GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App:
   - Name: Vana Local Development
   - Homepage: `http://localhost:5173`
   - Callback: `http://localhost:5173/auth/callback/github`

### 4. API Key Configuration

#### OpenRouter (Optional)
1. Visit [OpenRouter Dashboard](https://openrouter.ai/keys)
2. Generate API key
3. Add to `.env.local`: `OPENROUTER_API_KEY=sk-or-v1-...`

#### Brave Search (Optional)
1. Visit [Brave Search API](https://api.search.brave.com/app/keys)
2. Generate API key
3. Add to `.env.local`: `BRAVE_API_KEY=BSA...`

### 5. Verification

```bash
# Start backend (if applicable)
npm run dev

# Start frontend
cd frontend
npm run dev
```

## Security Considerations

### Development
- Never commit `.env.local` files
- Use mock/placeholder values in templates
- Rotate API keys regularly
- Use different OAuth apps for different environments

### Production
- Use Google Secret Manager for all secrets
- Enable secure cookies (`SECURE_COOKIES=true`)
- Force HTTPS (`FORCE_HTTPS=true`)
- Set appropriate CORS origins
- Use production OAuth applications
- Monitor API key usage

### Environment File Security

| File | Committed | Contains Secrets | Purpose |
|------|-----------|------------------|---------|
| `.env` | Yes | No | Base configuration |
| `.env.local` | **NO** | Yes | Development secrets |
| `.env.production` | Yes | No | Production template |
| `.env.example` | Yes | No | Documentation |
| `.env.local.template` | Yes | No | Setup template |

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `ALLOW_ORIGINS` includes your frontend URL
   - Check both root and frontend CORS settings

2. **OAuth Failures**
   - Confirm redirect URIs match exactly
   - Verify client IDs in environment files
   - Check OAuth app domain restrictions

3. **API Connection Issues**
   - Verify `NEXT_PUBLIC_API_URL` points to running backend
   - Check port numbers match between services
   - Confirm backend is accessible

4. **Build Failures**
   - Ensure all required `NEXT_PUBLIC_*` variables are set
   - Check for missing secrets in production builds
   - Verify environment file syntax

### Environment Variable Loading Order

Next.js loads environment variables in this order:
1. `.env.local` (highest priority)
2. `.env.development` / `.env.production`
3. `.env`
4. Built-in defaults

### Debugging Environment Variables

```bash
# Check loaded variables (development)
npm run dev -- --debug

# Verify Next.js configuration
npx next info

# Check environment in browser console
console.log(process.env.NEXT_PUBLIC_API_URL)
```

## Production Deployment

### Google Cloud Deployment

1. Store secrets in Google Secret Manager:
```bash
# Store session secret
gcloud secrets create session-secret --data-file=-

# Store OAuth secrets
gcloud secrets create google-oauth-secret --data-file=-
```

2. Update production configuration to reference secrets:
```bash
# In production environment
SESSION_SECRET=$(gcloud secrets versions access latest --secret="session-secret")
```

3. Configure Dockerfile to load secrets:
```dockerfile
# Copy production environment
COPY .env.production .env
RUN ./scripts/load-production-secrets.sh
```

### Vercel Deployment

1. Set environment variables in Vercel dashboard
2. Use Vercel environment variable scoping:
   - Development: `.env.local`
   - Preview: `.env.preview`  
   - Production: `.env.production`

3. Configure build environment:
```json
{
  "build": {
    "env": {
      "NEXT_PUBLIC_API_URL": "@api-url-production"
    }
  }
}
```

## Monitoring

### Environment Health Checks

- Verify all required variables are set
- Monitor API key usage and limits
- Check OAuth application metrics
- Track environment-specific errors

### Logging

Environment-specific logging levels:
- Development: `LOG_LEVEL=debug`
- Staging: `LOG_LEVEL=info`
- Production: `LOG_LEVEL=warn`

## Support

For environment configuration issues:
1. Check this documentation
2. Verify against templates
3. Review security considerations
4. Contact development team

## Changelog

- **v2.0.0**: Added comprehensive environment configuration
- **v1.1.0**: Added OAuth integration support
- **v1.0.0**: Initial environment setup
# Local Development Setup - Vana

**Last Updated**: 2025-11-17

Complete guide for setting up Vana AI Development Assistant for local development.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Supabase Configuration](#supabase-configuration)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Database Setup](#database-setup)
- [Edge Functions Development](#edge-functions-development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

Install the following before starting:

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | 18.0.0+ | [nodejs.org](https://nodejs.org) |
| **npm** | Comes with Node | - |
| **Git** | Latest | [git-scm.com](https://git-scm.com) |
| **Code Editor** | VS Code recommended | [code.visualstudio.com](https://code.visualstudio.com) |

### Verify Installation

```bash
node --version  # Should show v18.0.0 or higher
npm --version   # Should show 8.0.0 or higher
git --version   # Should show 2.0.0 or higher
```

### Recommended VS Code Extensions

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **TypeScript + JavaScript** - TS support
- **Vetur** or **Volar** - Vue support (if needed)

---

## Initial Setup

### 1. Clone Repository

```bash
# Clone via HTTPS
git clone https://github.com/NickB03/llm-chat-site.git

# Or via SSH (if configured)
git clone git@github.com:NickB03/llm-chat-site.git

# Navigate to project directory
cd llm-chat-site
```

### 2. Install Dependencies

```bash
npm install
```

**Important**:
- Always use `npm` (never Bun, Yarn, or pnpm)
- This prevents lock file conflicts
- Takes ~2-3 minutes depending on connection speed

### 3. Verify Installation

```bash
# Check if dependencies installed correctly
npm list --depth=0

# Should show all packages without errors
```

---

## Supabase Configuration

### Option 1: Use Existing Project (Recommended for Contributors)

If you're contributing to the project, you can use the existing Supabase instance:

1. **Request access** from project maintainers
2. Get the **anon key** and **project URL**
3. Skip to [Environment Variables](#environment-variables)

### Option 2: Create New Project (For Your Own Instance)

If you want your own Supabase instance:

#### Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended)

#### Step 2: Create New Project

1. Click "New Project"
2. Choose organization (or create one)
3. Set project details:
   - **Name**: `vana-dev` (or your choice)
   - **Database Password**: Generate strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait ~2 minutes for project to initialize

#### Step 3: Get API Keys

1. Go to Project Settings → API
2. Copy:
   - **Project URL**: `https://YOURPROJECT.supabase.co`
   - **anon/public key**: `eyJh...` (long string)

#### Step 4: Run Database Migrations

1. Open SQL Editor in Supabase Dashboard
2. Run each migration file from `supabase/migrations/` in order
3. Or use Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

#### Step 5: Configure Authentication

1. Go to Authentication → Providers
2. Enable **Email** provider
3. (Optional) Configure **Google OAuth**:
   - Create OAuth app in Google Cloud Console
   - Copy Client ID and Secret
   - Add redirect URL: `https://YOURPROJECT.supabase.co/auth/v1/callback`

#### Step 6: Create Storage Bucket

```sql
-- Run in SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true);
```

#### Step 7: Configure Storage Policies

```sql
-- Allow public read access to images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-images' AND auth.role() = 'authenticated');
```

---

## Environment Variables

### Frontend Environment (`.env`)

Create `.env` file in project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://vznhbocnuykdmjvujaka.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_SUPABASE_PROJECT_ID=vznhbocnuykdmjvujaka

# Optional: Analytics
VITE_ENABLE_ANALYTICS=false

# Optional: Development Mode
VITE_DEV_MODE=true
```

**Note**: Replace values with your Supabase project details if using your own instance.

### Edge Functions Environment (Supabase Secrets)

If running Edge Functions locally, you need API keys:

```bash
# OpenRouter Keys (for chat and artifacts - single keys, no rotation)
OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-...  # Chat, summaries, titles
OPENROUTER_SHERLOCK_FREE_KEY=sk-or-v1-... # Artifact generation
OPENROUTER_K2T_KEY=sk-or-v1-...           # Artifact error fixing (Kimi K2)

# Google AI Keys (for IMAGE GENERATION ONLY - uses 10-key rotation pool)
# Production: 10 keys = 150 RPM total (15 RPM per key)
# Local dev: 1-2 keys are sufficient
GOOGLE_KEY_1=AIzaSy...
GOOGLE_KEY_2=AIzaSy...
```

**Getting API Keys**:

1. **OpenRouter**:
   - Go to [openrouter.ai/keys](https://openrouter.ai/keys)
   - Sign up and create API key
   - Free tier available

2. **Google AI Studio**:
   - Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
   - Sign in with Google account
   - Create API key (free tier available)

**Set Local Secrets**:

```bash
# Create .env.local for Edge Functions
cd supabase/functions
cat > .env.local <<EOF
OPENROUTER_GEMINI_FLASH_KEY=your_key_here
OPENROUTER_SHERLOCK_FREE_KEY=your_key_here
OPENROUTER_K2T_KEY=your_key_here
GOOGLE_KEY_1=your_key_here
GOOGLE_KEY_2=your_key_here
EOF
```

---

## Running the Application

### Development Server

```bash
# Start frontend development server
npm run dev

# App available at: http://localhost:8080
```

**Development Server Features**:
- Hot Module Replacement (HMR)
- Automatic recompilation
- Source maps for debugging
- Fast refresh

### Build for Production

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

### Lint Code

```bash
# Check for linting errors
npm run lint

# Auto-fix issues
npm run lint --fix
```

---

## Development Workflow

### Typical Development Session

```bash
# 1. Update main branch
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature

# 3. Start dev server
npm run dev

# 4. Make changes and test

# 5. Run tests
npm run test

# 6. Commit changes
git add .
git commit -m "feat: add your feature"

# 7. Push to GitHub
git push origin feature/your-feature

# 8. Create Pull Request on GitHub
```

### Hot Reload

The dev server supports hot reload for:
- ✅ React components
- ✅ TypeScript files
- ✅ CSS/Tailwind classes
- ✅ Environment variables (requires restart)

### Browser DevTools

**Recommended Setup**:

1. Open Chrome DevTools (`F12`)
2. Go to Console tab for logs
3. Go to Network tab to monitor API calls
4. Go to Application tab for storage/cache

**Useful Console Commands**:

```javascript
// Check authentication status
localStorage.getItem('supabase.auth.token')

// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Get current session
supabase.auth.getSession().then(console.log)
```

---

## Database Setup

### Local Database (Optional)

For advanced development, run Supabase locally:

```bash
# Start local Supabase
supabase start

# This starts:
# - PostgreSQL database
# - PostgREST API
# - Realtime server
# - Storage API
# - Auth server

# Stop local instance
supabase stop
```

**Local Instance URLs**:
- API: `http://localhost:54321`
- Studio: `http://localhost:54323`
- Database: `postgresql://postgres:postgres@localhost:54322/postgres`

### Database Migrations

#### Create New Migration

```bash
# Generate migration file
supabase migration new migration_name

# Edit the generated SQL file in supabase/migrations/
```

#### Apply Migrations

```bash
# Apply to local database
supabase db reset

# Apply to remote database
supabase db push
```

### Seed Data

Create `supabase/seed.sql` for development data:

```sql
-- Insert test user (for development only)
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com');

-- Insert test session
INSERT INTO chat_sessions (id, user_id, title)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000001',
  'Test Chat Session'
);
```

Run seed:

```bash
supabase db reset --seed
```

---

## Edge Functions Development

### Running Edge Functions Locally

```bash
# Install Deno (required for Edge Functions)
curl -fsSL https://deno.land/install.sh | sh

# Serve all functions locally
supabase functions serve

# Serve specific function
supabase functions serve chat

# Functions available at:
# http://localhost:54321/functions/v1/function-name
```

### Testing Edge Functions

```bash
# Send test request
curl -X POST http://localhost:54321/functions/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"sessionId":"test"}'
```

### Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy chat
```

### Edge Function Logs

```bash
# View logs (live stream)
supabase functions logs chat

# View logs (specific time range)
supabase functions logs chat --since 1h
```

---

## Testing

### Run Tests

```bash
# All tests
npm run test

# Specific file
npm run test -- ChatMessage.test.tsx

# With coverage
npm run test:coverage

# Watch mode (re-run on changes)
npm run test -- --watch

# UI mode (interactive)
npm run test:ui
```

### Test Coverage

```bash
# Generate coverage report
npm run test:coverage

# Coverage files in:
# - coverage/index.html (HTML report)
# - coverage/lcov.info (LCOV format)
```

**Coverage Thresholds**:
- Statements: 55%
- Branches: 50%
- Functions: 55%
- Lines: 55%

### Writing Tests

Create test file alongside component:

```
src/components/
├── ChatMessage.tsx
└── ChatMessage.test.tsx
```

Basic test structure:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  it('should render message content', () => {
    render(<ChatMessage content="Hello" role="user" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Common Issues

#### Port 8080 already in use

```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- --port 3000
```

#### Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript errors

```bash
# Restart TypeScript server (VS Code)
# Ctrl+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild TypeScript
npm run build
```

#### Supabase connection issues

```bash
# Check if Supabase is accessible
curl https://vznhbocnuykdmjvujaka.supabase.co/rest/v1/

# Should return API info, not error
```

#### Edge Function errors

```bash
# Check function logs
supabase functions logs function-name

# Verify environment variables
supabase secrets list
```

### Getting Help

If you're stuck:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Search [GitHub Issues](https://github.com/NickB03/llm-chat-site/issues)
3. Ask in GitHub Discussions
4. Create new issue with "Help Wanted" label

---

## Useful Commands Reference

```bash
# Development
npm run dev                  # Start dev server
npm run build                # Production build
npm run preview              # Preview production build
npm run lint                 # Check for linting errors

# Testing
npm run test                 # Run tests
npm run test:coverage        # With coverage
npm run test:ui              # Interactive UI

# Supabase
supabase start               # Start local instance
supabase stop                # Stop local instance
supabase db reset            # Reset database
supabase functions serve     # Serve Edge Functions locally
supabase functions deploy    # Deploy Edge Functions

# Git
git checkout -b feature/name # Create feature branch
git add .                    # Stage changes
git commit -m "message"      # Commit changes
git push origin branch-name  # Push to GitHub
```

---

## Next Steps

After setup:

1. **Read** [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
2. **Explore** codebase structure in [README.md](../README.md)
3. **Check** [API_REFERENCE.md](./API_REFERENCE.md) for API documentation
4. **Review** [HOOKS_REFERENCE.md](./HOOKS_REFERENCE.md) for React hooks
5. **Find** a [Good First Issue](https://github.com/NickB03/llm-chat-site/labels/good%20first%20issue)

---

**Last Updated**: 2025-11-17

Happy coding! 🚀

If you have questions, please open an issue or discussion on GitHub.

# VANA UI Integration Setup

This document provides instructions for setting up and running the VANA UI integration.

## Status: ✅ INTEGRATION COMPLETE

The VANA UI has been successfully integrated with the backend system! The frontend now communicates properly with the VANA agent through a custom chat endpoint.

## Overview

The VANA UI is a React-based frontend from https://github.com/NickB03/vana-ui that connects to the VANA backend API. It provides a chat interface for interacting with the VANA multi-agent AI system.

### What's Working:
- ✅ Frontend-backend communication via custom `/chat` endpoint
- ✅ UI components preserved from original design
- ✅ Auto port detection (frontend on 5174, backend on 8081)
- ✅ CORS configuration for local development
- ✅ Error handling and fallback mechanisms
- ✅ Single command startup (`./start-vana-ui.sh`)

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Python 3.13+ (required for VANA backend)
- Google API key configured in `.env` file

## Quick Start

1. **Ensure your API key is configured:**
   ```bash
   # Check that your .env file has your Google API key
   cat .env
   # Should show: GOOGLE_API_KEY=your-key-here
   ```

2. **Run the integrated UI:**
   ```bash
   ./start-vana-ui.sh
   ```

This will:
- Start the VANA backend on port 8081
- Start the VANA UI frontend on port 5173
- Open http://localhost:5173 in your browser

## Manual Setup (Alternative)

If you prefer to run the services separately:

1. **Start the VANA backend:**
   ```bash
   python main.py
   ```

2. **Start the frontend (in a new terminal):**
   ```bash
   cd vana-ui
   npm run dev
   ```

## Configuration

### Frontend Configuration

The frontend uses environment variables for configuration:

```bash
# vana-ui/.env
VITE_API_URL=http://localhost:8081
```

### Backend Configuration

The backend configuration is in `.env` or `.env.local`:

```bash
# .env or .env.local
GOOGLE_API_KEY=your-google-api-key
VANA_MODEL=gemini-2.0-flash
GOOGLE_CLOUD_PROJECT=your-project-id
ENVIRONMENT=development
```

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS (lovable.dev UI)
- **Backend**: FastAPI + Google ADK + Multi-agent system
- **Communication**: REST API with JSON-RPC endpoints

## API Endpoints

The frontend communicates with these backend endpoints:

- `POST /agent/vana/rpc` - Main agent interaction endpoint
- `POST /chat` - Simple chat endpoint (fallback)
- `GET /health` - Health check
- `GET /info` - Agent information

## Troubleshooting

### Backend Issues

1. **Port 8081 already in use:**
   ```bash
   lsof -i :8081
   kill -9 <PID>
   ```

2. **Python version error:**
   ```bash
   python3.13 --version  # Must be 3.13+
   poetry env use python3.13
   ```

3. **API key not working:**
   - Ensure GOOGLE_API_KEY is set in .env
   - Check Google Cloud project permissions

### Frontend Issues

1. **Port 5173 already in use:**
   ```bash
   lsof -i :5173
   kill -9 <PID>
   ```

2. **Cannot connect to backend:**
   - Check backend is running on port 8081
   - Verify VITE_API_URL in frontend .env
   - Check for CORS issues in browser console

3. **UI not updating:**
   - Clear browser cache
   - Restart the frontend dev server

## Development

### Making Changes

1. **Frontend changes:**
   - Edit files in `vana-ui/src/`
   - Changes auto-reload in browser

2. **Backend changes:**
   - Edit files in VANA directory
   - Restart backend to apply changes

### Adding Features

1. **New API endpoints:**
   - Add to `main.py`
   - Update `vana-ui/src/services/api.ts`

2. **New UI components:**
   - Add to `vana-ui/src/components/`
   - Import in relevant pages

## Directory Structure

```
vana/                          # VANA backend
├── main.py                    # FastAPI application
├── agents/                    # Multi-agent implementations
├── .env                       # Environment configuration
├── start-vana-ui.sh          # Integration startup script
└── vana-ui/                  # VANA UI frontend (cloned from GitHub)
    ├── src/
    │   ├── pages/            # Page components
    │   ├── components/       # UI components
    │   ├── services/         # API services
    │   └── types/            # TypeScript types
    ├── .env                  # Frontend configuration
    └── package.json          # Dependencies
```

## Security Notes

- Never commit API keys to version control
- Use environment variables for sensitive data
- Enable CORS only for trusted origins in production
- Implement proper authentication before deploying

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in both terminal windows
3. Check browser console for frontend errors
4. Verify all environment variables are set correctly

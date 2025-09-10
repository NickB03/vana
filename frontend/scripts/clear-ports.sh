#!/bin/bash

# Port Management Utility Script
# Ensures services run on designated ports by killing conflicting processes

echo "🚨 PORT MANAGEMENT: Enforcing designated ports..."

# Kill processes on port 3000 (Frontend)
echo "Clearing port 3000 for frontend..."
kill -9 $(lsof -ti:3000) 2>/dev/null || echo "Port 3000 already free"

# Kill processes on port 8000 (Backend) 
echo "Clearing port 8000 for backend..."
kill -9 $(lsof -ti:8000) 2>/dev/null || echo "Port 8000 already free"

echo "✅ Designated ports cleared and ready for services"
echo "Frontend will use: http://localhost:3000"
echo "Backend will use: http://localhost:8000"
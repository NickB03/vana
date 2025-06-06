#!/usr/bin/env python3
"""
VANA Enhanced Dashboard Startup Script

Starts both the React frontend and Flask backend for the enhanced VANA dashboard
with authentication and real-time chat capabilities.
"""

import os
import sys
import subprocess
import time
import signal
import threading
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def install_dependencies():
    """Install required dependencies for the enhanced dashboard."""
    print("🔧 Installing Python dependencies...")
    
    try:
        # Install Python dependencies
        subprocess.run([
            sys.executable, "-m", "pip", "install", 
            "flask>=2.3.3",
            "flask-socketio>=5.3.6", 
            "flask-cors>=4.0.0",
            "pyjwt>=2.8.0",
            "werkzeug>=2.3.7",
            "python-socketio>=5.9.0",
            "eventlet>=0.33.3"
        ], check=True)
        print("✅ Python dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install Python dependencies: {e}")
        return False
    
    # Check if Node.js is available for React frontend
    try:
        subprocess.run(["node", "--version"], check=True, capture_output=True)
        subprocess.run(["npm", "--version"], check=True, capture_output=True)
        print("✅ Node.js and npm are available")
        
        # Install React dependencies
        frontend_dir = Path(__file__).parent / "frontend"
        if frontend_dir.exists():
            print("🔧 Installing React dependencies...")
            subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
            print("✅ React dependencies installed successfully")
        
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  Node.js not found. React frontend will not be available.")
        print("   Install Node.js from https://nodejs.org/ to enable the full UI")
        return False
    
    return True

def start_backend():
    """Start the Flask backend server."""
    print("🚀 Starting Flask backend server...")
    
    # Set environment variables
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_DEBUG'] = '1'
    
    try:
        from dashboard.api.chat_server import app, socketio
        socketio.run(app, host='0.0.0.0', port=5001, debug=False)
    except Exception as e:
        print(f"❌ Failed to start backend server: {e}")
        sys.exit(1)

def start_frontend():
    """Start the React frontend development server."""
    frontend_dir = Path(__file__).parent / "frontend"
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return
    
    print("🚀 Starting React frontend server...")
    
    try:
        # Set environment variables for React
        env = os.environ.copy()
        env['REACT_APP_API_URL'] = 'http://localhost:5001'
        env['BROWSER'] = 'none'  # Don't auto-open browser
        
        subprocess.run(["npm", "start"], cwd=frontend_dir, env=env)
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start frontend server: {e}")
    except KeyboardInterrupt:
        print("🛑 Frontend server stopped")

def main():
    """Main startup function."""
    print("🎯 VANA Enhanced Dashboard Startup")
    print("=" * 50)
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Dependency installation failed. Exiting.")
        sys.exit(1)
    
    print("\n🚀 Starting VANA Enhanced Dashboard...")
    print("Backend API: http://localhost:5001")
    print("Frontend UI: http://localhost:3000")
    print("=" * 50)
    
    # Start backend in a separate thread
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    backend_thread.start()
    
    # Give backend time to start
    time.sleep(3)
    
    # Start frontend (this will block)
    try:
        start_frontend()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down VANA Enhanced Dashboard...")
        sys.exit(0)

if __name__ == "__main__":
    main()

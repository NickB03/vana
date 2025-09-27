#!/usr/bin/env python3
"""
Script to restore ADK UI functionality alongside the API backend.

This script provides options to run the backend with proper ADK UI support.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

# Get project root
PROJECT_ROOT = Path(__file__).parent.parent


def setup_environment():
    """Set up required environment variables."""
    env = os.environ.copy()

    # Load from .env.local if it exists
    env_file = PROJECT_ROOT / ".env.local"
    if env_file.exists():
        print(f"✅ Loading environment from {env_file}")
        with open(env_file) as f:
            for line in f:
                if line.strip() and not line.startswith("#"):
                    if "=" in line:
                        key, value = line.strip().split("=", 1)
                        env[key] = value.strip('"').strip("'")

    return env


def run_adk_web_server(port=8000, host="127.0.0.1"):
    """Run the ADK web server with UI enabled."""
    print("\n🚀 Starting ADK Web Server with UI...")
    print(f"   Server will be available at: http://{host}:{port}")
    print(f"   ADK UI will be at: http://{host}:{port}/")
    print(f"   API docs will be at: http://{host}:{port}/docs")

    env = setup_environment()

    # Command to run ADK web server
    cmd = [
        sys.executable, "-m", "google.adk.cli", "web",
        "--host", host,
        "--port", str(port),
        "--reload",
        "--allow_origins", "http://localhost:3000",
        "--allow_origins", "http://localhost:3001",
        str(PROJECT_ROOT / "agents")  # Point to agents directory
    ]

    # Add session storage if configured
    session_db = PROJECT_ROOT / "sessions.db"
    cmd.extend(["--session_service_uri", f"sqlite:///{session_db}"])

    print(f"\n📝 Running command:")
    print(f"   {' '.join(cmd)}")

    try:
        subprocess.run(cmd, env=env, cwd=PROJECT_ROOT)
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error running server: {e}")
        sys.exit(1)


def run_adk_api_server(port=8000, host="127.0.0.1"):
    """Run the ADK API server without UI."""
    print("\n🚀 Starting ADK API Server (no UI)...")
    print(f"   API will be available at: http://{host}:{port}")
    print(f"   API docs will be at: http://{host}:{port}/docs")

    env = setup_environment()

    # Command to run ADK API server
    cmd = [
        sys.executable, "-m", "google.adk.cli", "api_server",
        "--host", host,
        "--port", str(port),
        "--reload",
        "--allow_origins", "http://localhost:3000",
        "--allow_origins", "http://localhost:3001",
        str(PROJECT_ROOT / "agents")
    ]

    # Add session storage
    session_db = PROJECT_ROOT / "sessions.db"
    cmd.extend(["--session_service_uri", f"sqlite:///{session_db}"])

    print(f"\n📝 Running command:")
    print(f"   {' '.join(cmd)}")

    try:
        subprocess.run(cmd, env=env, cwd=PROJECT_ROOT)
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error running server: {e}")
        sys.exit(1)


def run_custom_server():
    """Run the custom server.py implementation."""
    print("\n🚀 Starting Custom Backend Server...")
    print("   This uses the modified app/server.py")

    env = setup_environment()

    cmd = [
        sys.executable, "-m", "uvicorn",
        "app.server:app",
        "--reload",
        "--port", "8000",
        "--host", "127.0.0.1"
    ]

    print(f"\n📝 Running command:")
    print(f"   {' '.join(cmd)}")

    try:
        subprocess.run(cmd, env=env, cwd=PROJECT_ROOT)
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error running server: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Restore ADK UI functionality"
    )
    parser.add_argument(
        "mode",
        choices=["web", "api", "custom"],
        help="Server mode: 'web' (with UI), 'api' (no UI), or 'custom' (current implementation)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to run server on (default: 8000)"
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1)"
    )

    args = parser.parse_args()

    print(f"""
╔══════════════════════════════════════════════════╗
║          ADK Backend Restoration Tool            ║
╚══════════════════════════════════════════════════╝

Mode: {args.mode}
Host: {args.host}
Port: {args.port}
    """)

    # Ensure we're in the virtual environment
    if not sys.prefix.endswith("venv"):
        print("⚠️  Warning: Not running in virtual environment!")
        print("   Run: source venv/bin/activate")

    # Check if agents directory exists
    agents_dir = PROJECT_ROOT / "agents"
    if not agents_dir.exists():
        print(f"❌ Agents directory not found at {agents_dir}")
        sys.exit(1)

    # Run selected mode
    if args.mode == "web":
        run_adk_web_server(args.port, args.host)
    elif args.mode == "api":
        run_adk_api_server(args.port, args.host)
    else:  # custom
        run_custom_server()


if __name__ == "__main__":
    main()
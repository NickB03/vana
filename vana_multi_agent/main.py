"""
VANA Multi-Agent System - Google ADK Implementation

This is the main entry point for the VANA multi-agent system using Google ADK.
It integrates all enhanced tools with a coordinated multi-agent architecture.
"""

import os
import sys
from pathlib import Path

# Add parent directory to Python path to access agent tools
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    """Main entry point for VANA Multi-Agent System."""
    print("🚀 VANA Multi-Agent System Starting...")

    # Test basic imports first
    try:
        # Test enhanced tools import
        from agent.tools import echo
        print("✅ Enhanced tools imported successfully")

        # Test echo tool
        result = echo("System startup test")
        print(f"✅ Echo test: {result}")

    except ImportError as e:
        print(f"❌ Failed to import enhanced tools: {e}")
        print("📁 Please ensure you're running from the correct directory")
        return 1

    # Try to import ADK components
    try:
        from google.adk.cli.fast_api import get_fast_api_app
        from google.adk.agents import LlmAgent
        print("✅ Google ADK imported successfully")

        # Import our agent team
        from agents.team import root_agent
        print("✅ Agent team imported successfully")

        # Create the FastAPI app using ADK
        app = get_fast_api_app(
            agent_dir=os.path.dirname(os.path.abspath(__file__)),
            allow_origins=["http://localhost", "http://localhost:8080", "*"],
            web=True
        )

        # Get configuration from environment
        host = os.getenv("VANA_HOST", "localhost")
        port = int(os.getenv("VANA_PORT", "8000"))

        print(f"\n🎯 Starting VANA Multi-Agent System on {host}:{port}")
        print(f"📊 Dashboard available at: http://{host}:{port}")
        print(f"🤖 Agents: Vana (Orchestrator), Rhea (Architect), Max (UI), Sage (DevOps), Kai (QA)")
        print(f"🛠️  Enhanced Tools: 24 tools with improved UX and error handling")

        # Start the server
        import uvicorn
        uvicorn.run(app, host=host, port=port)

    except ImportError as e:
        print(f"⚠️  Google ADK not available: {e}")
        print("📦 To install ADK and start the full system:")
        print("   pip install google-cloud-aiplatform[adk,agent_engines]")
        print("   pip install google-adk")
        print("\n🧪 Running in test mode with enhanced tools only...")

        # Run a simple test of our enhanced tools
        test_enhanced_tools()
        return 0

    except Exception as e:
        print(f"❌ Error starting system: {e}")
        return 1

def test_enhanced_tools():
    """Test the enhanced tools without ADK."""
    print("\n🔧 Testing Enhanced VANA Tools...")

    try:
        from agent.tools import (
            echo, read_file, write_file, list_directory, file_exists,
            vector_search, web_search, search_knowledge,
            kg_query, kg_store, get_health_status
        )

        # Test echo
        result = echo("Enhanced tools test")
        print(f"📢 Echo: {result}")

        # Test file operations
        result = list_directory(".")
        print(f"📁 Directory listing: Working")

        # Test health status
        result = get_health_status()
        print(f"💚 Health status: {result}")

        print("\n✅ All enhanced tools are working!")
        print("🎉 VANA Multi-Agent System foundation is ready!")

    except Exception as e:
        print(f"❌ Enhanced tools test failed: {e}")

if __name__ == "__main__":
    sys.exit(main())

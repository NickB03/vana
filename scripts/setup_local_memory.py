#!/usr/bin/env python3
"""
Local Memory Setup Script for VANA
Sets up ChromaDB + sentence-transformers + MCP server in one command
"""

import subprocess
import sys
import json
from pathlib import Path

def install_dependencies():
    """Install required packages"""
    packages = [
        "chromadb>=0.4.0",
        "sentence-transformers>=2.2.0", 
        "fastmcp>=0.2.0"
    ]
    
    print("📦 Installing dependencies...")
    for package in packages:
        print(f"Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    
    print("✅ Dependencies installed successfully!")

def create_memory_directories():
    """Create necessary directories"""
    directories = [
        ".memory_db",
        "scripts"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"📁 Created directory: {directory}")

def create_claude_config_snippet():
    """Generate Claude desktop config snippet"""
    
    config_snippet = {
        "vana-local-memory": {
            "command": "python",
            "args": [str(Path.cwd() / "scripts" / "local_memory_server.py")],
            "env": {
                "MEMORY_DB_PATH": str(Path.cwd() / ".memory_db")
            }
        }
    }
    
    config_file = Path("claude_memory_config.json")
    with open(config_file, 'w') as f:
        json.dump(config_snippet, f, indent=2)
    
    print(f"⚙️ Claude config snippet saved to: {config_file}")
    print("\n📋 Add this to your Claude desktop config mcpServers section:")
    print(json.dumps(config_snippet, indent=2))

def test_installation():
    """Test if everything is working"""
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer
        
        # Test ChromaDB
        client = chromadb.Client()
        collection = client.create_collection("test")
        del collection  # Clean up test collection
        print("✅ ChromaDB working")
        
        # Test sentence-transformers (download small model)
        model = SentenceTransformer("all-MiniLM-L6-v2")
        test_embedding = model.encode(["test text"])
        del test_embedding  # Clean up test embedding
        print("✅ Sentence transformers working")
        
        print("\n🎉 Local memory system ready!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing installation: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up VANA Local Memory System...")
    print("=" * 50)
    
    try:
        # Step 1: Install dependencies
        install_dependencies()
        
        # Step 2: Create directories
        create_memory_directories()
        
        # Step 3: Generate config
        create_claude_config_snippet()
        
        # Step 4: Test installation
        if test_installation():
            print("\n" + "=" * 50)
            print("✅ Setup complete!")
            print("\nNext steps:")
            print("1. Copy the config snippet to your Claude desktop config")
            print("2. Run: python scripts/local_memory_server.py --index-existing")
            print("3. Start using local memory search in Claude!")
        else:
            print("❌ Setup encountered issues. Check error messages above.")
            
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
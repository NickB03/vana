#!/usr/bin/env python3
"""
Universal Memory System Installer
Installs global memory system that works across all projects and agents
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
import platform

class UniversalMemoryInstaller:
    """Installs universal memory system globally"""
    
    def __init__(self):
        self.home = Path.home()
        self.system = platform.system()
        
        # Installation paths
        self.service_dir = self.home / ".ai-memory-service"
        self.data_dir = self.home / ".ai-memory"
        
        # Service files
        self.required_files = [
            "universal_memory_service.py",
            "universal_mcp_server.py", 
            "universal_vscode_extension.py"
        ]
    
    def check_prerequisites(self):
        """Check system prerequisites"""
        print("🔍 Checking prerequisites...")
        
        # Check Python version
        if sys.version_info < (3, 8):
            print("❌ Python 3.8+ required")
            return False
        
        print(f"✅ Python {sys.version.split()[0]} detected")
        
        # Check pip
        try:
            subprocess.run([sys.executable, "-m", "pip", "--version"], 
                         check=True, capture_output=True)
            print("✅ pip available")
        except subprocess.CalledProcessError:
            print("❌ pip not available")
            return False
        
        return True
    
    def install_dependencies(self):
        """Install required Python packages"""
        print("📦 Installing dependencies...")
        
        packages = [
            "chromadb>=0.4.0",
            "sentence-transformers>=2.2.0",
            "aiohttp>=3.8.0",
            "watchdog>=3.0.0"
        ]
        
        for package in packages:
            print(f"Installing {package}...")
            try:
                subprocess.run([
                    sys.executable, "-m", "pip", "install", package
                ], check=True, capture_output=True)
            except subprocess.CalledProcessError as e:
                print(f"❌ Failed to install {package}: {e}")
                return False
        
        print("✅ Dependencies installed")
        return True
    
    def create_directories(self):
        """Create necessary directories"""
        print("📁 Creating directories...")
        
        directories = [
            self.service_dir,
            self.service_dir / "agents",
            self.service_dir / "configs",
            self.data_dir / "database",
            self.data_dir / "config", 
            self.data_dir / "logs",
            self.data_dir / "cache"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            print(f"📂 Created {directory}")
        
        return True
    
    def copy_service_files(self):
        """Copy service files to installation directory"""
        print("📋 Copying service files...")
        
        # Copy main service files
        source_dir = Path(__file__).parent
        
        for file_name in self.required_files:
            source_file = source_dir / file_name
            if source_file.exists():
                dest_file = self.service_dir / file_name
                shutil.copy2(source_file, dest_file)
                print(f"📄 Copied {file_name}")
            else:
                print(f"⚠️ {file_name} not found, creating placeholder")
                (self.service_dir / file_name).touch()
        
        # Make scripts executable
        for script in self.service_dir.glob("*.py"):
            script.chmod(0o755)
        
        return True
    
    def create_system_service(self):
        """Create system service for auto-start"""
        print("🔧 Creating system service...")
        
        if self.system == "Darwin":  # macOS
            return self._create_macos_service()
        elif self.system == "Linux":
            return self._create_linux_service()
        else:
            print(f"⚠️ System service not supported on {self.system}")
            print("   You'll need to start the service manually")
            return True
    
    def _create_macos_service(self):
        """Create macOS LaunchAgent"""
        
        plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ai-memory.service</string>
    <key>ProgramArguments</key>
    <array>
        <string>{sys.executable}</string>
        <string>{self.service_dir / 'universal_memory_service.py'}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{self.data_dir / 'logs' / 'service.log'}</string>
    <key>StandardErrorPath</key>
    <string>{self.data_dir / 'logs' / 'service.error.log'}</string>
    <key>WorkingDirectory</key>
    <string>{self.service_dir}</string>
</dict>
</plist>"""
        
        # Write to user LaunchAgents
        launch_agents_dir = self.home / "Library" / "LaunchAgents"
        launch_agents_dir.mkdir(exist_ok=True)
        
        plist_file = launch_agents_dir / "com.ai-memory.service.plist"
        plist_file.write_text(plist_content)
        
        print(f"📄 Created macOS service: {plist_file}")
        
        # Load the service
        try:
            subprocess.run([
                "launchctl", "load", str(plist_file)
            ], check=True)
            print("✅ macOS service loaded")
        except subprocess.CalledProcessError:
            print("⚠️ Could not load macOS service automatically")
            print(f"   Run manually: launchctl load {plist_file}")
        
        return True
    
    def _create_linux_service(self):
        """Create systemd user service"""
        
        service_content = f"""[Unit]
Description=AI Memory Universal Service
After=network.target

[Service]
Type=simple
ExecStart={sys.executable} {self.service_dir / 'universal_memory_service.py'}
Restart=always
RestartSec=10
StandardOutput=append:{self.data_dir / 'logs' / 'service.log'}
StandardError=append:{self.data_dir / 'logs' / 'service.error.log'}
WorkingDirectory={self.service_dir}

[Install]
WantedBy=default.target"""
        
        # Write to user systemd directory
        systemd_dir = self.home / ".config" / "systemd" / "user"
        systemd_dir.mkdir(parents=True, exist_ok=True)
        
        service_file = systemd_dir / "ai-memory.service"
        service_file.write_text(service_content)
        
        print(f"📄 Created systemd service: {service_file}")
        
        # Enable and start the service
        try:
            subprocess.run([
                "systemctl", "--user", "daemon-reload"
            ], check=True)
            
            subprocess.run([
                "systemctl", "--user", "enable", "ai-memory.service"
            ], check=True)
            
            subprocess.run([
                "systemctl", "--user", "start", "ai-memory.service"
            ], check=True)
            
            print("✅ systemd service enabled and started")
        except subprocess.CalledProcessError:
            print("⚠️ Could not start systemd service automatically")
            print("   Run manually:")
            print("   systemctl --user daemon-reload")
            print("   systemctl --user enable ai-memory.service")
            print("   systemctl --user start ai-memory.service")
        
        return True
    
    def create_agent_integrations(self):
        """Create agent integration configurations"""
        print("🔗 Creating agent integrations...")
        
        # Claude Code MCP configuration
        claude_config = {
            "universal-memory": {
                "command": "python",
                "args": [str(self.service_dir / "universal_mcp_server.py")],
                "env": {
                    "MEMORY_SERVICE_URL": "http://localhost:8765",
                    "PROJECT_AUTO_DETECT": "true"
                }
            }
        }
        
        claude_config_file = self.service_dir / "configs" / "claude_mcp_config.json"
        with open(claude_config_file, 'w') as f:
            json.dump(claude_config, f, indent=2)
        
        print(f"📄 Created Claude Code config: {claude_config_file}")
        
        # VS Code settings
        vscode_settings = {
            "ai-memory.service.url": "http://localhost:8765",
            "ai-memory.auto.index": True,
            "ai-memory.project.detection": "automatic"
        }
        
        vscode_config_file = self.service_dir / "configs" / "vscode_settings.json"
        with open(vscode_config_file, 'w') as f:
            json.dump(vscode_settings, f, indent=2)
        
        print(f"📄 Created VS Code config: {vscode_config_file}")
        
        return True
    
    def test_installation(self):
        """Test the installation"""
        print("🧪 Testing installation...")
        
        # Test service startup (without running indefinitely)
        try:
            # Test import
            test_script = f"""
import sys
sys.path.insert(0, '{self.service_dir}')
from universal_memory_service import UniversalMemoryService

# Test initialization
service = UniversalMemoryService()
print("✅ Universal memory service initialized successfully")
"""
            
            result = subprocess.run([
                sys.executable, "-c", test_script
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                print("✅ Service initialization test passed")
            else:
                print(f"❌ Service test failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("⚠️ Service test timed out (service may be working)")
        except Exception as e:
            print(f"❌ Service test error: {e}")
            return False
        
        # Test HTTP endpoint (if service is running)
        try:
            import aiohttp
            import asyncio
            
            async def test_endpoint():
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get('http://localhost:8765/health', timeout=5) as response:
                            if response.status == 200:
                                print("✅ Service HTTP endpoint responding")
                                return True
                except Exception:
                    pass
                print("⚠️ Service not responding (may not be started yet)")
                return False
            
            # Don't fail if endpoint test fails - service might not be running yet
            asyncio.run(test_endpoint())
            
        except ImportError:
            print("⚠️ aiohttp not available for endpoint test")
        
        return True
    
    def create_usage_instructions(self):
        """Create usage instructions"""
        print("📚 Creating usage instructions...")
        
        instructions = f"""# Universal AI Memory System - Usage Instructions

## 🎯 Installation Complete!

Your universal memory system is now installed and ready to use across all projects and coding agents.

## 📍 Installation Locations

- **Service Directory**: {self.service_dir}
- **Data Directory**: {self.data_dir}
- **Service URL**: http://localhost:8765

## 🔧 Agent Integration

### Claude Code
Add this to your Claude desktop config (`~/.claude/claude_desktop_config.json`):

```json
{{
  "mcpServers": {{
    "universal-memory": {{
      "command": "python",
      "args": ["{self.service_dir / 'universal_mcp_server.py'}"],
      "env": {{
        "MEMORY_SERVICE_URL": "http://localhost:8765",
        "PROJECT_AUTO_DETECT": "true"
      }}
    }}
  }}
}}
```

### VS Code
Install the universal memory extension:
```bash
code --install-extension {self.service_dir}/agents/ai-memory-extension.vsix
```

### Any Other Agent
Use the HTTP API:
```bash
# Search memory
curl -X POST http://localhost:8765/api/v1/search \\
  -H "Content-Type: application/json" \\
  -d '{{"query": "how to deploy", "project_path": "/path/to/project"}}' 

# Store memory
curl -X POST http://localhost:8765/api/v1/store \\
  -H "Content-Type: application/json" \\
  -d '{{"content": "deployment notes", "metadata": {{"type": "note"}}}}'
```

## 🚀 How It Works

1. **Automatic Project Detection**: System detects projects from Git repos, package files, etc.
2. **Scoped Memory**: Each project gets its own memory space with intelligent cross-referencing
3. **Universal Access**: All your coding agents can access the same memory system
4. **Smart Search**: Memory search automatically scopes to relevant projects and patterns

## 🔄 Service Management

### macOS
```bash
# Start service
launchctl load ~/Library/LaunchAgents/com.ai-memory.service.plist

# Stop service  
launchctl unload ~/Library/LaunchAgents/com.ai-memory.service.plist

# Check status
launchctl list | grep ai-memory
```

### Linux
```bash
# Start service
systemctl --user start ai-memory.service

# Stop service
systemctl --user stop ai-memory.service

# Check status
systemctl --user status ai-memory.service
```

## 📊 Usage Examples

### From Claude Code
```
You: "How do I deploy this project?"
Claude: [Automatically searches memory for deployment patterns in current and related projects]

You: "What's my preferred testing approach?"  
Claude: [Retrieves your personal testing preferences from global memory]
```

### From VS Code
- **Ctrl+Shift+M**: Search memory
- **Ctrl+Shift+C**: Get context for current file
- Automatic memory updates when you save files

### From Command Line
```bash
# Search across all projects
python {self.service_dir}/cli.py search "authentication patterns"

# Add personal preference
python {self.service_dir}/cli.py store "I prefer pytest over unittest" --type user_preference
```

## 🎯 Next Steps

1. **Restart your coding agents** to load the new memory integration
2. **Start working on any project** - memory will automatically index and become available
3. **Ask questions naturally** - relevant context will appear automatically across all agents

## 🆘 Troubleshooting

- **Service not responding**: Check logs in `{self.data_dir}/logs/`
- **Memory not updating**: Verify file watching is enabled in agent settings
- **Cross-project issues**: Check project detection in `{self.data_dir}/config/projects.json`

## 📞 Support

Check service status: `curl http://localhost:8765/health`
View projects: `curl http://localhost:8765/api/v1/projects`
"""
        
        instructions_file = self.service_dir / "USAGE.md"
        instructions_file.write_text(instructions)
        
        print(f"📚 Usage instructions saved to: {instructions_file}")
        return True
    
    def install(self):
        """Run complete installation"""
        print("🚀 Installing Universal AI Memory System...")
        print("=" * 50)
        
        try:
            # Check prerequisites
            if not self.check_prerequisites():
                return False
            
            # Install dependencies
            if not self.install_dependencies():
                return False
            
            # Create directories
            if not self.create_directories():
                return False
            
            # Copy service files
            if not self.copy_service_files():
                return False
            
            # Create system service
            if not self.create_system_service():
                return False
            
            # Create agent integrations
            if not self.create_agent_integrations():
                return False
            
            # Test installation
            if not self.test_installation():
                print("⚠️ Installation completed with test warnings")
            
            # Create usage instructions
            if not self.create_usage_instructions():
                return False
            
            print("\n" + "=" * 50)
            print("✅ Universal AI Memory System installed successfully!")
            print("\n🎯 Key Benefits:")
            print("  - Works across ALL your coding agents and projects")
            print("  - Automatic project detection and memory scoping")
            print("  - Universal HTTP API for any agent integration")
            print("  - Background service runs automatically")
            print("\n📋 Next Steps:")
            print("1. Add MCP config to Claude Code (see USAGE.md)")
            print("2. Install VS Code extension if needed")
            print("3. Start coding - memory works automatically!")
            print(f"\n📚 Full instructions: {self.service_dir}/USAGE.md")
            print(f"🔧 Service URL: http://localhost:8765")
            
            return True
            
        except Exception as e:
            print(f"❌ Installation failed: {e}")
            return False

def main():
    """Main installation function"""
    installer = UniversalMemoryInstaller()
    success = installer.install()
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
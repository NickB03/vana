#!/usr/bin/env python3
"""
VANA Production Readiness Validation Script
Validates all components are ready for deployment
"""

import ast
import asyncio
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


class ProductionValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.successes = []
        
    def log_success(self, message: str):
        self.successes.append(message)
        print(f"✅ {message}")
        
    def log_error(self, message: str):
        self.errors.append(message)
        print(f"❌ {message}")
        
    def log_warning(self, message: str):
        self.warnings.append(message)
        print(f"⚠️  {message}")

    def validate_environment_variables(self) -> bool:
        """Check all required environment variables"""
        print("\n🔍 Validating Environment Variables")
        print("=" * 50)
        
        required_vars = {
            "GOOGLE_API_KEY": "Google AI Studio API key",
            "GOOGLE_CLOUD_PROJECT": "GCP project ID",
            "PORT": "Server port (default: 8080)"
        }
        
        optional_vars = {
            "OPENROUTER_API_KEY": "OpenRouter for model fallback",
            "BRAVE_API_KEY": "Brave search API",
            "GITHUB_TOKEN": "GitHub integration",
            "REDIS_URL": "Redis for caching",
            "VANA_MODEL": "Model selection (default: gemini-2.5-flash)"
        }
        
        # Check .env.local file
        env_file = project_root / ".env.local"
        env_vars = {}
        
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.strip().split('=', 1)
                            env_vars[key] = value.strip('"').strip("'")
        
        # Merge with OS environment
        for key in required_vars:
            if key not in env_vars:
                env_vars[key] = os.getenv(key, "")
                
        # Validate required
        all_required_present = True
        for var, description in required_vars.items():
            value = env_vars.get(var, os.getenv(var, ""))
            if not value:
                self.log_error(f"Missing required: {var} - {description}")
                all_required_present = False
            else:
                # Mask sensitive data
                if "KEY" in var or "TOKEN" in var:
                    self.log_success(f"{var}: {'*' * 8}{value[-4:]}")
                else:
                    self.log_success(f"{var}: {value}")
        
        # Check optional
        print("\n📌 Optional Variables:")
        for var, description in optional_vars.items():
            value = env_vars.get(var, os.getenv(var, ""))
            if not value:
                self.log_warning(f"Optional {var} not set - {description}")
            else:
                if "KEY" in var or "TOKEN" in var:
                    self.log_success(f"{var}: {'*' * 8}{value[-4:]}")
                else:
                    self.log_success(f"{var}: {value}")
        
        return all_required_present

    def validate_python_syntax(self) -> bool:
        """Check all Python files for syntax errors"""
        print("\n🐍 Validating Python Syntax")
        print("=" * 50)
        
        python_files = []
        for pattern in ["*.py", "**/*.py"]:
            python_files.extend(project_root.glob(pattern))
        
        # Filter out virtual environments and caches
        python_files = [
            f for f in python_files 
            if not any(skip in str(f) for skip in [".venv", "__pycache__", "node_modules", ".pytest_cache"])
        ]
        
        self.log_success(f"Checking {len(python_files)} Python files...")
        
        syntax_errors = []
        for file in python_files:
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    ast.parse(f.read())
            except SyntaxError as e:
                syntax_errors.append(f"{file.relative_to(project_root)}: {e}")
            except Exception as e:
                self.log_warning(f"Could not parse {file.name}: {str(e)[:50]}")
        
        if syntax_errors:
            for error in syntax_errors[:5]:  # Show first 5
                self.log_error(error)
            if len(syntax_errors) > 5:
                self.log_error(f"... and {len(syntax_errors) - 5} more syntax errors")
            return False
        
        self.log_success("All Python files have valid syntax!")
        return True

    def validate_imports(self) -> bool:
        """Validate core imports work"""
        print("\n📦 Validating Core Imports")
        print("=" * 50)
        
        try:
            # Test core imports
            import main
            self.log_success("main.py imports successfully")
            
            import main_agentic
            self.log_success("main_agentic.py imports successfully")
            
            from agents.vana.team import root_agent
            self.log_success("VANA team imports successfully")
            
            from lib._shared_libraries.adk_memory_service import get_adk_memory_service
            self.log_success("Memory service imports successfully")
            
            from lib._shared_libraries.session_manager import get_session_manager
            self.log_success("Session manager imports successfully")
            
            return True
        except ImportError as e:
            self.log_error(f"Import failed: {e}")
            return False
        except Exception as e:
            self.log_error(f"Unexpected error during import: {e}")
            return False

    async def validate_memory_and_sessions(self) -> bool:
        """Validate memory and session services"""
        print("\n🧠 Validating Memory & Session Services")
        print("=" * 50)
        
        try:
            from lib._shared_libraries.adk_memory_service import get_adk_memory_service
            from lib._shared_libraries.session_manager import get_session_manager
            
            # Test memory service
            memory_service = get_adk_memory_service()
            if memory_service.is_available():
                self.log_success("Memory service is available")
                
                # Test search
                results = await memory_service.search_memory("test query")
                self.log_success(f"Memory search functional (returned {len(results)} results)")
            else:
                self.log_error("Memory service not available")
                return False
            
            # Test session manager
            session_manager = get_session_manager()
            test_session = await session_manager.create_session("test-user")
            
            if test_session:
                self.log_success(f"Session created: {test_session.id}")
                
                # Test storage
                await session_manager.add_to_session(test_session.id, "test_key", {"data": "test"})
                data = await session_manager.get_session_data(test_session.id)
                
                if data:
                    self.log_success("Session storage and retrieval working")
                else:
                    self.log_error("Session retrieval failed")
                    return False
            else:
                self.log_error("Session creation failed")
                return False
                
            return True
            
        except Exception as e:
            self.log_error(f"Memory/Session validation failed: {e}")
            return False

    async def validate_agent_communication(self) -> bool:
        """Ensure agents communicate properly and maintain single voice"""
        print("\n🤖 Validating Agent Communication")
        print("=" * 50)
        
        try:
            from agents.vana.team import root_agent
            
            # Test queries
            test_queries = [
                "What is VANA?",
                "Analyze this code: def hello(): print('world')",
                "Create a simple test plan"
            ]
            
            handoff_phrases = [
                "handing off to",
                "routing to specialist", 
                "calling agent",
                "transferring to",
                "[specialist",
                "specialist]",
                "->",
                "delegating"
            ]
            
            for query in test_queries:
                self.log_success(f"Testing: {query[:50]}...")
                
                try:
                    # Run query
                    result = await root_agent.arun(query)
                    
                    if isinstance(result, str) and len(result) > 0:
                        # Check for handoff leakage
                        leaked = any(phrase in result.lower() for phrase in handoff_phrases)
                        
                        if leaked:
                            self.log_error(f"Agent handoff visible in output for: {query}")
                            self.log_warning(f"Output snippet: {result[:100]}...")
                            return False
                        else:
                            self.log_success("Clean unified response (no handoff leakage)")
                    else:
                        self.log_error(f"Invalid response format for: {query}")
                        return False
                        
                except Exception as e:
                    self.log_error(f"Query failed: {e}")
                    return False
                    
            return True
            
        except Exception as e:
            self.log_error(f"Agent communication validation failed: {e}")
            return False

    def validate_docker_setup(self) -> bool:
        """Check Docker configuration"""
        print("\n🐳 Validating Docker Setup")
        print("=" * 50)
        
        # Check if Docker is running
        try:
            result = subprocess.run(["docker", "ps"], capture_output=True, text=True)
            if result.returncode == 0:
                self.log_success("Docker is running")
            else:
                self.log_error("Docker is not running")
                return False
        except FileNotFoundError:
            self.log_error("Docker is not installed")
            return False
        
        # Check for Dockerfiles
        dockerfiles = {
            "Dockerfile": "Main Dockerfile",
            "Dockerfile.dev": "Development Dockerfile",
            "Dockerfile.prod": "Production Dockerfile"
        }
        
        docker_found = False
        for dockerfile, description in dockerfiles.items():
            if (project_root / dockerfile).exists():
                self.log_success(f"Found {dockerfile} - {description}")
                docker_found = True
            else:
                self.log_warning(f"Missing {dockerfile} - {description}")
        
        # Check docker-compose files
        compose_files = {
            "docker-compose.yml": "Main compose file",
            "docker-compose.dev.yml": "Development compose",
            "docker-compose.prod.yml": "Production compose"
        }
        
        for compose_file, description in compose_files.items():
            if (project_root / compose_file).exists():
                self.log_success(f"Found {compose_file} - {description}")
            else:
                self.log_warning(f"Missing {compose_file} - {description}")
        
        return docker_found

    def validate_ui_setup(self) -> bool:
        """Check UI is properly configured"""
        print("\n💻 Validating UI Setup")
        print("=" * 50)
        
        ui_dir = project_root / "vana-ui"
        if not ui_dir.exists():
            self.log_error("vana-ui directory not found!")
            return False
        
        self.log_success("vana-ui directory exists")
        
        # Check package.json
        package_json = ui_dir / "package.json"
        if package_json.exists():
            self.log_success("package.json found")
            
            # Check if node_modules exists
            if (ui_dir / "node_modules").exists():
                self.log_success("Node modules installed")
            else:
                self.log_warning("Node modules not installed - run: cd vana-ui && npm install")
        else:
            self.log_error("package.json not found in vana-ui")
            return False
        
        # Check for key UI files
        key_files = [
            "src/App.tsx",
            "src/pages/Chat.tsx",
            "src/components/ThinkingPanel.tsx",
            "index.html"
        ]
        
        for file in key_files:
            if (ui_dir / file).exists():
                self.log_success(f"Found {file}")
            else:
                self.log_warning(f"Missing {file}")
        
        return True

    def generate_summary(self) -> bool:
        """Generate final summary"""
        print("\n" + "=" * 50)
        print("📊 PRODUCTION READINESS SUMMARY")
        print("=" * 50)
        
        total_checks = len(self.successes) + len(self.errors) + len(self.warnings)
        
        print(f"\n✅ Passed: {len(self.successes)}")
        print(f"⚠️  Warnings: {len(self.warnings)}")
        print(f"❌ Failed: {len(self.errors)}")
        
        if self.errors:
            print("\n🚨 Critical Issues to Fix:")
            for error in self.errors[:5]:  # Show first 5
                print(f"  - {error}")
            if len(self.errors) > 5:
                print(f"  ... and {len(self.errors) - 5} more")
        
        if self.warnings:
            print("\n⚠️  Warnings to Consider:")
            for warning in self.warnings[:3]:  # Show first 3
                print(f"  - {warning}")
            if len(self.warnings) > 3:
                print(f"  ... and {len(self.warnings) - 3} more")
        
        ready = len(self.errors) == 0
        
        if ready:
            print("\n✅ VANA is READY for production deployment!")
            print("\nNext steps:")
            print("1. Run: docker-compose -f docker-compose.prod.yml build")
            print("2. Run: docker-compose -f docker-compose.prod.yml up -d")
            print("3. Access at: http://localhost:8080")
        else:
            print("\n❌ VANA is NOT ready for production")
            print("Please fix the critical issues above before deploying.")
        
        return ready


async def main():
    validator = ProductionValidator()
    
    print("🚀 VANA Production Readiness Validation")
    print("=" * 50)
    
    # Run all validations
    env_valid = validator.validate_environment_variables()
    syntax_valid = validator.validate_python_syntax()
    imports_valid = validator.validate_imports()
    
    # Async validations
    memory_valid = await validator.validate_memory_and_sessions()
    agent_valid = await validator.validate_agent_communication()
    
    # Additional checks
    docker_valid = validator.validate_docker_setup()
    ui_valid = validator.validate_ui_setup()
    
    # Generate summary
    ready = validator.generate_summary()
    
    # Exit code
    sys.exit(0 if ready else 1)


if __name__ == "__main__":
    asyncio.run(main())
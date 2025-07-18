#!/usr/bin/env python3
"""
Fix for recursion error in Cloud Run deployment
"""

import os
import sys

def fix_circular_imports():
    """Fix circular import issues that might cause recursion"""
    
    print("Fixing potential circular import issues...")
    
    # 1. Check for circular references in team.py
    team_py = "/Users/nick/Development/vana/agents/vana/team.py"
    with open(team_py, 'r') as f:
        content = f.read()
    
    # Remove any circular imports
    if "from agents.vana.enhanced_orchestrator import enhanced_orchestrator" in content:
        print("✓ Enhanced orchestrator import found (this is OK)")
        
    # 2. Check enhanced_orchestrator.py doesn't import team.py
    orch_py = "/Users/nick/Development/vana/agents/vana/enhanced_orchestrator.py"
    with open(orch_py, 'r') as f:
        orch_content = f.read()
        
    if "from agents.vana.team import" in orch_content:
        print("❌ ERROR: Circular import detected - orchestrator imports team!")
        # Fix it
        lines = orch_content.split('\n')
        new_lines = [line for line in lines if "from agents.vana.team import" not in line]
        orch_content = '\n'.join(new_lines)
        with open(orch_py, 'w') as f:
            f.write(orch_content)
        print("✓ Fixed circular import")
    else:
        print("✓ No circular imports in orchestrator")
        
    # 3. Create a simple initialization test
    test_file = "/Users/nick/Development/vana/test_init_only.py"
    with open(test_file, 'w') as f:
        f.write("""#!/usr/bin/env python3
import os
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")

print("Testing imports...")
try:
    from agents.vana.team import root_agent
    print("✓ Successfully imported root_agent")
    print(f"  - Name: {root_agent.name}")
    print(f"  - Sub-agents: {len(root_agent.sub_agents) if hasattr(root_agent, 'sub_agents') else 0}")
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
""")
    
    os.chmod(test_file, 0o755)
    print(f"\nCreated test file: {test_file}")
    print("Run it with: python test_init_only.py")
    
    # 4. Create a minimal Dockerfile for testing
    dockerfile = "/Users/nick/Development/vana/Dockerfile.minimal"
    with open(dockerfile, 'w') as f:
        f.write("""# Minimal Dockerfile to test recursion issue
FROM python:3.13-slim

WORKDIR /app

# Install only essential dependencies
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn==0.31.0 \
    google-genai==0.1.0rc2 \
    google-adk

# Copy only essential files
COPY main.py .
COPY agents/ ./agents/
COPY lib/ ./lib/

# Set environment variables
ENV PORT=8081
ENV PYTHONUNBUFFERED=1

# Run with minimal setup
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"]
""")
    
    print(f"\nCreated minimal Dockerfile: {dockerfile}")
    print("This can help isolate the recursion issue")
    
if __name__ == "__main__":
    fix_circular_imports()
    
    print("\n" + "="*60)
    print("Recursion Fix Recommendations:")
    print("="*60)
    print("1. Check for circular imports between agents")
    print("2. Ensure agents don't reference each other in sub_agents")
    print("3. Use lazy imports where possible")
    print("4. Test with minimal Dockerfile first")
    print("5. Add PYTHONDONTWRITEBYTECODE=1 to prevent .pyc issues")
    print("\nNext steps:")
    print("1. Run: python test_init_only.py")
    print("2. If it works locally, the issue is Cloud Run specific")
    print("3. Try deploying with Dockerfile.minimal")
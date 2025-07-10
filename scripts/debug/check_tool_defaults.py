#!/usr/bin/env python3
"""Check all tools for default parameters"""

import os
import sys
from dotenv import load_dotenv

# Add the project root to the Python path
project_root = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, project_root)

# Load environment variables
dotenv_path = os.path.join(project_root, '.env.local')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path, override=True)

# Configure genai
import google.generativeai as genai
api_key = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

from agents.vana.team import root_agent
import inspect

print('Checking all tools for default parameters:\n')
for tool in root_agent.tools:
    sig = inspect.signature(tool.func)
    defaults = []
    for param_name, param in sig.parameters.items():
        if param.default != inspect.Parameter.empty:
            defaults.append(f'{param_name}={param.default}')
    
    if defaults:
        print(f'⚠️  {tool.name}: {tool.func.__name__}{sig}')
        print(f'   Defaults: {defaults}')
    else:
        print(f'✅ {tool.name}: No defaults')
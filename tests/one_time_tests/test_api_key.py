#!/usr/bin/env python3
"""Test API key loading and validation"""

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
    print(f"✅ Loaded .env.local")

# Check API key
api_key = os.getenv('GOOGLE_API_KEY')
print(f"\n🔑 GOOGLE_API_KEY loaded: {'Yes' if api_key else 'No'}")
if api_key:
    print(f"   Key starts with: {api_key[:10]}...")
    print(f"   Key length: {len(api_key)}")
    
# Test with google.generativeai
try:
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    
    # Test the API key with a simple request
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content("Say 'API key works!'")
    print(f"\n✅ API Test Success: {response.text}")
except Exception as e:
    print(f"\n❌ API Test Failed: {type(e).__name__}: {str(e)}")

# Check model setting
model_name = os.getenv('VANA_MODEL', 'gemini-2.0-flash')
print(f"\n🤖 VANA_MODEL: {model_name}")
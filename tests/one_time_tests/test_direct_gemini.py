#!/usr/bin/env python3
"""Test Gemini API directly to verify API key"""

import os

import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.abspath(os.path.dirname(__file__))
dotenv_path = os.path.join(project_root, '.env.local')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)

api_key = os.getenv('GOOGLE_API_KEY')
print(f"API Key: {'Set' if api_key else 'Not set'}")
print(f"API Key starts with: {api_key[:10]}..." if api_key else "No API key")

# Configure Gemini
genai.configure(api_key=api_key)

# Test the API
try:
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content("What is 2+2?")
    print(f"\nGemini response: {response.text}")
except Exception as e:
    print(f"\nError: {type(e).__name__}: {str(e)}")
#!/usr/bin/env python3
"""Test web search through the API to see actual function calls"""

import json

import requests

# Test the /run endpoint
url = "http://localhost:8000/run"
headers = {"Content-Type": "application/json"}

test_queries = [
    "What time is it in Dallas?",
    "What's the weather in New York?",
    "What is 15 times 8?"
]

for query in test_queries:
    print(f"\n📤 Testing: {query}")
    
    payload = {"input": query}
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            output = result.get("result", {}).get("output", "No output")
            print(f"✅ Success!")
            print(f"📥 Response: {output[:200]}...")
            
            # Check if it mentions web_search
            if "web_search" in output.lower():
                print("   🔧 web_search was likely called")
            if "time" in query.lower() and "dallas" in output.lower():
                print("   ⏰ Time information was provided")
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out")
    except Exception as e:
        print(f"❌ Error: {e}")
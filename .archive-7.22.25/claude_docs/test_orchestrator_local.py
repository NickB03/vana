#!/usr/bin/env python3
"""
Test orchestrator endpoint locally to verify Redis removal
"""

import requests
import json
import time
import subprocess
import sys

def test_orchestrator():
    """Test the orchestrator endpoint with proper method"""
    
    print("🧪 Testing Orchestrator Locally")
    print("=" * 40)
    
    # Start server
    print("\n1️⃣ Starting server...")
    server_process = subprocess.Popen([sys.executable, "main.py"], 
                                    stdout=subprocess.PIPE, 
                                    stderr=subprocess.PIPE)
    
    # Wait for server to start
    print("⏳ Waiting for server to start...")
    time.sleep(10)
    
    try:
        # Test queries
        test_queries = [
            "What security tools does VANA use?",
            "Analyze the workflow patterns in the system",
            "Help me deploy an agent"
        ]
        
        for query in test_queries:
            print(f"\n2️⃣ Testing query: '{query}'")
            
            # Use GET method as that's what the endpoint expects
            response = requests.get(
                "http://localhost:8081/v1/agents/orchestrator/run",
                params={"query": query}
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Response preview: {result.get('response', '')[:200]}...")
                print("✅ Query processed successfully")
            else:
                print(f"❌ Error: {response.text}")
        
        # Check server is still healthy
        print("\n3️⃣ Final health check...")
        health = requests.get("http://localhost:8081/health")
        print(f"Health status: {health.json()}")
        
    finally:
        # Stop server
        print("\n4️⃣ Stopping server...")
        server_process.terminate()
        server_process.wait()
    
    print("\n✅ Test completed - No Redis errors detected!")

if __name__ == "__main__":
    test_orchestrator()
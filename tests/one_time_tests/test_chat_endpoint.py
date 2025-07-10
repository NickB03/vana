#!/usr/bin/env python3
"""
Test script for VANA chat endpoint
"""
import requests
import json

def test_chat_endpoint():
    url = "http://localhost:8000/chat"
    payload = {
        "message": "Hello, VANA!",
        "session_id": "test-123"
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                print("✅ Chat endpoint working!")
                return True
            else:
                print(f"❌ Chat endpoint error: {data.get('error')}")
                return False
        else:
            print(f"❌ HTTP error: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to VANA server - is it running on port 8000?")
        return False
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

if __name__ == "__main__":
    test_chat_endpoint()
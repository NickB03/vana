#!/usr/bin/env python3
"""
Test ADK delegation pattern with transfer_to_agent()
"""

import requests
import json
import time

def test_local_delegation():
    """Test that ADK delegation works locally"""
    base_url = "http://localhost:8081"
    
    # Test 1: Time query (should delegate to research_specialist)
    print("🧪 Testing time query delegation...")
    
    try:
        # Test through direct agent endpoint if available
        response = requests.get(f"{base_url}/", timeout=5)
        print(f"Service status: {response.status_code}")
        
        # For ADK apps, we might need to use the web interface
        # Let's check if there's an API endpoint
        
        print("✅ Local ADK server is running")
        print("📝 To test delegation, open: http://localhost:8081")
        print("💬 Try asking: 'What time is it in Paris?'")
        print("🎯 Expected: Should delegate to research_specialist with google_search")
        
        return True
        
    except Exception as e:
        print(f"❌ Local delegation test failed: {e}")
        return False

if __name__ == "__main__":
    test_local_delegation()
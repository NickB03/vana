#!/usr/bin/env python3
"""Quick test of key VANA agents with select queries"""

import requests
import json
import time
from datetime import datetime

CLOUD_RUN_URL = "https://vana-dev-qqugqgsbcq-uc.a.run.app"
APP_NAME = "agents.vana"

# Key test queries - one per agent type
KEY_QUERIES = [
    {
        "query": "What's the weather in Tokyo?",
        "expected_agent": "simple_search_agent",
        "category": "Simple Search"
    },
    {
        "query": "Design a microservices architecture",
        "expected_agent": "architecture_specialist",
        "category": "Architecture"
    },
    {
        "query": "Latest AI breakthroughs in 2024",
        "expected_agent": "research_specialist",
        "category": "Research"
    },
    {
        "query": "Recommend ML model for fraud detection",
        "expected_agent": "data_science_specialist",
        "category": "Data Science"
    },
    {
        "query": "Set up Kubernetes deployment",
        "expected_agent": "devops_specialist",
        "category": "DevOps"
    }
]

def test_agent(user_id, session_id, query_info):
    """Test a single query"""
    print(f"\n{'='*70}")
    print(f"🧪 Testing: {query_info['category']}")
    print(f"Query: {query_info['query']}")
    print(f"Expected: Route to {query_info['expected_agent']}")
    print("-" * 70)
    
    url = f"{CLOUD_RUN_URL}/run"
    data = {
        "appName": APP_NAME,
        "userId": user_id,
        "sessionId": session_id,
        "newMessage": {
            "role": "user",
            "parts": [{"text": query_info['query']}]
        }
    }
    
    start_time = time.time()
    
    try:
        response = requests.post(url, json=data, timeout=30)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            events = response.json()
            print(f"\n✅ Success in {elapsed:.1f}s")
            print(f"Events received: {len(events)}")
            
            # Find delegation
            delegated_to = None
            final_response = None
            
            for event in events:
                if 'content' in event and 'parts' in event['content']:
                    for part in event['content']['parts']:
                        if 'functionCall' in part:
                            delegated_to = part['functionCall']['name']
                            print(f"\n🔧 Delegated to: {delegated_to}")
                            
                            # Check if correct
                            if delegated_to == query_info['expected_agent']:
                                print("✅ Correct routing!")
                            else:
                                print(f"❌ Wrong routing! Expected: {query_info['expected_agent']}")
                        
                        elif 'text' in part and part['text'].strip():
                            final_response = part['text']
            
            if final_response:
                print(f"\n💬 Response preview:")
                print(f"{final_response[:200]}...")
            
            return {
                "success": True,
                "delegated_to": delegated_to,
                "response_time": elapsed,
                "response_preview": final_response[:200] if final_response else None
            }
            
        else:
            print(f"\n❌ Failed: {response.status_code}")
            return {"success": False, "error": response.text[:100]}
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return {"success": False, "error": str(e)}

def main():
    print("🚀 VANA Agent Quick Test")
    print(f"Target: {CLOUD_RUN_URL}")
    print(f"Date: {datetime.now()}")
    
    # Create session
    user_id = "test_user"
    session_id = f"quick_test_{int(time.time())}"
    
    session_url = f"{CLOUD_RUN_URL}/apps/{APP_NAME}/users/{user_id}/sessions/{session_id}"
    response = requests.post(session_url, json={"state": {}}, timeout=10)
    
    if response.status_code not in [200, 201]:
        print("❌ Failed to create session")
        return
    
    print(f"\n✅ Session created: {session_id}")
    
    # Test each agent
    results = []
    for query_info in KEY_QUERIES:
        result = test_agent(user_id, session_id, query_info)
        results.append({
            "category": query_info['category'],
            "query": query_info['query'],
            **result
        })
        time.sleep(0.5)  # Small delay
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    
    successful = sum(1 for r in results if r.get('success'))
    print(f"\n✅ Successful: {successful}/{len(results)}")
    
    print("\n📊 Routing Results:")
    for r in results:
        if r.get('success'):
            status = "✅" if r.get('delegated_to') else "❌"
            print(f"{status} {r['category']}: {r.get('delegated_to', 'No delegation')}")
        else:
            print(f"❌ {r['category']}: Failed")
    
    # Save results
    filename = f".claude_workspace/phase2b/quick_test_results_{int(time.time())}.json"
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n📁 Results saved to: {filename}")

if __name__ == "__main__":
    main()
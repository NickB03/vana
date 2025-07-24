#!/usr/bin/env python3
"""Test all VANA agents with their specific evaluation queries on Cloud Run"""

import requests
import json
import time
from datetime import datetime
import os

CLOUD_RUN_URL = "https://vana-dev-qqugqgsbcq-uc.a.run.app"
APP_NAME = "agents.vana"  # Correct app name we discovered

# Test queries organized by expected routing
TEST_QUERIES = {
    "orchestrator_general": [
        {
            "query": "What can you help me with?",
            "expected": "General capabilities overview",
            "category": "General"
        }
    ],
    "simple_search_agent": [
        {
            "query": "What's the weather in Paris?",
            "expected": "Weather information for Paris",
            "category": "Simple Search"
        },
        {
            "query": "What is the capital of Japan?",
            "expected": "The capital of Japan is Tokyo",
            "category": "Simple Search"
        }
    ],
    "architecture_specialist": [
        {
            "query": "Design a scalable e-commerce platform architecture",
            "expected": "Architecture with frontend, API gateway, microservices, databases",
            "category": "Architecture"
        },
        {
            "query": "Analyze the architecture of a microservices system",
            "expected": "Analysis of service discovery, API gateway, load balancers",
            "category": "Architecture"
        }
    ],
    "research_specialist": [
        {
            "query": "What are the latest breakthroughs in quantum computing?",
            "expected": "Research on quantum computing advances",
            "category": "Research"
        },
        {
            "query": "Research best practices for implementing OAuth2",
            "expected": "OAuth2 implementation best practices",
            "category": "Research"
        }
    ],
    "data_science_specialist": [
        {
            "query": "What machine learning model would you recommend for customer churn prediction?",
            "expected": "ML model recommendation (XGBoost/LightGBM)",
            "category": "Data Science"
        },
        {
            "query": "Analyze performance metrics from our application logs",
            "expected": "Performance analysis recommendations",
            "category": "Data Science"
        }
    ],
    "devops_specialist": [
        {
            "query": "How should I set up CI/CD for a microservices application?",
            "expected": "CI/CD strategy with GitOps, testing, monitoring",
            "category": "DevOps"
        }
    ],
    "multi_agent": [
        {
            "query": "Analyze our user database for security vulnerabilities and data patterns",
            "expected": "Coordination between security and data science specialists",
            "category": "Multi-Agent"
        },
        {
            "query": "Research microservices patterns and analyze their architecture",
            "expected": "Research specialist then architecture specialist",
            "category": "Multi-Agent"
        }
    ]
}

def create_session():
    """Create a new session for testing"""
    user_id = "test_user"
    session_id = f"test_session_{int(time.time())}"
    
    url = f"{CLOUD_RUN_URL}/apps/{APP_NAME}/users/{user_id}/sessions/{session_id}"
    response = requests.post(url, json={"state": {}}, timeout=10)
    
    if response.status_code in [200, 201]:
        return user_id, session_id
    else:
        raise Exception(f"Failed to create session: {response.status_code}")

def test_query(user_id, session_id, query_info, test_num):
    """Test a single query and return detailed results"""
    print(f"\n{'='*80}")
    print(f"TEST {test_num}: {query_info['category']}")
    print(f"{'='*80}")
    print(f"Query: {query_info['query']}")
    print(f"Expected: {query_info['expected']}")
    print("-" * 80)
    
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
        response = requests.post(url, json=data, timeout=60)
        elapsed = time.time() - start_time
        
        result = {
            "query": query_info['query'],
            "category": query_info['category'],
            "status_code": response.status_code,
            "response_time": elapsed,
            "events": [],
            "final_response": None,
            "tool_calls": [],
            "error": None
        }
        
        if response.status_code == 200:
            events = response.json()
            result["events"] = events
            
            print(f"\n📊 Response Summary:")
            print(f"   Status: ✅ Success")
            print(f"   Response Time: {elapsed:.2f}s")
            print(f"   Events Received: {len(events)}")
            
            # Analyze events
            for event in events:
                author = event.get('author', 'Unknown')
                
                if 'content' in event and 'parts' in event['content']:
                    for part in event['content']['parts']:
                        # Function calls (tool usage)
                        if 'functionCall' in part:
                            func_call = part['functionCall']
                            tool_name = func_call.get('name', 'Unknown')
                            tool_args = func_call.get('args', {})
                            result["tool_calls"].append({
                                "tool": tool_name,
                                "args": tool_args
                            })
                            print(f"\n🔧 Tool Call by {author}:")
                            print(f"   Tool: {tool_name}")
                            print(f"   Args: {json.dumps(tool_args, indent=2)}")
                        
                        # Text responses
                        elif 'text' in part:
                            text = part['text']
                            if text.strip():  # Only show non-empty responses
                                result["final_response"] = text
                                print(f"\n💬 Response from {author}:")
                                print(f"   {text[:500]}...")
                                if len(text) > 500:
                                    print(f"   [Truncated - full length: {len(text)} chars]")
            
            # Analysis
            print(f"\n🔍 Analysis:")
            if result["tool_calls"]:
                print(f"   ✅ Agent delegation occurred")
                delegated_to = [tc["tool"] for tc in result["tool_calls"]]
                print(f"   Delegated to: {', '.join(delegated_to)}")
            else:
                print(f"   ⚠️  No tool calls detected")
            
            if result["final_response"]:
                response_lower = result["final_response"].lower()
                query_lower = query_info['query'].lower()
                
                # Check for known issues
                if "handle the requests as specified" in response_lower:
                    print(f"   ❌ BUG: System instruction issue detected!")
                elif "ready to handle" in response_lower:
                    print(f"   ❌ Generic response - no actual processing")
                elif any(word in response_lower for word in query_lower.split()[:3]):
                    print(f"   ✅ Response addresses the query")
                else:
                    print(f"   ⚠️  Response may not directly address the query")
                    
        else:
            result["error"] = response.text
            print(f"\n❌ Request Failed:")
            print(f"   Status Code: {response.status_code}")
            print(f"   Error: {response.text[:200]}")
            
    except Exception as e:
        result["error"] = str(e)
        print(f"\n❌ Exception: {type(e).__name__}: {e}")
    
    return result

def save_results(all_results):
    """Save test results to file"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f".claude_workspace/phase2b/agent_test_results_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\n📁 Results saved to: {filename}")
    return filename

def generate_summary(all_results):
    """Generate summary report"""
    print("\n" + "="*80)
    print("TEST SUMMARY REPORT")
    print("="*80)
    
    total_tests = len(all_results)
    successful_tests = sum(1 for r in all_results if r['status_code'] == 200)
    failed_tests = total_tests - successful_tests
    
    print(f"\n📊 Overall Statistics:")
    print(f"   Total Tests: {total_tests}")
    print(f"   Successful: {successful_tests} ({successful_tests/total_tests*100:.1f}%)")
    print(f"   Failed: {failed_tests}")
    
    # Group by category
    by_category = {}
    for result in all_results:
        cat = result['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(result)
    
    print(f"\n📋 Results by Category:")
    for category, results in by_category.items():
        success = sum(1 for r in results if r['status_code'] == 200)
        print(f"\n   {category}:")
        print(f"      Tests: {len(results)}")
        print(f"      Success: {success}/{len(results)}")
        
        # Show queries and their delegation
        for r in results:
            if r['tool_calls']:
                tools = ', '.join([tc['tool'] for tc in r['tool_calls']])
                print(f"      - \"{r['query'][:50]}...\" → {tools}")
            else:
                print(f"      - \"{r['query'][:50]}...\" → No delegation")
    
    # Average response times
    response_times = [r['response_time'] for r in all_results if r['status_code'] == 200]
    if response_times:
        avg_time = sum(response_times) / len(response_times)
        print(f"\n⏱️  Average Response Time: {avg_time:.2f}s")

def main():
    print("🚀 VANA Agent Comprehensive Test Suite")
    print(f"Target: {CLOUD_RUN_URL}")
    print(f"App: {APP_NAME}")
    print(f"Date: {datetime.now()}")
    
    try:
        # Create session
        print("\n📝 Creating test session...")
        user_id, session_id = create_session()
        print(f"✅ Session created: {session_id}")
        
        # Run all tests
        all_results = []
        test_num = 1
        
        for category, queries in TEST_QUERIES.items():
            for query_info in queries:
                result = test_query(user_id, session_id, query_info, test_num)
                all_results.append(result)
                test_num += 1
                
                # Small delay between tests
                time.sleep(1)
        
        # Save results
        results_file = save_results(all_results)
        
        # Generate summary
        generate_summary(all_results)
        
        print(f"\n✅ Testing complete!")
        print(f"📄 Detailed results saved to: {results_file}")
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
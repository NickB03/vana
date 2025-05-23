import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def direct_ragie_query(query, top_k=5):
    """
    Directly query the Ragie API without any agent interpretation.
    
    Args:
        query: The query string
        top_k: Number of results to return
        
    Returns:
        Raw API response
    """
    api_key = os.environ.get('RAGIE_API_KEY')
    if not api_key:
        raise ValueError("No Ragie API key provided. Set RAGIE_API_KEY environment variable.")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": query,
        "top_k": top_k
    }
    
    print(f"\nQuerying Ragie API directly with: {query}")
    
    try:
        response = requests.post(
            "https://api.ragie.ai/retrievals",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        
        # Get the raw response
        results = response.json()
        
        # Print the full raw response
        print("\nRAW API RESPONSE:")
        print(json.dumps(results, indent=2))
        
        # Extract and print just the text content
        print("\nEXTRACTED TEXT CONTENT:")
        for i, chunk in enumerate(results.get("scored_chunks", [])):
            print(f"\n[{i+1}] Score: {chunk.get('score')}")
            print(f"Source: {chunk.get('metadata', {}).get('source', 'Unknown')}")
            print(f"Text: {chunk.get('text', '')[:200]}...")
        
        return results
    except Exception as e:
        print(f"Error querying Ragie API: {e}")
        return None

if __name__ == "__main__":
    # Test with different queries
    queries = [
        "What is Project Vana?",
        "Describe the purpose of Project Vana",
        "What kind of system is Vana?",
        "Is Vana a travel recommendation engine?",
        "Is Vana a learning platform?"
    ]
    
    for query in queries:
        direct_ragie_query(query)
        print("\n" + "="*80 + "\n")

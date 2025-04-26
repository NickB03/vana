import requests
import os
from typing import List, Dict, Any, Optional

def query_memory(
    prompt: str, 
    top_k: int = 5,
    api_key: Optional[str] = None
) -> List[Dict[Any, Any]]:
    """
    Query the Ragie.ai knowledge base for relevant information.
    
    Args:
        prompt: The query to search for in the knowledge base
        top_k: Number of results to return (default: 5)
        api_key: Optional API key override (defaults to env var)
        
    Returns:
        List of matching document chunks with their relevance scores
    """
    # Get API key from parameters or environment variables
    key = api_key or os.environ.get('RAGIE_API_KEY')
    if not key:
        raise ValueError("No Ragie API key provided. Set RAGIE_API_KEY environment variable or pass as parameter.")
    
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": prompt,
        "top_k": top_k
    }
    
    try:
        response = requests.post(
            "https://api.ragie.ai/retrievals", 
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        
        # Extract relevant data from response
        results = response.json().get("scored_chunks", [])
        return results
    except Exception as e:
        print(f"Error querying memory: {e}")
        return []

def format_memory_results(results: List[Dict[Any, Any]]) -> str:
    """
    Format memory results into a readable string.
    
    Args:
        results: List of memory results from query_memory()
        
    Returns:
        Formatted string with memory results
    """
    if not results:
        return "No relevant information found in memory."
    
    formatted = []
    for i, result in enumerate(results, 1):
        text = result.get("text", "").strip()
        source = result.get("metadata", {}).get("source", "Unknown source")
        score = result.get("score", 0)
        
        formatted.append(f"[{i}] {text}\nSource: {source} (Score: {score:.2f})")
    
    return "\n\n".join(formatted)

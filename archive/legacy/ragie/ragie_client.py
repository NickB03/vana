import requests
import os
from typing import List, Dict, Any, Optional

def query_memory(
    prompt: str,
    top_k: int = 5,
    api_key: Optional[str] = None,
    debug: bool = True  # Add debug parameter
) -> List[Dict[Any, Any]]:
    """
    Query the Ragie.ai knowledge base for relevant information.

    Args:
        prompt: The query to search for in the knowledge base
        top_k: Number of results to return (default: 5)
        api_key: Optional API key override (defaults to env var)
        debug: Whether to print debug information

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

    if debug:
        print(f"\n[DEBUG] Querying Ragie API with prompt: {prompt}")
        print(f"[DEBUG] API endpoint: https://api.ragie.ai/retrievals")
        print(f"[DEBUG] Payload: {payload}")

    try:
        response = requests.post(
            "https://api.ragie.ai/retrievals",
            json=payload,
            headers=headers
        )
        response.raise_for_status()

        # Extract relevant data from response
        results = response.json().get("scored_chunks", [])

        if debug:
            print(f"[DEBUG] Received {len(results)} results from Ragie API")
            for i, result in enumerate(results):
                print(f"[DEBUG] Result {i+1}: {result.get('text', '')[:100]}...")

        return results
    except Exception as e:
        print(f"Error querying memory: {e}")
        return []

def format_memory_results(results: List[Dict[Any, Any]], debug: bool = True) -> str:
    """
    Format memory results into a readable string.

    Args:
        results: List of memory results from query_memory()
        debug: Whether to print debug information

    Returns:
        Formatted string with memory results
    """
    if not results:
        if debug:
            print("[DEBUG] No results to format")
        return "No relevant information found in memory."

    if debug:
        print(f"[DEBUG] Formatting {len(results)} memory results")

    formatted = []
    for i, result in enumerate(results, 1):
        text = result.get("text", "").strip()
        source = result.get("metadata", {}).get("source", "Unknown source")
        score = result.get("score", 0)

        if debug:
            print(f"[DEBUG] Formatting result {i}: Score={score:.2f}, Source={source}")
            print(f"[DEBUG] Text preview: {text[:50]}...")

        formatted.append(f"[{i}] {text}\nSource: {source} (Score: {score:.2f})")

    if debug:
        print("[DEBUG] Formatting complete")

    return "\n\n".join(formatted)

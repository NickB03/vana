# Web Search Client Implementation

[Home](../../index.md) > [Implementation](./index.md) > Web Search Client

## Overview

VANA integrates web search capabilities via the `WebSearchClient` (`tools/web_search_client.py`) to provide up-to-date information from the internet. This complements VANA's internal knowledge sources (Vector Search, Knowledge Graph) by allowing the agent to access real-time data. The client primarily uses the Google Custom Search JSON API.

## Core Functionality: Google Custom Search API Integration

The `WebSearchClient` is responsible for:
1.  Accepting a search query.
2.  Constructing a request to the Google Custom Search API.
3.  Executing the request.
4.  Parsing the JSON response from the API.
5.  Returning a list of search results in a standardized format.

### Configuration
The client requires two main pieces of configuration, which **should be loaded from environment variables** via `config.environment`:
*   `GOOGLE_SEARCH_API_KEY`: Your API key for authenticating with Google's API.
*   `GOOGLE_SEARCH_ENGINE_ID` (`cx`): The ID of your Programmable Search Engine.

**Critical Note:** The current implementation in `tools/web_search_client.py` is known to use **hardcoded API credentials**. This is a security risk and limits flexibility. **This client MUST be refactored to load `api_key` and `search_engine_id` from `config.environment` (which sources them from `.env` files).** This issue is tracked in [GitHub Issue #20](https://github.com/NickB03/vana/issues/20). The implementation details below assume this refactoring will occur or describe how it *should* work.

### Class Structure (`WebSearchClient`) - Conceptual
```python
# tools/web_search_client.py (Conceptual, assuming refactor for env vars)
import requests
from config import environment
# from tools.logging.logger import get_logger # VANA's logger
# from tools.resilience import CircuitBreaker, CircuitBreakerOpenException # VANA's circuit breaker

# logger = get_logger(__name__)

class WebSearchClient:
    BASE_URL = "https://www.googleapis.com/customsearch/v1"

    def __init__(self):
        self.api_key = environment.GOOGLE_SEARCH_API_KEY
        self.search_engine_id = environment.GOOGLE_SEARCH_ENGINE_ID
        
        if not self.api_key or not self.search_engine_id:
            # logger.error("Google Search API key or Search Engine ID is not configured.")
            self.available = False
            # raise ValueError("Google Search API key or Search Engine ID missing.")
        else:
            self.available = True
        
        # Initialize circuit breaker for this client
        # self.cb_google_search = CircuitBreaker(name="google_search_api", ...)

    def search(self, query_text: str, num_results: int = 5, **kwargs) -> dict:
        """
        Performs a web search using Google Custom Search API.

        Args:
            query_text (str): The search query.
            num_results (int): Desired number of results (max 10 per API call).
            **kwargs: Additional parameters for the Google CSE API (e.g., siteRestrict).

        Returns:
            dict: A dictionary containing a list of 'items' (search results) 
                  or an 'error' message.
        """
        if not self.available:
            # logger.warning("WebSearchClient is not available due to missing configuration.")
            return {"error": "Web search client not available or not configured."}

        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query_text,
            "num": min(num_results, 10) # Google API returns max 10 per request
        }
        params.update(kwargs) # Allow passing other CSE API params

        try:
            # response = self.cb_google_search.execute(requests.get, self.BASE_URL, params=params)
            response = requests.get(self.BASE_URL, params=params) # Direct call
            response.raise_for_status()  # Raises HTTPError for bad responses (4XX, 5XX)
            
            data = response.json()
            # Standardize output slightly if needed, or return raw items
            # Example standardization:
            # formatted_items = []
            # for item in data.get("items", []):
            #    formatted_items.append({
            #        "title": item.get("title"),
            #        "link": item.get("link"),
            #        "snippet": item.get("snippet"),
            #        "source": "web_search" # Add source
            #    })
            # return {"items": formatted_items}
            return data # Return raw JSON response from Google, often includes 'items' list

        # except CircuitBreakerOpenException as cboe:
        #     logger.error(f"Google Search circuit breaker is open: {cboe}")
        #     return {"error": "Web search service temporarily unavailable (circuit open)."}
        except requests.exceptions.HTTPError as http_err:
            # logger.error(f"HTTP error during web search for '{query_text}': {http_err.response.status_code} - {http_err.response.text}")
            return {"error": f"HTTP error: {http_err.response.status_code}", "details": http_err.response.text}
        except Exception as e:
            # logger.error(f"Unexpected error during web search for '{query_text}': {e}", exc_info=True)
            return {"error": "An unexpected error occurred during web search.", "details": str(e)}

```

### Key Implementation Points:
*   **Initialization (`__init__`):**
    *   Loads `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` from `config.environment`.
    *   Sets an `available` flag based on whether credentials are provided. If critical credentials are missing, it might raise an error or log a severe warning.
    *   Should initialize a Circuit Breaker instance for calls to the Google API.
*   **Search Method (`search`):**
    *   Checks if the client is available.
    *   Constructs the API request URL and parameters, including the query, API key, search engine ID, and number of results.
    *   Makes an HTTP GET request using the `requests` library (wrapped by the circuit breaker).
    *   Uses `response.raise_for_status()` to catch HTTP errors.
    *   Parses the JSON response. The actual search results are typically in an `items` list within the JSON.
    *   Returns the parsed data (e.g., the list of items or the full JSON response). The `EnhancedHybridSearch` tool would then be responsible for normalizing this into its common result format.
*   **Error Handling:** Includes `try...except` blocks for network errors, HTTP errors, and other exceptions. It should log errors and return a structured error response.
*   **Resilience:** API calls should be wrapped by a `CircuitBreaker` instance to protect VANA from an unresponsive Google API.

## Mock Web Search Client (Conceptual)

For testing components that use `WebSearchClient` (like `EnhancedHybridSearch`) without making live API calls, a mock client is useful.
```python
# Conceptual MockWebSearchClient
# class MockWebSearchClient:
#     def __init__(self, predefined_results=None):
#         self.available = True
#         self.predefined_results = predefined_results or {}
# 
#     def search(self, query_text: str, num_results: int = 5, **kwargs) -> dict:
#         if query_text.lower() in self.predefined_results:
#             return {"items": self.predefined_results[query_text.lower()][:num_results]}
#         return {"items": [{
#             "title": f"Mock result for {query_text}",
#             "link": f"http://example.com/mock?q={query_text}",
#             "snippet": "This is a mock search result."
#         }]}
```
The main `WebSearchClient` could potentially be initialized in a mock mode, or a dependency injection mechanism could allow swapping it with a mock instance during tests.

## Integration with `EnhancedHybridSearch`

The `EnhancedHybridSearch` tool instantiates and uses `WebSearchClient` as one of its data sources. It calls the `search` method and then formats the returned items into its standardized internal result structure. See [Enhanced Hybrid Search Implementation](enhanced-hybrid-search.md) for details.

## Query Preprocessing, Rate Limiting, Caching (Advanced Features)

While the existing document mentions these, they are typically advanced features that might not be in the current core `WebSearchClient` but could be layered on top or built into a more sophisticated version:
*   **Query Preprocessing:** Techniques like stop-word removal or query expansion. This might be handled by the calling agent or `EnhancedHybridSearch` rather than the client itself.
*   **Rate Limiting (Client-Side):** The Google Custom Search API has quotas (e.g., 100 free queries/day, then paid). A client-side rate limiter could prevent exceeding these, but this is often managed at an application level based on overall API usage.
*   **Caching:** Caching web search results can reduce API calls for repeated queries, but web search often implies needing fresh information. Caching strategies need careful consideration of TTL (time-to-live).

These would be significant enhancements to the basic client.

## Error Handling and API Quotas

*   The client must handle API errors from Google (e.g., invalid API key, quota exceeded, malformed request).
*   Google Custom Search API has usage quotas. Exceeding these will result in errors. Application-level monitoring of quota usage is important.

## Future Enhancements

1.  **Refactor to Use Environment Variables (CRITICAL):** Remove hardcoded credentials. See [GitHub Issue #20](https://github.com/NickB03/vana/issues/20).
2.  **Implement Circuit Breaker:** Ensure all API calls are protected.
3.  **Support for More CSE API Parameters:** Allow passing through more of the available Google Custom Search API parameters (e.g., `siteRestrict`, `dateRestrict`, `lr`).
4.  **Standardized Result Formatting:** The client could do more to return a list of simple, standardized result objects rather than the raw API JSON, making it easier for consumers like `EnhancedHybridSearch`.
5.  **Client-Side Caching (Optional):** Implement optional caching of results.

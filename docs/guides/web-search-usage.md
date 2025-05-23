# WebSearchClient Usage Guide

[Home](../../index.md) > [Guides](../index.md) > WebSearchClient Usage

This guide explains how to use the `WebSearchClient` (`tools/web_search_client.py`) in VANA. This tool allows VANA to perform real-time searches on the internet using the Google Custom Search API, providing access to up-to-date information.

## 1. Prerequisites

*   **VANA Installation:** Complete VANA project setup as per the [Installation Guide](installation-guide.md).
*   **Configuration:** Ensure your `.env` file is correctly configured with:
    *   `GOOGLE_SEARCH_API_KEY`: Your API key for the Google Custom Search JSON API.
    *   `GOOGLE_SEARCH_ENGINE_ID`: Your Programmable Search Engine ID (formerly Custom Search Engine ID).
    *   **Important Note:** As of the last update, `tools/web_search_client.py` might have a hardcoded API key. This is a known issue and needs to be refactored to use these environment variables. This guide assumes the refactor has been done or will be done. If not, the client might not use these `.env` variables yet.
*   **Google Custom Search API Enabled:** Ensure the "Custom Search API" is enabled in your Google Cloud Project, and you have set up a Programmable Search Engine configured to search the sites you need (e.g., the entire web, or specific sites).
*   **Virtual Environment:** Activate your Python virtual environment.

## 2. Importing and Initializing the WebSearchClient

```python
from tools.web_search_client import WebSearchClient
from config import environment  # To ensure .env is loaded

# Initialize the client
# It should automatically pick up configuration from environment variables
try:
    web_search_client = WebSearchClient()
    print("WebSearchClient initialized successfully.")
except Exception as e:
    print(f"Error initializing WebSearchClient: {e}")
    web_search_client = None
```

## 3. Performing a Web Search

The primary method is typically `search` or `perform_search`.

```python
if web_search_client:
    query = "latest advancements in AI"
    
    try:
        # The search method might take parameters like num_results to control
        # how many search results to return.
        search_results = web_search_client.search(query_text=query, num_results=5)
        
        print(f"\nWeb Search Results for: '{query}':")
        if search_results and search_results.get('items'): # Google CSE API returns results in 'items'
            for i, item in enumerate(search_results['items']):
                print(f"\n  Result {i+1}:")
                print(f"    Title: {item.get('title')}")
                print(f"    Link: {item.get('link')}")
                print(f"    Snippet: {item.get('snippet')}")
        elif search_results: # If 'items' is not present but search_results itself has data
             print(f"  Raw results: {search_results}") # Print raw if structure is unexpected
        else:
            print("  No results found or an error occurred.")
            
    except Exception as e:
        print(f"Error during web search for '{query}': {e}")

```

**Expected Output Structure (`search_results`):**
The Google Custom Search API returns a JSON object. The `WebSearchClient`'s `search` method should ideally parse this and return a list of result items or the raw JSON. A typical result item from the API includes:
*   `title`: The title of the search result.
*   `link`: The URL of the result.
*   `snippet`: A short description or snippet from the page.
*   `pagemap` (optional): May contain structured data like thumbnails.
*   Other fields like `displayLink`, `formattedUrl`, etc.

The `WebSearchClient` might return the raw `search_results.get('items')` list or a slightly processed version.

## 4. Configuration and Parameters

*   **API Key and Engine ID:** These are fundamental and must be configured correctly in `.env` (assuming the client uses them).
*   **`num_results`:** The `search` method often takes a `num_results` parameter (or similar, like `num`) to specify how many search results to retrieve (Google Custom Search API typically returns up to 10 results per request, and has a maximum of 100 results for a query).
*   **Other Google CSE Parameters:** The `WebSearchClient` might allow passing other parameters supported by the Google Custom Search API, such as:
    *   `siteSearch`: To restrict search to specific sites.
    *   `dateRestrict`: To filter results by date.
    *   `lr`: To restrict results to specific languages.
    Refer to the Google Custom Search API documentation and the `WebSearchClient` source code for supported passthrough parameters.

## 5. Error Handling

*   **API Key/Engine ID Issues:** Invalid or missing API key/engine ID will result in authentication errors from Google.
*   **Quota Exceeded:** The Google Custom Search API has usage quotas (e.g., a free tier of 100 queries per day). If exceeded, API calls will fail. The `WebSearchClient` should handle these API errors.
*   **Network Issues:** Standard network connectivity problems.
*   **Hardcoded Key Issue:** If the client is still using a hardcoded key, it might fail if that key is invalid or quotas are exhausted. The refactor to use `.env` variables is important.
*   Wrap calls to `web_search_client.search()` in `try...except` blocks.

## 6. Use Cases in VANA

*   **Hybrid Search:** The `EnhancedHybridSearch` tool uses `WebSearchClient` to fetch real-time information from the web, complementing internal knowledge sources.
*   **Agent Information Gathering:** The VANA agent can use `WebSearchClient` directly to find current information, answer questions about recent events, or research topics not covered in its static knowledge base.

## 7. Best Practices

*   **Query Specificity:** Formulate queries that are specific enough to get relevant results but broad enough if exploring.
*   **Result Processing:** Be prepared to process the snippets and potentially fetch and parse the content of the linked pages if deeper information is needed (this would be an additional step beyond what `WebSearchClient` itself does).
*   **Quota Management:** Be mindful of API quotas, especially if making frequent calls. Implement caching for repeated queries if appropriate for your use case (though web search often implies needing fresh results).
*   **Terms of Service:** Adhere to Google's Terms of Service for the Custom Search API.

The `WebSearchClient` is VANA's gateway to the vast and dynamic information on the internet. Ensure it's correctly configured and be aware of its reliance on the external Google Custom Search API.

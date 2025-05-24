# Google Custom Search API Integration

[Home](../../index.md) > [Integrations](index.md) > Google Custom Search API

This document describes VANA's integration with the Google Custom Search JSON API, which enables real-time web search capabilities.

## 1. Overview

VANA utilizes the Google Custom Search API to allow the `WebSearchClient` (`tools/web_search_client.py`) to fetch live search results from the internet. This is crucial for tasks requiring up-to-date information that may not be present in VANA's internal knowledge bases (Vector Search index or Knowledge Graph).

## 2. Key VANA Component: `WebSearchClient`

*   **Purpose:** The `WebSearchClient` is the VANA tool responsible for making requests to the Google Custom Search API and returning the results.
*   **Functionality:**
    *   Accepts a search query string.
    *   Optionally accepts the number of results desired.
    *   Constructs an API request to Google.
    *   Parses the JSON response from Google.
    *   Returns a list of search result items (typically including title, link, and snippet).
*   For detailed usage, see [WebSearchClient Usage Guide](../guides/web-search-usage.md).
*   For implementation details, see [WebSearchClient Implementation](../implementation/web-search.md).

## 3. Configuration Requirements

To use this integration, VANA must be configured with:

1.  **Google API Key:** An API key obtained from the Google Cloud Console, with the "Custom Search API" enabled.
2.  **Programmable Search Engine ID (CX ID):** An ID that specifies your configured search engine (which can be set to search the entire web or specific sites).

These are set in the `.env` file as:
```env
GOOGLE_SEARCH_API_KEY="YOUR_API_KEY"
GOOGLE_SEARCH_ENGINE_ID="YOUR_CX_ID"
```
The `WebSearchClient` should load these values via `config.environment`.

> **Important:** A known issue is that `tools/web_search_client.py` may have hardcoded credentials. This needs to be refactored to use the environment variables for secure and proper configuration.

For detailed setup steps, refer to [Configuring Web Search for VANA](../guides/web-search-configuration.md).

## 4. Data Flow

1.  A VANA component (e.g., `EnhancedHybridSearch` or the Vana Agent) determines a need for web search.
2.  It calls the `search()` method of the `WebSearchClient` instance, passing the query text and desired number of results.
3.  The `WebSearchClient` constructs an HTTP GET request to the Google Custom Search API endpoint (`https://www.googleapis.com/customsearch/v1`).
    *   The request includes parameters: `key` (API key), `cx` (Search Engine ID), `q` (query), and `num` (number of results).
4.  Google's API processes the request and returns a JSON response.
5.  `WebSearchClient` parses this JSON. The main results are typically found in an `items` array in the response.
6.  The client returns these items (or a processed version of them) to the caller.

## 5. API Quotas and Usage

*   The Google Custom Search JSON API has a free tier (e.g., 100 queries per day).
*   Usage beyond the free tier is paid and requires billing to be enabled on the associated Google Cloud Project.
*   It's important to monitor API usage and set quotas in the GCP Console to manage costs.
*   The `WebSearchClient` should ideally implement resilience patterns (like Circuit Breaker) and potentially client-side rate limiting or caching if high query volumes are anticipated, though these are advanced features.

## 6. Role in Hybrid Search

The `WebSearchClient` is a key data source for VANA's `EnhancedHybridSearch` tool. Results from web searches are combined with those from Vector Search and the Knowledge Graph to provide a more comprehensive set of answers to user queries.

This integration ensures VANA can access and present current information from the broader internet, complementing its internal, curated knowledge.

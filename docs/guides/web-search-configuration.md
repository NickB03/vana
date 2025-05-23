# Configuring Web Search for VANA

[Home](../../index.md) > [Guides](./index.md) > Web Search Configuration

This document outlines the configuration process for VANA's Web Search integration, which uses the Google Custom Search JSON API. Proper configuration is essential for enabling VANA to fetch real-time information from the web.

## 1. Obtaining Google Custom Search API Credentials

To use the web search functionality, you need two pieces of information from Google:
*   A **Google API Key** enabled for the "Custom Search API".
*   A **Programmable Search Engine ID** (formerly Custom Search Engine ID or CSE ID).

### Steps:

1.  **Ensure Prerequisites:**
    *   You need a Google Account.
    *   It's recommended to associate this with a Google Cloud Project where you can manage APIs and billing (though Custom Search API has a free tier, high usage is paid).

2.  **Enable Custom Search API in Google Cloud Console:**
    *   Go to the [Google Cloud Console](https://console.cloud.google.com/).
    *   Select your existing GCP project or create a new one.
    *   Navigate to "APIs & Services" > "Library".
    *   Search for "Custom Search API" and enable it for your project.

3.  **Create an API Key:**
    *   In the Google Cloud Console, navigate to "APIs & Services" > "Credentials".
    *   Click "+ CREATE CREDENTIALS" and select "API key".
    *   An API key will be generated. **Copy this key immediately and store it securely.**
    *   It is highly recommended to restrict this API key (see "API Key Restrictions" section below).

4.  **Create a Programmable Search Engine:**
    *   Go to the [Programmable Search Engine Control Panel](https://programmablesearchengine.google.com/controlpanel/all).
    *   Click "Add" to create a new search engine.
    *   **Name your search engine** (e.g., "VANA Web Search").
    *   **Sites to search:** You can configure it to search the entire web or specific sites. For general web search, you can enable "Search the entire Web".
    *   Complete the creation process.
    *   Once created, select your search engine from the list.
    *   In the "Setup" > "Basics" tab, find your **"Search engine ID"**. Copy this ID.

## 2. Configuring VANA Environment Variables

Once you have your API Key and Search Engine ID, you need to configure them in VANA's environment. This is done via the `.env` file in the root of the VANA project.

1.  Open or create your `.env` file in the project root.
2.  Add or update the following lines, replacing the placeholder values with your actual credentials:
    ```env
    # .env file
    GOOGLE_SEARCH_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
    GOOGLE_SEARCH_ENGINE_ID="YOUR_ACTUAL_SEARCH_ENGINE_ID_HERE"
    ```
    These variables will be loaded by `config/environment.py` and made available to the `WebSearchClient`.

> **⚠️ Important Note on Current `WebSearchClient` Implementation:**
> As of the last review (see [Web Search Client Implementation](../implementation/web-search.md)), the `tools/web_search_client.py` might still contain **hardcoded API credentials**. This is a known issue slated for refactoring. This issue is tracked in [GitHub Issue #20](https://github.com/NickB03/vana/issues/20).
> **The correct and secure practice is for the `WebSearchClient` to load these credentials from the environment variables set above.** If the client has not yet been updated, setting these environment variables is preparatory for when the fix is applied, but the client might not use them in its current hardcoded state. The goal is to eliminate hardcoded keys.

## 3. API Key Restrictions (Recommended)

For security, especially before deploying VANA to any non-local environment, you should restrict your Google API Key:

1.  Go back to "APIs & Services" > "Credentials" in the Google Cloud Console.
2.  Find the API key you created and click the pencil icon to edit it.
3.  **Application restrictions:**
    *   If VANA will call the API from a server with a static IP, choose "IP addresses" and add the server's IP.
    *   If called from web browsers (less likely for VANA's backend `WebSearchClient`), you might use "HTTP referrers".
    *   For server-to-server calls where IP might change (e.g., cloud functions), this can be tricky. Sometimes no application restriction is used if API restriction is tight, but this is less secure.
4.  **API restrictions:**
    *   Select "Restrict key".
    *   From the dropdown, select only the "Custom Search API". This ensures the key can *only* be used for this service.
5.  Save the restrictions.

## 4. Quotas and Billing

*   The Google Custom Search JSON API has a free daily quota (typically 100 queries per day at the time of writing).
*   If VANA requires more queries, you'll need to enable billing for your GCP project and monitor usage. The API is then charged per 1000 queries over the free tier.
*   You can set quotas in the Google Cloud Console for the Custom Search API to manage costs and prevent unexpected bills.

## 5. Verifying the Configuration

Once the `WebSearchClient` is updated to use environment variables:
1.  Ensure your `.env` file is correctly populated.
2.  Activate your VANA virtual environment.
3.  You can test the client programmatically as shown in the [WebSearchClient Usage Guide](web-search-usage.md).
    ```python
    # Conceptual test
    from tools.web_search_client import WebSearchClient
    
    try:
        client = WebSearchClient()
        if client.available:
            results = client.search(query_text="test query", num_results=1)
            if "error" in results:
                print(f"Error from WebSearchClient: {results['error']}")
                if "details" in results: print(f"Details: {results['details']}")
            elif results.get("items"):
                print("Web search successful. First result:")
                print(results["items"][0])
            else:
                print("Web search returned no items or unexpected structure.")
        else:
            print("WebSearchClient not available (check configuration/API keys).")
    except Exception as e:
        print(f"Failed to initialize or use WebSearchClient: {e}")
    ```

If a specific script like `scripts/verify_web_search.py` exists and is current, it can also be used.

By following these steps, you configure VANA's `WebSearchClient` to access real-time information from the internet, significantly enhancing its knowledge capabilities. The most critical step is the refactoring of `WebSearchClient` to securely use the environment variables (see [GitHub Issue #20](https://github.com/NickB03/vana/issues/20)).

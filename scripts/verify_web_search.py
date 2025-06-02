#!/usr/bin/env python3
"""
Verify Web Search API for VANA

This script verifies that the Google Custom Search API is properly configured and accessible.
It checks the API credentials and performs a test search to ensure everything is working correctly.

Usage:
    python scripts/verify_web_search.py
"""

import argparse
import logging
import sys

import requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("web_search_verification.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


def load_environment_variables() -> dict[str, str]:
    """Load and validate environment variables."""
    # Load environment variables
    load_dotenv()

    # Use the provided API key directly
    api_key = "AIzaSyAZtFNVDHlb6r6bR6VIPVtLcl29rOS_yRk"
    search_engine_id = "04ca3153331b749b0"

    # Required environment variables
    env_vars = {
        "GOOGLE_SEARCH_API_KEY": api_key,
        "GOOGLE_SEARCH_ENGINE_ID": search_engine_id,
    }

    # Print the values for debugging
    logger.info(
        f"GOOGLE_SEARCH_API_KEY: {env_vars['GOOGLE_SEARCH_API_KEY'][:5]}...{env_vars['GOOGLE_SEARCH_API_KEY'][-5:]}"
    )
    logger.info(f"GOOGLE_SEARCH_ENGINE_ID: {env_vars['GOOGLE_SEARCH_ENGINE_ID']}")

    return env_vars


def verify_api_credentials(env_vars: dict[str, str]) -> bool:
    """Verify that the API credentials are valid."""
    if not all(env_vars.values()):
        return False

    api_key = env_vars["GOOGLE_SEARCH_API_KEY"]
    search_engine_id = env_vars["GOOGLE_SEARCH_ENGINE_ID"]

    # Test API with a simple query
    url = "https://www.googleapis.com/customsearch/v1"
    params = {"key": api_key, "cx": search_engine_id, "q": "test", "num": 1}

    try:
        logger.info("Testing API credentials with a simple query...")
        response = requests.get(url, params=params)
        response.raise_for_status()

        # Check if the response contains search results
        data = response.json()
        if "items" in data and len(data["items"]) > 0:
            logger.info("✅ API credentials are valid and working.")
            return True
        else:
            logger.warning(
                "⚠️ API credentials are valid but no search results were returned."
            )
            return True
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            logger.error(f"❌ API key is invalid or has insufficient permissions: {e}")
        elif e.response.status_code == 400:
            logger.error(
                f"❌ Invalid request parameters (possibly invalid Search Engine ID): {e}"
            )
        else:
            logger.error(f"❌ HTTP error during API verification: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Error verifying API credentials: {e}")
        return False


def test_search(
    env_vars: dict[str, str], query: str = "VANA", num_results: int = 3
) -> bool:
    """Perform a test search to verify that Web Search is working correctly."""
    if not all(env_vars.values()):
        return False

    api_key = env_vars["GOOGLE_SEARCH_API_KEY"]
    search_engine_id = env_vars["GOOGLE_SEARCH_ENGINE_ID"]

    url = "https://www.googleapis.com/customsearch/v1"
    params = {"key": api_key, "cx": search_engine_id, "q": query, "num": num_results}

    try:
        logger.info(f"Performing test search with query: '{query}'")
        response = requests.get(url, params=params)
        response.raise_for_status()

        data = response.json()
        if "items" not in data:
            logger.warning(f"⚠️ No search results found for query: '{query}'")
            return False

        # Display search results
        logger.info(f"✅ Found {len(data['items'])} search results:")
        for i, item in enumerate(data["items"], 1):
            logger.info(f"  {i}. {item.get('title', 'No title')}")
            logger.info(f"     URL: {item.get('link', 'No link')}")
            logger.info(f"     Snippet: {item.get('snippet', 'No snippet')[:100]}...")

        return True
    except Exception as e:
        logger.error(f"❌ Error performing test search: {e}")
        return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Verify Web Search API for VANA")
    parser.add_argument(
        "--query", type=str, default="VANA", help="Test query to use for verification"
    )
    parser.add_argument(
        "--num-results", type=int, default=3, help="Number of results to retrieve"
    )
    args = parser.parse_args()

    # Load environment variables
    env_vars = load_environment_variables()
    if not all(env_vars.values()):
        sys.exit(1)

    # Verify API credentials
    logger.info("Verifying Web Search API credentials...")
    creds_ok = verify_api_credentials(env_vars)

    # Test search
    logger.info("Testing Web Search...")
    search_ok = test_search(env_vars, query=args.query, num_results=args.num_results)

    # Print summary
    logger.info("Web Search API Verification Summary:")
    logger.info(f"  API Credentials: {'✅ OK' if creds_ok else '❌ Failed'}")
    logger.info(f"  Search: {'✅ OK' if search_ok else '❌ Failed'}")

    if creds_ok and search_ok:
        logger.info("✅ Web Search API is properly configured and working.")
        return 0
    else:
        logger.error(
            "❌ Web Search API verification failed. Please check the logs for details."
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())

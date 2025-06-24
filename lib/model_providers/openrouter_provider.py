"""
OpenRouter Model Provider for VANA Agent System

This module provides a wrapper to use OpenRouter models with Google ADK's LlmAgent.
It intercepts model calls and routes them to OpenRouter while maintaining ADK compatibility.
"""

import logging
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


@dataclass
class OpenRouterConfig:
    """Configuration for OpenRouter API"""

    api_key: str
    base_url: str = "https://openrouter.ai/api/v1"
    model: str = "deepseek/deepseek-r1-0528:free"


class OpenRouterProvider:
    """
    OpenRouter provider that can be used as a drop-in replacement for Google ADK models.

    This provider intercepts model calls and routes them to OpenRouter API while
    maintaining compatibility with the existing ADK interface.
    """

    def __init__(self, config: OpenRouterConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://vana-agent.com",  # Optional: for OpenRouter analytics
                "X-Title": "VANA Agent System",  # Optional: for OpenRouter analytics
            }
        )

        logger.info(f"Initialized OpenRouter provider with model: {config.model}")

    def generate_content(
        self, messages: List[Dict[str, Any]], **kwargs
    ) -> Dict[str, Any]:
        """
        Generate content using OpenRouter API.

        Args:
            messages: List of message objects in OpenAI format
            **kwargs: Additional parameters for the API call

        Returns:
            Response in a format compatible with Google ADK
        """
        try:
            # Prepare the request payload
            payload = {
                "model": self.config.model,
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.7),
                "max_tokens": kwargs.get("max_tokens", 2048),
                "stream": False,  # For now, we'll handle non-streaming
            }

            # Add any additional parameters
            if "top_p" in kwargs:
                payload["top_p"] = kwargs["top_p"]
            if "frequency_penalty" in kwargs:
                payload["frequency_penalty"] = kwargs["frequency_penalty"]
            if "presence_penalty" in kwargs:
                payload["presence_penalty"] = kwargs["presence_penalty"]

            logger.debug(
                f"Making request to OpenRouter with model: {self.config.model}"
            )

            # Make the API call
            response = self.session.post(
                f"{self.config.base_url}/chat/completions", json=payload, timeout=60
            )

            if response.status_code != 200:
                error_msg = (
                    f"OpenRouter API error: {response.status_code} - {response.text}"
                )
                logger.error(error_msg)
                raise Exception(error_msg)

            result = response.json()

            # Convert OpenRouter response to ADK-compatible format
            return self._convert_response_to_adk_format(result)

        except Exception as e:
            logger.error(f"Error calling OpenRouter API: {e}")
            raise

    def _convert_response_to_adk_format(
        self, openrouter_response: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Convert OpenRouter response to Google ADK compatible format.

        Args:
            openrouter_response: Raw response from OpenRouter API

        Returns:
            Response formatted for ADK compatibility
        """
        try:
            # Extract the content from OpenRouter response
            if (
                "choices" in openrouter_response
                and len(openrouter_response["choices"]) > 0
            ):
                choice = openrouter_response["choices"][0]
                content = choice.get("message", {}).get("content", "")

                # Format as ADK-compatible response
                return {
                    "candidates": [
                        {
                            "content": {"parts": [{"text": content}], "role": "model"},
                            "finishReason": choice.get("finish_reason", "STOP"),
                            "index": 0,
                            "safetyRatings": [],  # OpenRouter doesn't provide safety ratings
                        }
                    ],
                    "usageMetadata": {
                        "promptTokenCount": openrouter_response.get("usage", {}).get(
                            "prompt_tokens", 0
                        ),
                        "candidatesTokenCount": openrouter_response.get(
                            "usage", {}
                        ).get("completion_tokens", 0),
                        "totalTokenCount": openrouter_response.get("usage", {}).get(
                            "total_tokens", 0
                        ),
                    },
                }
            else:
                raise Exception("No valid choices in OpenRouter response")

        except Exception as e:
            logger.error(f"Error converting OpenRouter response: {e}")
            # Return a fallback response
            return {
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": f"Error processing response: {str(e)}"}],
                            "role": "model",
                        },
                        "finishReason": "ERROR",
                        "index": 0,
                        "safetyRatings": [],
                    }
                ],
                "usageMetadata": {
                    "promptTokenCount": 0,
                    "candidatesTokenCount": 0,
                    "totalTokenCount": 0,
                },
            }


def create_openrouter_provider() -> Optional[OpenRouterProvider]:
    """
    Create an OpenRouter provider if the model is configured for OpenRouter.

    Returns:
        OpenRouterProvider instance if configured, None otherwise
    """
    model = os.getenv("VANA_MODEL", "")

    # Check if the model is an OpenRouter model
    if model.startswith("openrouter/"):
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            logger.error("OPENROUTER_API_KEY not found in environment variables")
            return None

        # Extract the actual model name (remove openrouter/ prefix)
        actual_model = model.replace("openrouter/", "")

        config = OpenRouterConfig(api_key=api_key, model=actual_model)

        return OpenRouterProvider(config)

    return None


def is_openrouter_model(model: str) -> bool:
    """
    Check if a model string indicates an OpenRouter model.

    Args:
        model: Model string to check

    Returns:
        True if it's an OpenRouter model, False otherwise
    """
    return model.startswith("openrouter/")

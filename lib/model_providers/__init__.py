"""
Model Providers Package for VANA Agent System

This package provides custom model providers that extend Google ADK's capabilities
to support external APIs like OpenRouter while maintaining ADK compatibility.
"""

from .openrouter_provider import OpenRouterConfig, OpenRouterProvider, create_openrouter_provider, is_openrouter_model

__all__ = ["OpenRouterProvider", "OpenRouterConfig", "create_openrouter_provider", "is_openrouter_model"]

"""
Resilience Module for VANA

This module provides resilience-related functionality for the VANA project,
including circuit breakers and other fault tolerance mechanisms.
"""

from .circuit_breaker import (
    CircuitBreaker,
    CircuitState,
    CircuitBreakerOpenError,
    CircuitBreakerRegistry,
    circuit_breaker,
    registry
)

__all__ = [
    'CircuitBreaker',
    'CircuitState',
    'CircuitBreakerOpenError',
    'CircuitBreakerRegistry',
    'circuit_breaker',
    'registry'
]

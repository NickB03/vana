import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)


def safe_tool(func: Callable[..., Any]) -> Callable[..., Any]:
    """Execute a tool safely, logging exceptions and returning the error string."""

    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:  # pragma: no cover - log then return str
            logger.exception("Error executing tool %s", getattr(func, "__name__", str(func)))
            return str(e)

    return wrapper

import functools


def safe_tool(func):
    """Wrap tool function with basic error handling."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as exc:
            return f"Tool {func.__name__} failed: {exc}"

    return wrapper

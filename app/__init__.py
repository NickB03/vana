"""Application package exports.

This module previously imported ``root_agent`` at import time which in turn
requires the ``google`` ADK package.  The testing environment used in this
repository does not provide that dependency which meant that merely importing
``app`` raised a ``ModuleNotFoundError``.  Many tests import submodules such as
``app.utils.sse_broadcaster`` and therefore failed before they even began to
run.

To make the package importable without the optional dependency we attempt to
import ``root_agent`` lazily and silently ignore the failure when the Google
package is unavailable.  This mirrors the behaviour of optional dependencies
and keeps the public API intact for environments where the dependency is
installed.
"""

try:  # pragma: no cover - simple import wrapper
    from app.agent import root_agent  # type: ignore

    __all__ = ["root_agent"]
except ModuleNotFoundError:  # pragma: no cover
    # ``root_agent`` is optional and only available when the Google ADK package
    # is installed.  Expose an empty public API when the dependency is missing
    # so that importing :mod:`app` still succeeds.
    __all__: list[str] = []

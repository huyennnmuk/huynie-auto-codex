"""Deprecated shim - import from core.client instead."""

from warnings import warn

from core.client import CodexClientAdapter, create_client, get_client

warn(
    "auto-claude/client.py is deprecated; import from core.client instead.",
    DeprecationWarning,
    stacklevel=2,
)

__all__ = ["CodexClientAdapter", "create_client", "get_client"]

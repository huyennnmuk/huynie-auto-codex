"""Deprecated shim - import from core.agent instead."""

from warnings import warn

from core.agent import *  # noqa: F403

warn(
    "auto-claude/agent.py is deprecated; import from core.agent instead.",
    DeprecationWarning,
    stacklevel=2,
)

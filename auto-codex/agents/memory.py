"""
Backwards-compatible memory module.

Historically, memory helpers lived in `agents.memory`. The implementation was
refactored into `agents.memory_manager` to avoid name collisions with the
top-level `memory` package. This module preserves the old import path.
"""

from __future__ import annotations

from .memory_manager import (
    debug_memory_system_status,
    get_graphiti_context,
    save_session_memory,
    save_session_to_graphiti,
)

__all__ = [
    "debug_memory_system_status",
    "get_graphiti_context",
    "save_session_memory",
    "save_session_to_graphiti",
]


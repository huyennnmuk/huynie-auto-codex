"""
Custom MCP Tools for Auto-Codex Agents
======================================

This module provides custom MCP tools that agents can use for reliable
operations on auto-codex data structures. These tools replace prompt-based
JSON manipulation with guaranteed-correct operations.

Benefits:
- 100% reliable JSON operations (no malformed output)
- Reduced context usage (tool definitions << prompt instructions)
- Type-safe with proper error handling
- Each agent only sees tools relevant to their role via allowed_tools
"""

from .models import (
    ELECTRON_TOOLS,
    TOOL_GET_BUILD_PROGRESS,
    TOOL_GET_SESSION_CONTEXT,
    TOOL_RECORD_DISCOVERY,
    TOOL_RECORD_GOTCHA,
    TOOL_UPDATE_QA_STATUS,
    TOOL_UPDATE_SUBTASK_STATUS,
    is_electron_mcp_enabled,
)
from .permissions import get_allowed_tools, get_codex_tool_permissions
from .registry import create_auto_claude_mcp_server, is_tools_available

__all__ = [
    # Main API
    "create_auto_claude_mcp_server",
    "get_allowed_tools",
    "get_codex_tool_permissions",
    "is_tools_available",
    # Tool name constants
    "TOOL_UPDATE_SUBTASK_STATUS",
    "TOOL_GET_BUILD_PROGRESS",
    "TOOL_RECORD_DISCOVERY",
    "TOOL_RECORD_GOTCHA",
    "TOOL_GET_SESSION_CONTEXT",
    "TOOL_UPDATE_QA_STATUS",
    # Electron MCP
    "ELECTRON_TOOLS",
    "is_electron_mcp_enabled",
]

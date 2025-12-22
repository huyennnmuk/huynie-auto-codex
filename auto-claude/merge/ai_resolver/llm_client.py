"""
LLM Client
==========

Codex-backed integration for AI-based conflict resolution.

This module provides the factory function for creating an AIResolver
configured to use the provider abstraction layer.
"""

from __future__ import annotations

import asyncio
import logging
import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .resolver import AIResolver

logger = logging.getLogger(__name__)


def create_llm_resolver() -> AIResolver:
    """
    Create an AIResolver configured to use the provider abstraction layer.

    Returns:
        Configured AIResolver instance
    """
    # Import here to avoid circular dependency
    from core.client import get_client

    from .resolver import AIResolver

    def call_llm(system: str, user: str) -> str:
        """Call the configured provider for merge resolution."""

        async def _run_merge() -> str:
            prompt = f"{system}\n\n{user}"
            client = get_client()
            if not client.is_available():
                logger.warning("LLM provider unavailable, AI resolution disabled")
                return ""

            try:
                session_id = await client.start_session(prompt)
                response_text = ""
                async for event in client.stream_events(session_id):
                    if event.type.value == "text":
                        response_text += (
                            event.data.get("content")
                            or event.data.get("text")
                            or ""
                        )
                logger.info(f"AI merge response: {len(response_text)} chars")
                return response_text
            except Exception as e:
                logger.error(f"LLM call failed: {e}")
                print(f"    [ERROR] LLM error: {e}", file=sys.stderr)
                return ""

        try:
            return asyncio.run(_run_merge())
        except Exception as e:
            logger.error(f"asyncio.run failed: {e}")
            print(f"    [ERROR] asyncio error: {e}", file=sys.stderr)
            return ""

    logger.info("Using provider-backed client for merge resolution")
    return AIResolver(ai_call_fn=call_llm)

"""
Provider-backed client wrapper for AI analysis.
"""

from pathlib import Path

from core.client import get_client
from core.protocols import EventType

LLM_AVAILABLE = get_client().is_available()


class LLMAnalysisClient:
    """Wrapper for LLM provider with analysis-specific configuration."""

    MAX_TURNS = 50

    def __init__(self, project_dir: Path):
        """
        Initialize LLM client.

        Args:
            project_dir: Root directory of project being analyzed
        """
        self.project_dir = project_dir
        self.client = get_client(project_dir=project_dir)
        if not self.client.is_available():
            raise RuntimeError("LLM provider not available. Check Codex CLI and API key.")

    async def run_analysis_query(self, prompt: str) -> str:
        """
        Run an LLM query for analysis.

        Args:
            prompt: The analysis prompt

        Returns:
            LLM response text
        """
        try:
            prompt_text = self._build_prompt(prompt)
            session_id = await self.client.start_session(prompt_text)
            return await self._collect_response(session_id)
        finally:
            pass

    def _build_prompt(self, prompt: str) -> str:
        system_prompt = (
            f"You are a senior software architect analyzing this codebase. "
            f"Your working directory is: {self.project_dir.resolve()}\n"
            f"Use Read, Grep, and Glob tools to analyze actual code. "
            f"Output your analysis as valid JSON only."
        )
        return f"{system_prompt}\n\n{prompt}"

    async def _collect_response(self, session_id: str) -> str:
        """
        Collect text response from the LLM client.

        Args:
            session_id: Active session ID

        Returns:
            Collected response text
        """
        response_text = ""

        async for event in self.client.stream_events(session_id):
            if event.type == EventType.TEXT:
                response_text += (
                    event.data.get("content") or event.data.get("text") or ""
                )

        return response_text

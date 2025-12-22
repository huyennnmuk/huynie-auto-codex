from dataclasses import dataclass
from enum import Enum
from typing import Any, AsyncIterator, Optional, Protocol


class EventType(Enum):
    TEXT = "text"
    TOOL_START = "tool_start"
    TOOL_RESULT = "tool_result"
    ERROR = "error"
    SESSION_START = "session_start"
    SESSION_END = "session_end"


@dataclass
class LLMEvent:
    type: EventType
    data: dict[str, Any]
    timestamp: Optional[float] = None


class LLMClientProtocol(Protocol):
    """Abstract protocol for LLM client implementations."""

    async def start_session(self, prompt: str, **kwargs) -> str:
        """Start a new session, return session ID."""
        ...

    async def send(self, session_id: str, message: str) -> None:
        """Send a message to an existing session."""
        ...

    async def stream_events(self, session_id: str) -> AsyncIterator[LLMEvent]:
        """Stream events from the session."""
        ...

    async def close(self, session_id: str) -> None:
        """Close and cleanup a session."""
        ...

    def is_available(self) -> bool:
        """Check if this provider is available (credentials, CLI installed, etc.)."""
        ...

import asyncio
import json
import os
import shutil
import uuid
from dataclasses import dataclass
from typing import Any, AsyncIterator, Optional

from core.auth import get_auth_token
from core.protocols import EventType, LLMClientProtocol, LLMEvent


@dataclass
class CodexSession:
    """Tracks a running Codex CLI session."""

    session_id: str
    process: Optional[asyncio.subprocess.Process] = None
    workdir: str = ""
    closed: bool = False


class CodexCliClient(LLMClientProtocol):
    """Codex CLI adapter implementing LLMClientProtocol."""

    def __init__(
        self,
        model: str = "gpt-5.2-codex-xhigh",
        workdir: Optional[str] = None,
        timeout: int = 600,
        bypass_sandbox: bool = True,
        extra_args: Optional[list[str]] = None,
    ) -> None:
        self.model = model
        self.workdir = workdir or os.getcwd()
        self.timeout = timeout
        self.bypass_sandbox = bypass_sandbox
        self.extra_args = extra_args or []
        self._sessions: dict[str, CodexSession] = {}

    def is_available(self) -> bool:
        """
        Check if codex CLI is installed and authentication is configured.

        Codex can authenticate via:
        - OPENAI_API_KEY
        - CODEX_CODE_OAUTH_TOKEN
        - CODEX_CONFIG_DIR
        """
        if not shutil.which("codex"):
            return False

        return bool(get_auth_token())

    async def start_session(self, prompt: str, **kwargs) -> str:
        """Start a new Codex CLI session."""
        session_id = str(uuid.uuid4())
        cmd = self._build_command(prompt, **kwargs)
        workdir = kwargs.get("workdir", self.workdir)

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=workdir,
        )

        if process.stdin:
            process.stdin.write(prompt.encode() + b"\n")
            await process.stdin.drain()
            process.stdin.close()

        self._sessions[session_id] = CodexSession(
            session_id=session_id, process=process, workdir=workdir
        )
        return session_id

    def _build_command(self, prompt: str, **kwargs) -> list[str]:
        """Build the codex CLI command."""
        cmd = ["codex", "exec"]

        if self.bypass_sandbox:
            cmd.append("--dangerously-bypass-approvals-and-sandbox")

        cmd.extend(["-m", self.model])
        cmd.append("--json")
        cmd.extend(self.extra_args)
        cmd.append("-")
        return cmd

    async def send(self, session_id: str, message: str) -> None:
        """Send input to the session's stdin."""
        session = self._sessions.get(session_id)
        if not session or not session.process or session.closed:
            raise ValueError(f"Session {session_id} not found")

        if not session.process.stdin:
            raise RuntimeError("Session stdin is not available")

        session.process.stdin.write(message.encode() + b"\n")
        await session.process.stdin.drain()

    async def stream_events(self, session_id: str) -> AsyncIterator[LLMEvent]:
        """Stream and parse Codex CLI JSON output."""
        session = self._sessions.get(session_id)
        if not session or not session.process:
            raise ValueError(f"Session {session_id} not found")

        process = session.process
        yield LLMEvent(type=EventType.SESSION_START, data={"session_id": session_id})

        try:
            while True:
                try:
                    if self.timeout and self.timeout > 0:
                        line = await asyncio.wait_for(
                            process.stdout.readline(), timeout=self.timeout
                        )
                    else:
                        line = await process.stdout.readline()
                except asyncio.TimeoutError:
                    yield LLMEvent(
                        type=EventType.ERROR,
                        data={"error": "timeout waiting for output"},
                    )
                    await self._terminate_process(process)
                    break

                if not line:
                    break

                event = self._parse_output_line(line.decode(errors="replace").strip())
                if event:
                    yield event
        except Exception as exc:
            yield LLMEvent(type=EventType.ERROR, data={"error": str(exc)})

        returncode = process.returncode
        if returncode is None:
            returncode = await process.wait()
        if returncode != 0:
            stderr = ""
            if process.stderr:
                stderr = (await process.stderr.read()).decode(errors="replace").strip()
            yield LLMEvent(
                type=EventType.ERROR,
                data={"error": "process exited with error", "returncode": returncode, "stderr": stderr},
            )

        await self.close(session_id)
        yield LLMEvent(type=EventType.SESSION_END, data={"session_id": session_id})

    def _parse_output_line(self, line: str) -> Optional[LLMEvent]:
        """Parse a single line of Codex CLI JSON output."""
        if not line:
            return None

        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            return LLMEvent(type=EventType.TEXT, data={"content": line})

        event_type = data.get("type", "")

        if event_type == "message":
            return LLMEvent(type=EventType.TEXT, data={"content": data.get("content", "")})
        if event_type == "tool_use":
            return LLMEvent(type=EventType.TOOL_START, data=data)
        if event_type == "tool_result":
            return LLMEvent(type=EventType.TOOL_RESULT, data=data)
        if event_type == "error":
            return LLMEvent(type=EventType.ERROR, data=data)
        return LLMEvent(type=EventType.TEXT, data={"raw": line})

    async def close(self, session_id: str) -> None:
        """Close and cleanup a session."""
        session = self._sessions.get(session_id)
        if not session or session.closed:
            self._sessions.pop(session_id, None)
            return

        if session.process:
            await self._terminate_process(session.process)

        session.closed = True
        self._sessions.pop(session_id, None)

    async def _terminate_process(self, process: asyncio.subprocess.Process) -> None:
        if process.returncode is not None:
            return
        process.terminate()
        try:
            await asyncio.wait_for(process.wait(), timeout=5)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()

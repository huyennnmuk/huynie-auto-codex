"""
Authentication helpers for Auto Codex.

Provides centralized authentication token resolution with back-compat warnings
for legacy LLM OAuth tokens, plus SDK environment variable passthrough.
"""

import os
import re

# Priority order for auth token resolution
# NOTE: Auto Codex targets OpenAI Codex and requires an OpenAI API key.
AUTH_TOKEN_ENV_VARS = [
    "OPENAI_API_KEY",
]

# Legacy environment variables that should be migrated
DEPRECATED_AUTH_ENV_VARS = [
    "CLAUDE_CODE_OAUTH_TOKEN",
]

# Environment variables to pass through to SDK subprocess
SDK_ENV_VARS = [
    "OPENAI_API_KEY",
    "NO_PROXY",
    "DISABLE_TELEMETRY",
    "DISABLE_COST_WARNINGS",
    "API_TIMEOUT_MS",
]

_OPENAI_KEY_PATTERN = re.compile(r"^sk-[A-Za-z0-9-]{20,}$")


def is_valid_openai_api_key(token: str) -> bool:
    """Return True if the token matches expected OpenAI API key format."""
    return bool(_OPENAI_KEY_PATTERN.match(token or ""))


def get_deprecated_auth_token() -> str | None:
    """Return the legacy LLM OAuth token if present (deprecated)."""
    for var in DEPRECATED_AUTH_ENV_VARS:
        token = os.environ.get(var)
        if token:
            return token
    return None


def get_auth_token() -> str | None:
    """
    Get authentication token from environment variables.

    Checks sources in priority order:
    1. OPENAI_API_KEY (env var)

    Returns:
        Token string if found, None otherwise
    """
    token = os.environ.get(AUTH_TOKEN_ENV_VARS[0], "")
    if token and is_valid_openai_api_key(token):
        return token
    return None


def get_auth_token_source() -> str | None:
    """Get the name of the source that provided the auth token."""
    token = os.environ.get(AUTH_TOKEN_ENV_VARS[0], "")
    if token and is_valid_openai_api_key(token):
        return AUTH_TOKEN_ENV_VARS[0]
    return None


def require_auth_token() -> str:
    """
    Get authentication token or raise ValueError.

    Raises:
        ValueError: If no auth token is found in any supported source
    """
    token = get_auth_token()
    if token:
        return token

    openai_token = os.environ.get(AUTH_TOKEN_ENV_VARS[0], "")
    if openai_token and not is_valid_openai_api_key(openai_token):
        raise ValueError(
            "Invalid OPENAI_API_KEY format.\n"
            "Expected a key starting with 'sk-' (e.g., sk-...)."
        )

    deprecated_token = get_deprecated_auth_token()
    if deprecated_token:
        raise ValueError(
            "Detected CLAUDE_CODE_OAUTH_TOKEN, but Codex now requires OPENAI_API_KEY.\n"
            "Please migrate by setting OPENAI_API_KEY in your environment and remove "
            "CLAUDE_CODE_OAUTH_TOKEN once complete."
        )

    raise ValueError(
        "No OpenAI API key found.\n\n"
        "Auto Codex uses OpenAI Codex.\n"
        "Set OPENAI_API_KEY in your .env file or environment."
    )


def get_sdk_env_vars() -> dict[str, str]:
    """
    Get environment variables to pass to SDK.

    Collects relevant env vars that should be passed through to subprocesses.

    Returns:
        Dict of env var name -> value for non-empty vars
    """
    env = {}
    for var in SDK_ENV_VARS:
        value = os.environ.get(var)
        if value:
            env[var] = value
    return env


def ensure_openai_api_key() -> None:
    """Ensure a valid OPENAI_API_KEY is set, raising a helpful error if not."""
    require_auth_token()


def ensure_claude_code_oauth_token() -> None:
    """
    Deprecated shim for legacy call sites.

    Ensures a valid OPENAI_API_KEY is set, and raises a helpful error if not.
    """
    ensure_openai_api_key()

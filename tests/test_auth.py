#!/usr/bin/env python3
"""
Auth module tests for OpenAI API key migration.
"""

import pytest

from core.auth import (
    get_auth_token,
    get_auth_token_source,
    get_deprecated_auth_token,
    is_valid_openai_api_key,
    require_auth_token,
)


def test_get_auth_token_uses_openai_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-1234567890abcdef1234")

    assert get_auth_token() == "sk-test-1234567890abcdef1234"
    assert get_auth_token_source() == "OPENAI_API_KEY"


def test_require_auth_token_invalid_format(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "not-a-key")

    with pytest.raises(ValueError) as excinfo:
        require_auth_token()

    assert "Invalid OPENAI_API_KEY format" in str(excinfo.value)


def test_require_auth_token_deprecated_oauth(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", "legacy-token")

    assert get_deprecated_auth_token() == "legacy-token"
    assert get_auth_token() is None

    with pytest.raises(ValueError) as excinfo:
        require_auth_token()

    message = str(excinfo.value)
    assert "CLAUDE_CODE_OAUTH_TOKEN" in message
    assert "OPENAI_API_KEY" in message


def test_is_valid_openai_api_key():
    assert is_valid_openai_api_key("sk-test-1234567890abcdef1234") is True
    assert is_valid_openai_api_key("sk-proj-1234567890abcdef1234") is True
    assert is_valid_openai_api_key("sk_123") is False
    assert is_valid_openai_api_key("not-a-key") is False

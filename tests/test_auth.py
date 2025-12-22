#!/usr/bin/env python3
"""
Auth module tests for Codex authentication sources.
"""

import pytest

from core.auth import (
    get_auth_token,
    get_auth_token_source,
    get_deprecated_auth_token,
    is_valid_codex_config_dir,
    is_valid_codex_oauth_token,
    is_valid_openai_api_key,
    require_auth_token,
)


def test_get_auth_token_uses_openai_key(monkeypatch):
    monkeypatch.delenv("CODEX_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.delenv("CODEX_CONFIG_DIR", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-1234567890abcdef1234")

    assert get_auth_token() == "sk-test-1234567890abcdef1234"
    assert get_auth_token_source() == "OPENAI_API_KEY"


def test_get_auth_token_uses_oauth_token(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("CODEX_CODE_OAUTH_TOKEN", "codex-token-1234567890abcdef")

    assert get_auth_token() == "codex-token-1234567890abcdef"
    assert get_auth_token_source() == "CODEX_CODE_OAUTH_TOKEN"


def test_get_auth_token_uses_config_dir(monkeypatch, tmp_path):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("CODEX_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.setenv("CODEX_CONFIG_DIR", str(tmp_path))

    assert get_auth_token() == str(tmp_path)
    assert get_auth_token_source() == "CODEX_CONFIG_DIR"


def test_require_auth_token_invalid_format(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "not-a-key")
    monkeypatch.delenv("CODEX_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.delenv("CODEX_CONFIG_DIR", raising=False)

    with pytest.raises(ValueError) as excinfo:
        require_auth_token()

    assert "Invalid OPENAI_API_KEY format" in str(excinfo.value)


def test_require_auth_token_deprecated_oauth(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("CODEX_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.delenv("CODEX_CONFIG_DIR", raising=False)
    monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", "legacy-token")

    assert get_deprecated_auth_token() == "legacy-token"
    assert get_auth_token() is None

    with pytest.raises(ValueError) as excinfo:
        require_auth_token()

    message = str(excinfo.value)
    assert "CLAUDE_CODE_OAUTH_TOKEN" in message
    assert "OPENAI_API_KEY" in message
    assert "CODEX_CODE_OAUTH_TOKEN" in message
    assert "CODEX_CONFIG_DIR" in message


def test_is_valid_openai_api_key():
    assert is_valid_openai_api_key("sk-test-1234567890abcdef1234") is True
    assert is_valid_openai_api_key("sk-proj-1234567890abcdef1234") is True
    assert is_valid_openai_api_key("sk_123") is False
    assert is_valid_openai_api_key("not-a-key") is False


def test_is_valid_codex_oauth_token():
    assert is_valid_codex_oauth_token("codex-token-1234567890abcdef") is True
    assert is_valid_codex_oauth_token("short-token") is False
    assert is_valid_codex_oauth_token("token with space") is False


def test_is_valid_codex_config_dir(tmp_path):
    assert is_valid_codex_config_dir(str(tmp_path)) is True
    assert is_valid_codex_config_dir(str(tmp_path / "missing")) is False

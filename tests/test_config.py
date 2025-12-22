#!/usr/bin/env python3
"""
CLI configuration checks for auth migration.
"""

from pathlib import Path

from cli.utils import validate_environment


def _write_spec_file(spec_dir: Path) -> None:
    spec_dir.mkdir(parents=True, exist_ok=True)
    (spec_dir / "spec.md").write_text("# Spec\n")


def test_validate_environment_deprecated_token(monkeypatch, tmp_path, capsys):
    spec_dir = tmp_path / "specs" / "001-test"
    _write_spec_file(spec_dir)

    monkeypatch.setenv("AUTO_CODEX_DISABLE_DEFAULT_CODEX_CONFIG_DIR", "1")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("CODEX_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.delenv("CODEX_CONFIG_DIR", raising=False)
    monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", "legacy-token")
    monkeypatch.delenv("LINEAR_API_KEY", raising=False)
    monkeypatch.setenv("GRAPHITI_ENABLED", "false")

    assert validate_environment(spec_dir) is False

    output = capsys.readouterr().out
    assert "CLAUDE_CODE_OAUTH_TOKEN" in output
    assert "OPENAI_API_KEY" in output


def test_validate_environment_invalid_openai_key(monkeypatch, tmp_path, capsys):
    spec_dir = tmp_path / "specs" / "001-test"
    _write_spec_file(spec_dir)

    monkeypatch.setenv("AUTO_CODEX_DISABLE_DEFAULT_CODEX_CONFIG_DIR", "1")
    monkeypatch.setenv("OPENAI_API_KEY", "invalid-key")
    monkeypatch.delenv("CLAUDE_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.delenv("CODEX_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.delenv("CODEX_CONFIG_DIR", raising=False)
    monkeypatch.delenv("LINEAR_API_KEY", raising=False)
    monkeypatch.setenv("GRAPHITI_ENABLED", "false")

    assert validate_environment(spec_dir) is False

    output = capsys.readouterr().out
    assert "Invalid OPENAI_API_KEY format" in output


def test_validate_environment_valid_openai_key(monkeypatch, tmp_path, capsys):
    spec_dir = tmp_path / "specs" / "001-test"
    _write_spec_file(spec_dir)

    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-1234567890abcdef1234")
    monkeypatch.delenv("CLAUDE_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.delenv("CODEX_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.delenv("CODEX_CONFIG_DIR", raising=False)
    monkeypatch.delenv("LINEAR_API_KEY", raising=False)
    monkeypatch.setenv("GRAPHITI_ENABLED", "false")

    assert validate_environment(spec_dir) is True

    output = capsys.readouterr().out
    assert "Auth: OPENAI_API_KEY" in output


def test_validate_environment_oauth_token_overrides_invalid_openai_key(
    monkeypatch, tmp_path, capsys
):
    spec_dir = tmp_path / "specs" / "001-test"
    _write_spec_file(spec_dir)

    monkeypatch.setenv("OPENAI_API_KEY", "invalid-key")
    monkeypatch.setenv("CODEX_CODE_OAUTH_TOKEN", "codex-oauth-1234567890abcdef1234")
    monkeypatch.delenv("CODEX_CONFIG_DIR", raising=False)
    monkeypatch.delenv("CLAUDE_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.delenv("LINEAR_API_KEY", raising=False)
    monkeypatch.setenv("GRAPHITI_ENABLED", "false")

    assert validate_environment(spec_dir) is True

    output = capsys.readouterr().out
    assert "Invalid OPENAI_API_KEY format" in output
    assert "Auth: CODEX_CODE_OAUTH_TOKEN" in output


def test_validate_environment_valid_oauth_token(monkeypatch, tmp_path, capsys):
    spec_dir = tmp_path / "specs" / "001-test"
    _write_spec_file(spec_dir)

    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("CODEX_CODE_OAUTH_TOKEN", "codex-token-1234567890abcdef")
    monkeypatch.delenv("CODEX_CONFIG_DIR", raising=False)
    monkeypatch.delenv("LINEAR_API_KEY", raising=False)
    monkeypatch.setenv("GRAPHITI_ENABLED", "false")

    assert validate_environment(spec_dir) is True

    output = capsys.readouterr().out
    assert "Auth: CODEX_CODE_OAUTH_TOKEN" in output


def test_validate_environment_invalid_codex_config_dir(monkeypatch, tmp_path, capsys):
    spec_dir = tmp_path / "specs" / "001-test"
    _write_spec_file(spec_dir)

    monkeypatch.setenv("AUTO_CODEX_DISABLE_DEFAULT_CODEX_CONFIG_DIR", "1")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("CODEX_CODE_OAUTH_TOKEN", raising=False)
    monkeypatch.setenv("CODEX_CONFIG_DIR", str(tmp_path / "missing"))
    monkeypatch.delenv("LINEAR_API_KEY", raising=False)
    monkeypatch.setenv("GRAPHITI_ENABLED", "false")

    assert validate_environment(spec_dir) is False

    output = capsys.readouterr().out
    assert "Invalid CODEX_CONFIG_DIR" in output

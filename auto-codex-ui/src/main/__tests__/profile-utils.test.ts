import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir, homedir } from 'os';
import { join } from 'path';
import type { CodexProfile } from '../../shared/types';
import { expandHomePath, isProfileAuthenticated } from '../codex-profile/profile-utils';

function makeProfile(configDir: string): CodexProfile {
  return {
    id: 'p1',
    name: 'Test',
    configDir,
    isDefault: false,
    createdAt: new Date(),
  };
}

describe('codex-profile/profile-utils', () => {
  it('expandHomePath expands ~', () => {
    expect(expandHomePath('~/x')).toBe(join(homedir(), 'x'));
  });

  it('isProfileAuthenticated returns true for auth.json API key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'codex-profile-'));
    try {
      writeFileSync(join(dir, 'auth.json'), JSON.stringify({ OPENAI_API_KEY: 'sk-test-1234567890abcdef' }));
      expect(isProfileAuthenticated(makeProfile(dir))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('isProfileAuthenticated returns true for non-trivial config.toml', () => {
    const dir = mkdtempSync(join(tmpdir(), 'codex-profile-'));
    try {
      writeFileSync(join(dir, 'config.toml'), 'model_provider="yunyi"\npreferred_auth_method="apikey"\n');
      expect(isProfileAuthenticated(makeProfile(dir))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});


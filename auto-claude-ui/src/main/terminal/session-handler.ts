/**
 * Session Handler Module
 * Manages terminal session persistence, restoration, and Codex session tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { TerminalProcess, WindowGetter } from './types';
import { getTerminalSessionStore, type TerminalSession } from '../terminal-session-store';
import { IPC_CHANNELS } from '../../shared/constants';
import { debugLog, debugError } from '../../shared/utils/debug-logger';

/**
 * Get the Codex project slug from a project path.
 * Codex uses the full path with forward slashes replaced by dashes.
 */
function getCodexProjectSlug(projectPath: string): string {
  return projectPath.replace(/[/\\]/g, '-');
}

/**
 * Find the most recent Codex session file for a project
 */
export function findMostRecentCodexSession(projectPath: string): string | null {
  const slug = getCodexProjectSlug(projectPath);
  const codexProjectDir = path.join(os.homedir(), '.codex', 'projects', slug);

  try {
    if (!fs.existsSync(codexProjectDir)) {
      debugLog('[SessionHandler] Codex project directory not found:', codexProjectDir);
      return null;
    }

    const files = fs.readdirSync(codexProjectDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        path: path.join(codexProjectDir, f),
        mtime: fs.statSync(path.join(codexProjectDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      debugLog('[SessionHandler] No Codex session files found in:', codexProjectDir);
      return null;
    }

    const sessionId = files[0].name.replace('.jsonl', '');
    debugLog('[SessionHandler] Found most recent Codex session:', sessionId);
    return sessionId;
  } catch (error) {
    debugError('[SessionHandler] Error finding Codex session:', error);
    return null;
  }
}

/**
 * Find a Codex session created/modified after a given timestamp
 */
export function findCodexSessionAfter(projectPath: string, afterTimestamp: number): string | null {
  const slug = getCodexProjectSlug(projectPath);
  const codexProjectDir = path.join(os.homedir(), '.codex', 'projects', slug);

  try {
    if (!fs.existsSync(codexProjectDir)) {
      return null;
    }

    const files = fs.readdirSync(codexProjectDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        path: path.join(codexProjectDir, f),
        mtime: fs.statSync(path.join(codexProjectDir, f)).mtime.getTime()
      }))
      .filter(f => f.mtime > afterTimestamp)
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return null;
    }

    return files[0].name.replace('.jsonl', '');
  } catch (error) {
    debugError('[SessionHandler] Error finding Codex session:', error);
    return null;
  }
}

/**
 * Persist a terminal session to disk
 */
export function persistSession(terminal: TerminalProcess): void {
  if (!terminal.projectPath) {
    return;
  }

  const store = getTerminalSessionStore();
  const session: TerminalSession = {
    id: terminal.id,
    title: terminal.title,
    cwd: terminal.cwd,
    projectPath: terminal.projectPath,
    isCodexMode: terminal.isCodexMode,
    codexSessionId: terminal.codexSessionId,
    outputBuffer: terminal.outputBuffer,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };
  store.saveSession(session);
}

/**
 * Persist all active sessions
 */
export function persistAllSessions(terminals: Map<string, TerminalProcess>): void {
  const _store = getTerminalSessionStore();

  terminals.forEach((terminal) => {
    if (terminal.projectPath) {
      persistSession(terminal);
    }
  });
}

/**
 * Remove a session from persistent storage
 */
export function removePersistedSession(terminal: TerminalProcess): void {
  if (!terminal.projectPath) {
    return;
  }

  const store = getTerminalSessionStore();
  store.removeSession(terminal.projectPath, terminal.id);
}

/**
 * Update Codex session ID in persistent storage
 */
export function updateCodexSessionId(
  projectPath: string,
  terminalId: string,
  sessionId: string
): void {
  const store = getTerminalSessionStore();
  store.updateCodexSessionId(projectPath, terminalId, sessionId);
}

/**
 * Get saved sessions for a project
 */
export function getSavedSessions(projectPath: string): TerminalSession[] {
  const store = getTerminalSessionStore();
  return store.getSessions(projectPath);
}

/**
 * Clear all saved sessions for a project
 */
export function clearSavedSessions(projectPath: string): void {
  const store = getTerminalSessionStore();
  store.clearProjectSessions(projectPath);
}

/**
 * Get available session dates
 */
export function getAvailableSessionDates(
  projectPath?: string
): import('../terminal-session-store').SessionDateInfo[] {
  const store = getTerminalSessionStore();
  return store.getAvailableDates(projectPath);
}

/**
 * Get sessions for a specific date
 */
export function getSessionsForDate(date: string, projectPath: string): TerminalSession[] {
  const store = getTerminalSessionStore();
  return store.getSessionsForDate(date, projectPath);
}

/**
 * Attempt to capture Codex session ID by polling the session directory
 */
export function captureCodexSessionId(
  terminalId: string,
  projectPath: string,
  startTime: number,
  terminals: Map<string, TerminalProcess>,
  getWindow: WindowGetter
): void {
  let attempts = 0;
  const maxAttempts = 10;

  const checkForSession = () => {
    attempts++;

    const terminal = terminals.get(terminalId);
    if (!terminal || !terminal.isCodexMode) {
      return;
    }

    if (terminal.codexSessionId) {
      return;
    }

    const sessionId = findCodexSessionAfter(projectPath, startTime);

    if (sessionId) {
      terminal.codexSessionId = sessionId;
      debugLog('[SessionHandler] Captured Codex session ID from directory:', sessionId);

      if (terminal.projectPath) {
        updateCodexSessionId(terminal.projectPath, terminalId, sessionId);
      }

      const win = getWindow();
      if (win) {
        win.webContents.send(IPC_CHANNELS.TERMINAL_CODEX_SESSION, terminalId, sessionId);
      }
    } else if (attempts < maxAttempts) {
      setTimeout(checkForSession, 1000);
    } else {
      debugLog('[SessionHandler] Could not capture Codex session ID after', maxAttempts, 'attempts');
    }
  };

  setTimeout(checkForSession, 2000);
}

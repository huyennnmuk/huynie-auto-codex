/**
 * Terminal Event Handler
 * Manages terminal data output events and processing
 */

import * as OutputParser from './output-parser';
import * as CodexIntegration from './codex-integration-handler';
import type { TerminalProcess, WindowGetter } from './types';

/**
 * Event handler callbacks
 */
export interface EventHandlerCallbacks {
  onCodexSessionId: (terminal: TerminalProcess, sessionId: string) => void;
  onRateLimit: (terminal: TerminalProcess, data: string) => void;
  onOAuthToken: (terminal: TerminalProcess, data: string) => void;
}

/**
 * Handle terminal data output
 */
export function handleTerminalData(
  terminal: TerminalProcess,
  data: string,
  callbacks: EventHandlerCallbacks
): void {
  // Try to extract Codex session ID
  if (terminal.isCodexMode && !terminal.codexSessionId) {
    const sessionId = OutputParser.extractCodexSessionId(data);
    if (sessionId) {
      callbacks.onCodexSessionId(terminal, sessionId);
    }
  }

  // Check for rate limit messages
  if (terminal.isCodexMode) {
    callbacks.onRateLimit(terminal, data);
  }

  // Check for OAuth token
  callbacks.onOAuthToken(terminal, data);
}

/**
 * Create event handler callbacks from TerminalManager context
 */
export function createEventCallbacks(
  getWindow: WindowGetter,
  lastNotifiedRateLimitReset: Map<string, string>,
  switchProfileCallback: (terminalId: string, profileId: string) => Promise<void>
): EventHandlerCallbacks {
  return {
    onCodexSessionId: (terminal, sessionId) => {
      CodexIntegration.handleCodexSessionId(terminal, sessionId, getWindow);
    },
    onRateLimit: (terminal, data) => {
      CodexIntegration.handleRateLimit(
        terminal,
        data,
        lastNotifiedRateLimitReset,
        getWindow,
        switchProfileCallback
      );
    },
    onOAuthToken: (terminal, data) => {
      CodexIntegration.handleOAuthToken(terminal, data, getWindow);
    }
  };
}

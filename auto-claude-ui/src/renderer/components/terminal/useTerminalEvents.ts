import { useEffect } from 'react';
import { useTerminalStore } from '../../stores/terminal-store';

interface UseTerminalEventsOptions {
  terminalId: string;
  onOutput?: (data: string) => void;
  onExit?: (exitCode: number) => void;
  onTitleChange?: (title: string) => void;
  onCodexSession?: (sessionId: string) => void;
}

export function useTerminalEvents({
  terminalId,
  onOutput,
  onExit,
  onTitleChange,
  onCodexSession,
}: UseTerminalEventsOptions) {
  // Handle terminal output from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onTerminalOutput((id, data) => {
      if (id === terminalId) {
        useTerminalStore.getState().appendOutput(terminalId, data);
        onOutput?.(data);
      }
    });

    return cleanup;
  }, [terminalId, onOutput]);

  // Handle terminal exit
  useEffect(() => {
    const cleanup = window.electronAPI.onTerminalExit((id, exitCode) => {
      if (id === terminalId) {
        useTerminalStore.getState().setTerminalStatus(terminalId, 'exited');
        onExit?.(exitCode);
      }
    });

    return cleanup;
  }, [terminalId, onExit]);

  // Handle terminal title change
  useEffect(() => {
    const cleanup = window.electronAPI.onTerminalTitleChange((id, title) => {
      if (id === terminalId) {
        useTerminalStore.getState().updateTerminal(terminalId, { title });
        onTitleChange?.(title);
      }
    });

    return cleanup;
  }, [terminalId, onTitleChange]);

  // Handle Codex session ID capture
  useEffect(() => {
    const cleanup = window.electronAPI.onTerminalCodexSession((id, sessionId) => {
      if (id === terminalId) {
        useTerminalStore.getState().setCodexSessionId(terminalId, sessionId);
        console.warn('[Terminal] Captured Codex session ID:', sessionId);
        onCodexSession?.(sessionId);
      }
    });

    return cleanup;
  }, [terminalId, onCodexSession]);
}

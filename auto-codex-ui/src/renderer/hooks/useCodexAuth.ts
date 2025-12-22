import { useState, useEffect } from 'react';
import type { ProjectEnvConfig } from '../../shared/types';

type AuthStatus = 'checking' | 'authenticated' | 'not_authenticated' | 'error';

export function useCodexAuth(projectId: string, autoBuildPath: string | null, open: boolean) {
  const [isCheckingCodexAuth, setIsCheckingCodexAuth] = useState(false);
  const [codexAuthStatus, setCodexAuthStatus] = useState<AuthStatus>('checking');

  // Check Codex authentication status
  useEffect(() => {
    const checkAuth = async () => {
      if (open && autoBuildPath) {
        setIsCheckingCodexAuth(true);
        try {
          const result = await window.electronAPI.checkCodexAuth(projectId);
          if (result.success && result.data) {
            setCodexAuthStatus(result.data.authenticated ? 'authenticated' : 'not_authenticated');
          } else {
            setCodexAuthStatus('error');
          }
        } catch {
          setCodexAuthStatus('error');
        } finally {
          setIsCheckingCodexAuth(false);
        }
      }
    };
    checkAuth();
  }, [open, projectId, autoBuildPath]);

  const handleCodexSetup = async (
    onSuccess?: (envConfig: ProjectEnvConfig) => void
  ) => {
    setIsCheckingCodexAuth(true);
    try {
      const result = await window.electronAPI.invokeCodexSetup(projectId);
      if (result.success && result.data?.authenticated) {
        setCodexAuthStatus('authenticated');
        // Refresh env config
        const envResult = await window.electronAPI.getProjectEnv(projectId);
        if (envResult.success && envResult.data && onSuccess) {
          onSuccess(envResult.data);
        }
      }
    } catch {
      setCodexAuthStatus('error');
    } finally {
      setIsCheckingCodexAuth(false);
    }
  };

  return {
    isCheckingCodexAuth,
    codexAuthStatus,
    handleCodexSetup,
  };
}

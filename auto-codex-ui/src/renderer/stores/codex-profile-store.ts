import { create } from 'zustand';
import type { CodexProfile, CodexProfileSettings } from '../../shared/types';

interface CodexProfileState {
  profiles: CodexProfile[];
  activeProfileId: string;
  isLoading: boolean;
  isSwitching: boolean;

  // Actions
  setProfiles: (settings: CodexProfileSettings) => void;
  setActiveProfile: (profileId: string) => void;
  addProfile: (profile: CodexProfile) => void;
  updateProfile: (profile: CodexProfile) => void;
  removeProfile: (profileId: string) => void;
  setLoading: (loading: boolean) => void;
  setSwitching: (switching: boolean) => void;
}

export const useCodexProfileStore = create<CodexProfileState>((set) => ({
  profiles: [],
  activeProfileId: 'default',
  isLoading: false,
  isSwitching: false,

  setProfiles: (settings: CodexProfileSettings) => {
    set({
      profiles: settings.profiles,
      activeProfileId: settings.activeProfileId
    });
  },

  setActiveProfile: (profileId: string) => {
    set({ activeProfileId: profileId });
  },

  addProfile: (profile: CodexProfile) => {
    set((state) => ({
      profiles: [...state.profiles, profile]
    }));
  },

  updateProfile: (profile: CodexProfile) => {
    set((state) => ({
      profiles: state.profiles.map((p) =>
        p.id === profile.id ? profile : p
      )
    }));
  },

  removeProfile: (profileId: string) => {
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== profileId)
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setSwitching: (switching: boolean) => {
    set({ isSwitching: switching });
  },
}));

/**
 * Load Codex profiles from the main process
 */
export async function loadCodexProfiles(): Promise<void> {
  const store = useCodexProfileStore.getState();
  store.setLoading(true);

  try {
    const result = await window.electronAPI.getCodexProfiles();
    if (result.success && result.data) {
      store.setProfiles(result.data);
    }
  } catch (error) {
    console.error('[CodexProfileStore] Error loading profiles:', error);
  } finally {
    store.setLoading(false);
  }
}

/**
 * Switch to a different Codex profile in a terminal
 */
export async function switchTerminalToProfile(
  terminalId: string,
  profileId: string
): Promise<boolean> {
  const store = useCodexProfileStore.getState();
  store.setSwitching(true);

  try {
    const result = await window.electronAPI.switchCodexProfile(terminalId, profileId);
    if (result.success) {
      store.setActiveProfile(profileId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[CodexProfileStore] Error switching profile:', error);
    return false;
  } finally {
    store.setSwitching(false);
  }
}

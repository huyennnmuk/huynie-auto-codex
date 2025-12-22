/**
 * Mock implementation for Codex profile management operations
 */

export const codexProfileMock = {
  getCodexProfiles: async () => ({
    success: true,
    data: {
      profiles: [],
      activeProfileId: 'default'
    }
  }),

  saveCodexProfile: async (profile: { id: string; name: string; oauthToken?: string; email?: string; isDefault?: boolean; createdAt?: Date }) => ({
    success: true,
    data: {
      id: profile.id,
      name: profile.name,
      oauthToken: profile.oauthToken,
      email: profile.email,
      isDefault: profile.isDefault ?? false,
      createdAt: profile.createdAt ?? new Date(),
    }
  }),

  deleteCodexProfile: async () => ({ success: true }),

  renameCodexProfile: async () => ({ success: true }),

  setActiveCodexProfile: async () => ({ success: true }),

  switchCodexProfile: async () => ({ success: true }),

  initializeCodexProfile: async () => ({ success: true }),

  setCodexProfileToken: async () => ({ success: true }),

  getAutoSwitchSettings: async () => ({
    success: true,
    data: {
      enabled: false,
      proactiveSwapEnabled: false,
      sessionThreshold: 95,
      weeklyThreshold: 99,
      autoSwitchOnRateLimit: false,
      usageCheckInterval: 30000
    }
  }),

  updateAutoSwitchSettings: async () => ({ success: true }),

  fetchCodexUsage: async () => ({ success: true }),

  getBestAvailableProfile: async () => ({
    success: true,
    data: null
  }),

  onSDKRateLimit: () => () => {},

  retryWithProfile: async () => ({ success: true }),

  // Usage Monitoring (Proactive Account Switching)
  requestUsageUpdate: async () => ({
    success: true,
    data: null
  }),

  onUsageUpdated: () => () => {},

  onProactiveSwapNotification: () => () => {}
};

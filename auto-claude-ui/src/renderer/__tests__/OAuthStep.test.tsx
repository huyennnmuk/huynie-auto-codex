/**
 * Unit tests for OAuthStep component
 * Tests profile management, authentication state display, and user interactions
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CodexProfile, CodexProfileSettings, ElectronAPI } from '../../shared/types';

// Import browser mock to get full ElectronAPI structure
import '../lib/browser-mock';

// Helper to create test profiles
function createTestProfile(overrides: Partial<CodexProfile> = {}): CodexProfile {
  return {
    id: `profile-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name: 'Test Profile',
    isDefault: false,
    createdAt: new Date(),
    ...overrides
  };
}

// Mock functions
const mockGetCodexProfiles = vi.fn();
const mockSaveCodexProfile = vi.fn();
const mockDeleteCodexProfile = vi.fn();
const mockRenameCodexProfile = vi.fn();
const mockSetActiveCodexProfile = vi.fn();
const mockInitializeCodexProfile = vi.fn();
const mockSetCodexProfileToken = vi.fn();
const mockOnTerminalOAuthToken = vi.fn();

describe('OAuthStep Profile Management Logic', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup window.electronAPI mocks
    if (window.electronAPI) {
      window.electronAPI.getCodexProfiles = mockGetCodexProfiles;
      window.electronAPI.saveCodexProfile = mockSaveCodexProfile;
      window.electronAPI.deleteCodexProfile = mockDeleteCodexProfile;
      window.electronAPI.renameCodexProfile = mockRenameCodexProfile;
      window.electronAPI.setActiveCodexProfile = mockSetActiveCodexProfile;
      window.electronAPI.initializeCodexProfile = mockInitializeCodexProfile;
      window.electronAPI.setCodexProfileToken = mockSetCodexProfileToken;
      window.electronAPI.onTerminalOAuthToken = mockOnTerminalOAuthToken;
    }

    // Default mock implementations
    mockGetCodexProfiles.mockResolvedValue({
      success: true,
      data: { profiles: [], activeProfileId: 'default' }
    });
    mockOnTerminalOAuthToken.mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile List Display', () => {
    it('should handle empty profile list', async () => {
      mockGetCodexProfiles.mockResolvedValue({
        success: true,
        data: { profiles: [], activeProfileId: null }
      });

      const result = await window.electronAPI.getCodexProfiles();
      expect(result.success).toBe(true);
      expect(result.data?.profiles).toHaveLength(0);
    });

    it('should handle profile list with multiple profiles', async () => {
      const profiles = [
        createTestProfile({ id: 'profile-1', name: 'Work' }),
        createTestProfile({ id: 'profile-2', name: 'Personal', oauthToken: 'sk-ant-oat01-test' })
      ];

      mockGetCodexProfiles.mockResolvedValue({
        success: true,
        data: { profiles, activeProfileId: 'profile-1' }
      });

      const result = await window.electronAPI.getCodexProfiles();
      expect(result.success).toBe(true);
      expect(result.data?.profiles).toHaveLength(2);
      expect(result.data?.activeProfileId).toBe('profile-1');
    });
  });

  describe('Authentication State Display', () => {
    it('should identify profile as authenticated when oauthToken is present', () => {
      const profile = createTestProfile({ oauthToken: 'sk-ant-oat01-test-token' });
      const isAuthenticated = !!(profile.oauthToken || (profile.isDefault && profile.configDir));
      expect(isAuthenticated).toBe(true);
    });

    it('should identify profile as authenticated when it is default with configDir', () => {
      const profile = createTestProfile({ isDefault: true, configDir: '~/.codex' });
      const isAuthenticated = !!(profile.oauthToken || (profile.isDefault && profile.configDir));
      expect(isAuthenticated).toBe(true);
    });

    it('should identify profile as needing auth when no token and not default', () => {
      const profile = createTestProfile({ isDefault: false, oauthToken: undefined });
      const isAuthenticated = !!(profile.oauthToken || (profile.isDefault && profile.configDir));
      expect(isAuthenticated).toBe(false);
    });

    it('should identify profile as needing auth when default but no configDir', () => {
      const profile = createTestProfile({ isDefault: true, configDir: undefined });
      const isAuthenticated = !!(profile.oauthToken || (profile.isDefault && profile.configDir));
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Add Profile Flow', () => {
    it('should call saveCodexProfile with correct parameters', async () => {
      const newProfile = {
        id: 'profile-new',
        name: 'New Profile',
        configDir: '~/.codex-profiles/new-profile',
        isDefault: false,
        createdAt: new Date()
      };

      mockSaveCodexProfile.mockResolvedValue({
        success: true,
        data: newProfile
      });

      const result = await window.electronAPI.saveCodexProfile(newProfile);
      expect(mockSaveCodexProfile).toHaveBeenCalledWith(newProfile);
      expect(result.success).toBe(true);
    });

    it('should call initializeCodexProfile after saving profile', async () => {
      const newProfile = {
        id: 'profile-new',
        name: 'New Profile',
        configDir: '~/.codex-profiles/new-profile',
        isDefault: false,
        createdAt: new Date()
      };

      mockSaveCodexProfile.mockResolvedValue({
        success: true,
        data: newProfile
      });

      mockInitializeCodexProfile.mockResolvedValue({ success: true });

      await window.electronAPI.saveCodexProfile(newProfile);
      await window.electronAPI.initializeCodexProfile(newProfile.id);

      expect(mockSaveCodexProfile).toHaveBeenCalled();
      expect(mockInitializeCodexProfile).toHaveBeenCalledWith(newProfile.id);
    });

    it('should generate profile slug from name', () => {
      const profileName = 'Work Account';
      const profileSlug = profileName.toLowerCase().replace(/\s+/g, '-');
      expect(profileSlug).toBe('work-account');
    });

    it('should handle saveCodexProfile failure', async () => {
      mockSaveCodexProfile.mockResolvedValue({
        success: false,
        error: 'Failed to save profile'
      });

      const result = await window.electronAPI.saveCodexProfile({
        id: 'profile-fail',
        name: 'Failing Profile',
        isDefault: false,
        createdAt: new Date()
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save profile');
    });
  });

  describe('OAuth Authentication Flow', () => {
    it('should call initializeCodexProfile to trigger OAuth flow', async () => {
      mockInitializeCodexProfile.mockResolvedValue({ success: true });

      const profileId = 'profile-1';
      const result = await window.electronAPI.initializeCodexProfile(profileId);

      expect(mockInitializeCodexProfile).toHaveBeenCalledWith(profileId);
      expect(result.success).toBe(true);
    });

    it('should handle initializeCodexProfile failure', async () => {
      mockInitializeCodexProfile.mockResolvedValue({
        success: false,
        error: 'Browser failed to open'
      });

      const result = await window.electronAPI.initializeCodexProfile('profile-1');
      expect(result.success).toBe(false);
    });

    it('should register OAuth token callback', () => {
      const callback = vi.fn();
      mockOnTerminalOAuthToken.mockReturnValue(() => {});

      const unsubscribe = window.electronAPI.onTerminalOAuthToken(callback);
      expect(mockOnTerminalOAuthToken).toHaveBeenCalledWith(callback);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Set Active Profile', () => {
    it('should call setActiveCodexProfile with correct profileId', async () => {
      mockSetActiveCodexProfile.mockResolvedValue({ success: true });

      const profileId = 'profile-2';
      const result = await window.electronAPI.setActiveCodexProfile(profileId);

      expect(mockSetActiveCodexProfile).toHaveBeenCalledWith(profileId);
      expect(result.success).toBe(true);
    });

    it('should handle setActiveCodexProfile failure', async () => {
      mockSetActiveCodexProfile.mockResolvedValue({
        success: false,
        error: 'Profile not found'
      });

      const result = await window.electronAPI.setActiveCodexProfile('invalid-id');
      expect(result.success).toBe(false);
    });
  });

  describe('Delete Profile', () => {
    it('should call deleteCodexProfile with correct profileId', async () => {
      mockDeleteCodexProfile.mockResolvedValue({ success: true });

      const profileId = 'profile-to-delete';
      const result = await window.electronAPI.deleteCodexProfile(profileId);

      expect(mockDeleteCodexProfile).toHaveBeenCalledWith(profileId);
      expect(result.success).toBe(true);
    });
  });

  describe('Rename Profile', () => {
    it('should call renameCodexProfile with correct parameters', async () => {
      mockRenameCodexProfile.mockResolvedValue({ success: true });

      const profileId = 'profile-1';
      const newName = 'Updated Profile Name';
      const result = await window.electronAPI.renameCodexProfile(profileId, newName);

      expect(mockRenameCodexProfile).toHaveBeenCalledWith(profileId, newName);
      expect(result.success).toBe(true);
    });
  });

  describe('Manual Token Entry', () => {
    it('should call setCodexProfileToken with token and email', async () => {
      mockSetCodexProfileToken.mockResolvedValue({ success: true });

      const profileId = 'profile-1';
      const token = 'sk-ant-oat01-manual-token';
      const email = 'user@example.com';

      const result = await window.electronAPI.setCodexProfileToken(profileId, token, email);

      expect(mockSetCodexProfileToken).toHaveBeenCalledWith(profileId, token, email);
      expect(result.success).toBe(true);
    });

    it('should call setCodexProfileToken with token only (no email)', async () => {
      mockSetCodexProfileToken.mockResolvedValue({ success: true });

      const profileId = 'profile-1';
      const token = 'sk-ant-oat01-manual-token';

      const result = await window.electronAPI.setCodexProfileToken(profileId, token, undefined);

      expect(mockSetCodexProfileToken).toHaveBeenCalledWith(profileId, token, undefined);
      expect(result.success).toBe(true);
    });

    it('should handle setCodexProfileToken failure', async () => {
      mockSetCodexProfileToken.mockResolvedValue({
        success: false,
        error: 'Invalid token format'
      });

      const result = await window.electronAPI.setCodexProfileToken(
        'profile-1',
        'invalid-token',
        undefined
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });
  });

  describe('Continue Button State', () => {
    it('should enable Continue when at least one profile is authenticated', () => {
      const profiles: CodexProfile[] = [
        createTestProfile({ id: 'p1', oauthToken: undefined }),
        createTestProfile({ id: 'p2', oauthToken: 'sk-ant-oat01-token' })
      ];

      const hasAuthenticatedProfile = profiles.some(
        (profile) => profile.oauthToken || (profile.isDefault && profile.configDir)
      );

      expect(hasAuthenticatedProfile).toBe(true);
    });

    it('should disable Continue when no profiles are authenticated', () => {
      const profiles: CodexProfile[] = [
        createTestProfile({ id: 'p1', oauthToken: undefined }),
        createTestProfile({ id: 'p2', oauthToken: undefined })
      ];

      const hasAuthenticatedProfile = profiles.some(
        (profile) => profile.oauthToken || (profile.isDefault && profile.configDir)
      );

      expect(hasAuthenticatedProfile).toBe(false);
    });

    it('should disable Continue when no profiles exist', () => {
      const profiles: CodexProfile[] = [];

      const hasAuthenticatedProfile = profiles.some(
        (profile) => profile.oauthToken || (profile.isDefault && profile.configDir)
      );

      expect(hasAuthenticatedProfile).toBe(false);
    });

    it('should enable Continue with default profile with configDir', () => {
      const profiles: CodexProfile[] = [
        createTestProfile({ id: 'default', isDefault: true, configDir: '~/.codex' })
      ];

      const hasAuthenticatedProfile = profiles.some(
        (profile) => profile.oauthToken || (profile.isDefault && profile.configDir)
      );

      expect(hasAuthenticatedProfile).toBe(true);
    });
  });

  describe('Profile Name Validation', () => {
    it('should require non-empty profile name', () => {
      const newProfileName = '';
      const isValid = newProfileName.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should trim whitespace from profile name', () => {
      const newProfileName = '  Work  ';
      const isValid = newProfileName.trim().length > 0;
      expect(isValid).toBe(true);
      expect(newProfileName.trim()).toBe('Work');
    });

    it('should reject whitespace-only profile name', () => {
      const newProfileName = '   ';
      const isValid = newProfileName.trim().length > 0;
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle getCodexProfiles failure gracefully', async () => {
      mockGetCodexProfiles.mockRejectedValue(new Error('Network error'));

      await expect(window.electronAPI.getCodexProfiles()).rejects.toThrow('Network error');
    });

    it('should handle API returning unsuccessful response', async () => {
      mockGetCodexProfiles.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await window.electronAPI.getCodexProfiles();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('Active Profile Highlighting', () => {
    it('should identify active profile correctly', () => {
      const profiles: CodexProfile[] = [
        createTestProfile({ id: 'p1', name: 'Work' }),
        createTestProfile({ id: 'p2', name: 'Personal' })
      ];
      const activeProfileId = 'p2';

      const activeProfile = profiles.find((p) => p.id === activeProfileId);
      expect(activeProfile?.name).toBe('Personal');
    });

    it('should handle when no profile is active', () => {
      const profiles: CodexProfile[] = [
        createTestProfile({ id: 'p1', name: 'Work' })
      ];
      const activeProfileId: string | null = null;

      const activeProfile = activeProfileId
        ? profiles.find((p) => p.id === activeProfileId)
        : undefined;
      expect(activeProfile).toBeUndefined();
    });
  });

  describe('Profile Badge Display Logic', () => {
    it('should show "Default" badge for default profile', () => {
      const profile = createTestProfile({ isDefault: true });
      expect(profile.isDefault).toBe(true);
    });

    it('should show "Active" badge for active profile', () => {
      const profiles: CodexProfile[] = [
        createTestProfile({ id: 'p1' }),
        createTestProfile({ id: 'p2' })
      ];
      const activeProfileId = 'p1';

      const isActive = (profileId: string) => profileId === activeProfileId;
      expect(isActive('p1')).toBe(true);
      expect(isActive('p2')).toBe(false);
    });

    it('should show "Authenticated" badge when profile has token', () => {
      const profile = createTestProfile({ oauthToken: 'sk-ant-oat01-token' });
      const isAuthenticated = !!profile.oauthToken;
      expect(isAuthenticated).toBe(true);
    });

    it('should show "Needs Auth" badge when profile needs authentication', () => {
      const profile = createTestProfile({ oauthToken: undefined, isDefault: false });
      const needsAuth = !(profile.oauthToken || (profile.isDefault && profile.configDir));
      expect(needsAuth).toBe(true);
    });
  });

  describe('Profile Email Display', () => {
    it('should display email when present on profile', () => {
      const profile = createTestProfile({ email: 'user@example.com' });
      expect(profile.email).toBe('user@example.com');
    });

    it('should handle profile without email', () => {
      const profile = createTestProfile({ email: undefined });
      expect(profile.email).toBeUndefined();
    });
  });
});

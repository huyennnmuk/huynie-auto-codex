/**
 * Path resolution utilities for Auto Codex updater
 */

import { existsSync } from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * Get the path to the bundled auto-codex source
 */
export function getBundledSourcePath(): string {
  // In production, use app resources
  // In development, use the repo's auto-codex folder
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'auto-codex');
  }

  // Development mode - look for auto-codex in various locations
  const possiblePaths = [
    path.join(app.getAppPath(), '..', 'auto-codex'),
    path.join(app.getAppPath(), '..', '..', 'auto-codex'),
    path.join(process.cwd(), 'auto-codex'),
    path.join(process.cwd(), '..', 'auto-codex')
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Fallback
  return path.join(app.getAppPath(), '..', 'auto-codex');
}

/**
 * Get the path for storing downloaded updates
 */
export function getUpdateCachePath(): string {
  return path.join(app.getPath('userData'), 'auto-codex-updates');
}

/**
 * Get the effective source path (considers override from updates)
 */
export function getEffectiveSourcePath(): string {
  if (app.isPackaged) {
    // Check for user-updated source first
    const overridePath = path.join(app.getPath('userData'), 'auto-codex-source');
    if (existsSync(overridePath)) {
      return overridePath;
    }
  }

  return getBundledSourcePath();
}

/**
 * Get the path where updates should be installed
 */
export function getUpdateTargetPath(): string {
  if (app.isPackaged) {
    // For packaged apps, store in userData as a source override
    return path.join(app.getPath('userData'), 'auto-codex-source');
  } else {
    // In development, update the actual source
    return getBundledSourcePath();
  }
}

/**
 * Version utilities for handling module updates and migrations
 */
import { moduleId } from '@/settings';
import { SettingKey, ModuleSettings } from '@/settings';

export interface VersionInfo {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export class VersionUtils {
  /**
   * Parse version string into VersionInfo object
   */
  public static parseVersion(version: string): VersionInfo {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4]
    };
  }

  /**
   * Compare two version strings
   * Returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  public static compareVersions(v1: string, v2: string): number {
    const version1 = this.parseVersion(v1);
    const version2 = this.parseVersion(v2);

    if (version1.major !== version2.major) {
      return version1.major < version2.major ? -1 : 1;
    }

    if (version1.minor !== version2.minor) {
      return version1.minor < version2.minor ? -1 : 1;
    }

    if (version1.patch !== version2.patch) {
      return version1.patch < version2.patch ? -1 : 1;
    }

    // Handle prerelease versions
    if (version1.prerelease && !version2.prerelease) {
      return -1; // v1 is prerelease, v2 is stable
    }

    if (!version1.prerelease && version2.prerelease) {
      return 1; // v1 is stable, v2 is prerelease
    }

    if (version1.prerelease && version2.prerelease) {
      return version1.prerelease.localeCompare(version2.prerelease);
    }

    return 0; // versions are equal
  }

  /**
   * Check if version is less than target
   */
  public static isLessThan(version: string, target: string): boolean {
    return this.compareVersions(version, target) < 0;
  }

  /**
   * Check if version is greater than or equal to target
   */
  public static isGreaterThanOrEqual(version: string, target: string): boolean {
    return this.compareVersions(version, target) >= 0;
  }

  /**
   * Get the current module version from module.json
   */
  public static getCurrentModuleVersion(): string {
    const module = game.modules.get(moduleId);

    if (!module?.version) {
      throw new Error ('Can\'t read module version to attempt migration');
    }
    return module.version;
  }

  /**
   * Get the last known version from settings
   */
  public static getLastKnownVersion(): string {
    return ModuleSettings.get(SettingKey.lastKnownVersion);
  }

  /**
   * Save the current version to settings
   */
  public static async saveCurrentVersion(): Promise<void> {
    const currentVersion = this.getCurrentModuleVersion();
    await ModuleSettings.set(SettingKey.lastKnownVersion, currentVersion);
  }
}

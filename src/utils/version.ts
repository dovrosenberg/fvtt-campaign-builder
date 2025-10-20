/**
 * Version utilities for handling module updates and migrations
 */
import { version, id as moduleId } from '@module';
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
  public static async getCurrentModuleVersion(): Promise<string> {
    if (__DEV_BUILD__) {
      const pkg = await import('@/../package.json');
      return pkg.version;
    } else {
      return version;
    }
  }

  /**
   * Get the last known version from settings
   */
  public static getLastKnownVersion(): string {
    const lastVersion = ModuleSettings.get(SettingKey.lastKnownVersion);

    if (lastVersion)
      return lastVersion;

    // now - if we haven't updated since before we started setting version, it's blank
    //   but! it's also blank if we've just installed the module; we can tell the difference
    //   based on the user flags for the GM user (because way back then only the GM was a user)
    // if we're checking this for a player we have to have already been on a version
    //   that sets the flag, so must be a new installation
    if (!game.user.isGM)
      return '';

    // see if there are any flags - if so, it's a really old installation
    if (game.user.flags[moduleId])
      return '1.0.0';
    else
      return '';
  }

  /**
   * Save the current version to settings
   */
  public static async saveCurrentVersion(): Promise<void> {
    const currentVersion = await this.getCurrentModuleVersion();
    await ModuleSettings.set(SettingKey.lastKnownVersion, currentVersion);
    console.log('Upgraded Campaign Builder to version ' + currentVersion);
  }
}

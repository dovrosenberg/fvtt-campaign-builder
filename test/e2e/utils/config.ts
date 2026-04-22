/**
 * Configuration for Puppeteer agent tooling
 */

import { config as dotenvConfig } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
dotenvConfig({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Get the Windows host IP from WSL2.
 * This is the gateway IP that WSL2 uses to reach the Windows host.
 * Returns 'localhost' for native Linux environments.
 */
function getWindowsHostIP(): string {
  try {
    // Check if we're actually in WSL2
    const procVersion = execSync('cat /proc/version 2>/dev/null || echo ""')
      .toString()
      .toLowerCase();
    const isWSL = procVersion.includes('microsoft') || procVersion.includes('wsl');
    
    if (!isWSL) {
      // Native Linux - use localhost
      return 'localhost';
    }
    
    // Get the default gateway IP (Windows host in WSL2)
    return execSync("ip route show default | awk '{print $3}'")
      .toString()
      .trim();
  } catch {
    // Fall back to localhost for non-WSL environments
    return 'localhost';
  }
}

/**
 * Detect available browser executable.
 * Checks for common browser paths in order of preference.
 */
function detectBrowserPath(): string {
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  
  for (const path of candidates) {
    try {
      execSync(`test -x ${path}`, { stdio: 'ignore' });
      return path;
    } catch {
      // Not found, try next
    }
  }
  
  // Fallback - let Puppeteer use its bundled Chromium
  return '';
}

/** Browser mode - controls how Puppeteer connects to the browser */
export type BrowserMode = 'headed' | 'attach';

/** Foundry states that can be detected */
export type FoundryState = 'game' | 'login' | 'worldSelection' | 'setup' | 'unknown';

/** Configuration options */
export interface AgentConfig {
  /** Foundry URL */
  foundryUrl: string;
  /** GM username for login */
  user: string;
  /** World ID (used if on world selection page) */
  worldId: string;
  /** Admin password for setup page */
  adminPassword: string;
  /** Browser mode: headed (default, uses swiftshader) or attach (connect to Windows browser) */
  browserMode: BrowserMode;
  /** Port for remote debugging (used in attach mode) */
  debuggingPort: number;
  /**
   * Host for remote debugging connection.
   * In WSL2, Windows localhost isn't directly accessible, so use 'host.docker.internal'
   * or the Windows host IP. Defaults to 'localhost' for non-WSL environments.
   */
  browserHost: string;
  /** Viewport width */
  viewportWidth: number;
  /** Viewport height */
  viewportHeight: number;
  /**
   * Path to browser executable.
   * In WSL, use Windows Edge instead of WSL's default browser for better
   * WebGL support and compatibility with Foundry VTT.
   */
  executablePath: string;
}

/** Default configuration - can be overridden via environment variables */
export const config: AgentConfig = {
  foundryUrl: process.env.FVTT_URL || 'http://localhost:30000',
  user: process.env.FVTT_GM_USER || 'Gamemaster',
  worldId: process.env.FVTT_WORLDID || 'campaignbuildertest',
  adminPassword: process.env.FVTT_ADMIN_PASSWORD || '',
  browserMode: (process.env.BROWSER_MODE as BrowserMode) || 'headed',
  debuggingPort: 9222,
  browserHost: process.env.FVTT_BROWSER_HOST || getWindowsHostIP(),
  viewportWidth: 1920,
  viewportHeight: 1080,
  executablePath: process.env.FVTT_BROWSER_PATH || detectBrowserPath(),
};

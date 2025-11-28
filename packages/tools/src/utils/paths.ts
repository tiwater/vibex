/**
 * Path utilities for @vibex/tools
 */

import path from "path";
import os from "os";

/**
 * Get the root VibeX directory path
 */
export function getVibexRoot(): string {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), ".vibex");
}

/**
 * Get a path within the VibeX directory structure
 */
export function getVibexPath(...subPaths: string[]): string {
  return path.join(getVibexRoot(), ...subPaths);
}

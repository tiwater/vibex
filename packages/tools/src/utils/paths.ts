/**
 * Path utilities for @vibex/tools
 */

import path from "path";
import os from "os";

/**
 * Get the root Vibex directory path
 */
export function getVibexRoot(): string {
  return process.env.VIBEX_STORAGE_PATH || path.join(os.homedir(), ".vibex");
}

/**
 * Get a path within the Vibex directory structure
 */
export function getVibexPath(...subPaths: string[]): string {
  return path.join(getVibexRoot(), ...subPaths);
}

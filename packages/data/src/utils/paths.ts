/**
 * Centralized Vibex path resolution utility
 * Copied/Adapted from @vibex/core to avoid circular dependency
 */

import path from "path";
import os from "os";

/**
 * Get the root Vibex directory path
 * Respects VIBEX_STORAGE_PATH environment variable for Railway deployment
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

/**
 * Get common Vibex directory paths
 */
export const VibexPaths = {
  root: () => getVibexRoot(),
  config: () => getVibexPath("config"),
  spaces: () => getVibexPath("spaces"),
  
  // Knowledge paths
  datasets: () => getVibexPath("config", "datasets"),
  
  // Space-specific paths
  space: (spaceId: string) => getVibexPath("spaces", spaceId),
  spaceArtifacts: (spaceId: string) =>
    getVibexPath("spaces", spaceId, "artifacts"),
} as const;

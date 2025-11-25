/**
 * VibexProvider - React Context Provider (Deprecated)
 *
 * NOTE: This provider is no longer needed since Vibex is now server-only.
 * All hooks use server actions directly. This is kept for backward compatibility
 * but can be removed in the future.
 */

"use client";

import { ReactNode } from "react";

export interface VibexProviderProps {
  children: ReactNode;
}

export function VibexProvider({ children }: VibexProviderProps) {
  // No-op provider - hooks now use server actions directly
  return <>{children}</>;
}

import type { Buffer } from "node:buffer";
import type { CoreTool } from "../runtime/tool";

declare module "@vibex/tools" {
  export function buildToolMap(
    toolIds: string[],
    context?: { spaceId?: string }
  ): Record<string, CoreTool>;

  export function buildToolMapAsync(
    toolIds: string[],
    context?: { spaceId?: string }
  ): Promise<Record<string, CoreTool>>;

  export function clearMcpClients(): void;

  export function setStorageProvider(
    provider: (spaceId: string) => Promise<{
      readFile(path: string): Promise<Buffer>;
      writeFile(path: string, data: Buffer | string): Promise<void>;
      exists(path: string): Promise<boolean>;
      list(path: string): Promise<string[]>;
      delete(path: string): Promise<void>;
      stat?(path: string): Promise<unknown>;
    }>
  ): void;
}

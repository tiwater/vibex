/**
 * Vibex Server Actions
 * 
 * This file contains Next.js Server Actions that expose Vibex functionality
 * to client components. All Vibex operations must go through these actions
 * since Vibex requires server-side access to Supabase.
 * 
 * Usage in client components:
 * ```tsx
 * "use client";
 * import { getSpace, updateSpace } from "@/vibex/server/actions";
 * 
 * const space = await getSpace(spaceId);
 * await updateSpace(spaceId, { name: "New Name" });
 * ```
 */

"use server";

import { getVibexDataManagerServer } from "@vibex/data";
import type {
  Space,
  Artifact,
  Task,
  Agent,
  Tool,
} from "@vibex/data";
import type {
  SpaceFilters,
  ArtifactFilters,
  TaskFilters,
} from "@vibex/data";

// ==================== Space Actions ====================

export async function getSpace(spaceId: string): Promise<Space | null> {
  const manager = getVibexDataManagerServer();
  return await manager.getSpace(spaceId);
}

export async function listSpaces(filters?: SpaceFilters): Promise<Space[]> {
  const manager = getVibexDataManagerServer();
  return await manager.listSpaces(filters);
}

export async function createSpace(space: Partial<Space>): Promise<Space> {
  const manager = getVibexDataManagerServer();
  return await manager.createSpace(space);
}

export async function updateSpace(
  spaceId: string,
  updates: Partial<Space>
): Promise<Space> {
  const manager = getVibexDataManagerServer();
  return await manager.updateSpace(spaceId, updates);
}

export async function deleteSpace(spaceId: string): Promise<void> {
  const manager = getVibexDataManagerServer();
  return await manager.deleteSpace(spaceId);
}

// ==================== Artifact Actions ====================

export async function getArtifacts(
  spaceId: string,
  filters?: ArtifactFilters
): Promise<Artifact[]> {
  const manager = getVibexDataManagerServer();
  return await manager.getArtifacts(spaceId, filters);
}

export async function getArtifact(artifactId: string): Promise<Artifact | null> {
  const manager = getVibexDataManagerServer();
  return await manager.getArtifact(artifactId);
}

export async function createArtifact(
  spaceId: string,
  artifact: Partial<Artifact>
): Promise<Artifact> {
  const manager = getVibexDataManagerServer();
  return await manager.createArtifact(spaceId, artifact);
}

export async function updateArtifact(
  artifactId: string,
  spaceId: string,
  updates: Partial<Artifact>
): Promise<Artifact> {
  const manager = getVibexDataManagerServer();
  return await manager.updateArtifact(artifactId, spaceId, updates);
}

export async function deleteArtifact(
  artifactId: string,
  spaceId: string
): Promise<void> {
  const manager = getVibexDataManagerServer();
  return await manager.deleteArtifact(artifactId, spaceId);
}

// ==================== Task Actions ====================

export async function getTasks(
  spaceId: string,
  filters?: TaskFilters
): Promise<Task[]> {
  const manager = getVibexDataManagerServer();
  return await manager.getTasks(spaceId, filters);
}

export async function getTask(taskId: string): Promise<Task | null> {
  const manager = getVibexDataManagerServer();
  return await manager.getTask(taskId);
}

export async function createTask(
  spaceId: string,
  task: Partial<Task>
): Promise<Task> {
  const manager = getVibexDataManagerServer();
  return await manager.createTask(spaceId, task);
}

export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  const manager = getVibexDataManagerServer();
  return await manager.updateTask(taskId, updates);
}

export async function deleteTask(taskId: string, spaceId: string): Promise<void> {
  const manager = getVibexDataManagerServer();
  return await manager.deleteTask(taskId, spaceId);
}

// ==================== Agent Actions ====================

export async function getAgents(): Promise<Agent[]> {
  const manager = getVibexDataManagerServer();
  return await manager.getAgents();
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  const manager = getVibexDataManagerServer();
  return await manager.getAgent(agentId);
}

// ==================== Tool Actions ====================

export async function getTools(): Promise<Tool[]> {
  const manager = getVibexDataManagerServer();
  return await manager.getTools();
}

export async function getTool(toolId: string): Promise<Tool | null> {
  const manager = getVibexDataManagerServer();
  return await manager.getTool(toolId);
}

// ==================== Storage Actions ====================

export async function getSpaceStorage(spaceId: string) {
  const manager = getVibexDataManagerServer();
  return await manager.getSpaceStorage(spaceId);
}

export async function deleteArtifactFile(
  spaceId: string,
  storageKey: string
): Promise<void> {
  const manager = getVibexDataManagerServer();
  return await manager.deleteArtifactFile(spaceId, storageKey);
}



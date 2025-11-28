/**
 * VibeX Server Actions
 *
 * This file contains Next.js Server Actions that expose VibeX functionality
 * to client components. All VibeX operations must go through these actions
 * since VibeX requires server-side access to Supabase.
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

import { getSpaceManagerServer } from "vibex";
import type {
  SpaceType,
  ArtifactType,
  ConversationType,
  AgentType,
  ToolType,
} from "@vibex/core";

// Filter types
export interface SpaceFilters {
  userId?: string;
  name?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ArtifactFilters {
  spaceId?: string;
  conversationId?: string;
  category?: "input" | "intermediate" | "output";
  mimeType?: string;
}

export interface ConversationFilters {
  title?: string;
  createdAfter?: Date;
}

// ==================== Space Actions ====================

export async function getSpace(spaceId: string): Promise<SpaceType | null> {
  const manager = getSpaceManagerServer();
  return await manager.getSpace(spaceId);
}

export async function listSpaces(filters?: SpaceFilters): Promise<SpaceType[]> {
  const manager = getSpaceManagerServer();
  return await manager.listSpaces(filters);
}

export async function createSpace(
  space: Partial<SpaceType>
): Promise<SpaceType> {
  const manager = getSpaceManagerServer();
  return await manager.createSpace(space);
}

export async function updateSpace(
  spaceId: string,
  updates: Partial<SpaceType>
): Promise<SpaceType> {
  const manager = getSpaceManagerServer();
  return await manager.updateSpace(spaceId, updates);
}

export async function deleteSpace(spaceId: string): Promise<void> {
  const manager = getSpaceManagerServer();
  return await manager.deleteSpace(spaceId);
}

// ==================== Artifact Actions ====================

export async function getArtifacts(
  spaceId: string,
  filters?: ArtifactFilters
): Promise<ArtifactType[]> {
  const manager = getSpaceManagerServer();
  return await manager.getArtifacts(spaceId, filters);
}

export async function getArtifact(
  artifactId: string
): Promise<ArtifactType | null> {
  const manager = getSpaceManagerServer();
  return await manager.getArtifact(artifactId);
}

export async function createArtifact(
  spaceId: string,
  artifact: Partial<ArtifactType>
): Promise<ArtifactType> {
  const manager = getSpaceManagerServer();
  return await manager.createArtifact(spaceId, artifact);
}

export async function updateArtifact(
  artifactId: string,
  updates: Partial<ArtifactType>
): Promise<ArtifactType> {
  const manager = getSpaceManagerServer();
  return await manager.updateArtifact(artifactId, updates);
}

export async function deleteArtifact(
  artifactId: string,
  spaceId: string
): Promise<void> {
  const manager = getSpaceManagerServer();
  return await manager.deleteArtifact(artifactId, spaceId);
}

// ==================== Task Actions ====================

export async function getConversations(
  spaceId: string,
  filters?: ConversationFilters
): Promise<ConversationType[]> {
  const manager = getSpaceManagerServer();
  return await manager.getConversations(spaceId, filters);
}

export async function getConversation(
  taskId: string
): Promise<ConversationType | null> {
  const manager = getSpaceManagerServer();
  return await manager.getConversation(taskId);
}

export async function createConversation(
  spaceId: string,
  task: Partial<ConversationType>
): Promise<ConversationType> {
  const manager = getSpaceManagerServer();
  return await manager.createConversation(spaceId, task);
}

export async function updateConversation(
  taskId: string,
  updates: Partial<ConversationType>
): Promise<ConversationType> {
  const manager = getSpaceManagerServer();
  return await manager.updateConversation(taskId, updates);
}

export async function deleteConversation(
  taskId: string,
  spaceId: string
): Promise<void> {
  const manager = getSpaceManagerServer();
  return await manager.deleteConversation(taskId, spaceId);
}

// ==================== Agent Actions ====================

export async function getAgents(): Promise<AgentType[]> {
  const manager = getSpaceManagerServer();
  return await manager.getAgents();
}

export async function getAgent(agentId: string): Promise<AgentType | null> {
  const manager = getSpaceManagerServer();
  return await manager.getAgent(agentId);
}

// ==================== Tool Actions ====================

export async function getTools(): Promise<ToolType[]> {
  const manager = getSpaceManagerServer();
  return await manager.getTools();
}

export async function getTool(toolId: string): Promise<ToolType | null> {
  const manager = getSpaceManagerServer();
  return await manager.getTool(toolId);
}

// ==================== Task Actions (Aliases for Conversation) ====================
// Tasks are conversations in VibeX, these provide backward-compatible naming

export interface TaskFilters {
  title?: string;
  createdAfter?: Date;
}

export async function getTasks(
  spaceId: string,
  filters?: TaskFilters
): Promise<ConversationType[]> {
  return getConversations(spaceId, filters);
}

export async function getTask(
  taskId: string
): Promise<ConversationType | null> {
  return getConversation(taskId);
}

export async function createTask(
  spaceId: string,
  task: Partial<ConversationType>
): Promise<ConversationType> {
  return createConversation(spaceId, task);
}

export async function updateTask(
  taskId: string,
  updates: Partial<ConversationType>
): Promise<ConversationType> {
  return updateConversation(taskId, updates);
}

export async function deleteTask(
  taskId: string,
  spaceId: string
): Promise<void> {
  return deleteConversation(taskId, spaceId);
}

// ==================== Storage Actions ====================

export async function getSpaceStorage(spaceId: string) {
  const manager = getSpaceManagerServer();
  return await manager.getSpaceStorage(spaceId);
}

export async function deleteArtifactFile(
  spaceId: string,
  storageKey: string
): Promise<void> {
  const manager = getSpaceManagerServer();
  return await manager.deleteArtifactFile(spaceId, storageKey);
}

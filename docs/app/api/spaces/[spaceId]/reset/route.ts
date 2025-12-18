import { XAgent, SpaceManager } from "vibex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/spaces/[spaceId]/reset - Reset space to defaults
export async function POST(
  req: Request,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  try {
    const { spaceId } = await params;

    if (!spaceId) {
      return Response.json({ error: "Space ID is required" }, { status: 400 });
    }

    console.log(`[Reset API] Resetting space: ${spaceId}`);

    let deletedConversations = 0;
    let deletedArtifacts = 0;
    let databaseAvailable = false;
    let spaceReset = false;
    const errors: string[] = [];

    // Try to delete from database if available
    try {
      const manager = await SpaceManager.createServer();
      databaseAvailable = true;

      // Get all conversations/tasks for this space
      const conversations = await manager.getConversations(spaceId);
      console.log(
        `[Reset API] Found ${conversations.length} conversations to delete`
      );

      // Delete all conversations/tasks
      for (const conversation of conversations) {
        try {
          await manager.deleteConversation(conversation.id, spaceId);
          deletedConversations++;
        } catch (error) {
          console.warn(
            `[Reset API] Failed to delete conversation ${conversation.id}:`,
            error
          );
        }
      }

      // Get all artifacts for this space
      const artifacts = await manager.getArtifacts(spaceId);
      console.log(`[Reset API] Found ${artifacts.length} artifacts to delete`);

      // Delete all artifacts
      for (const artifact of artifacts) {
        try {
          await manager.deleteArtifact(artifact.id, spaceId);
          deletedArtifacts++;
        } catch (error) {
          console.warn(
            `[Reset API] Failed to delete artifact ${artifact.id}:`,
            error
          );
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[Reset API] Database unavailable:`, msg);
      errors.push(`Database unavailable: ${msg.split(".")[0]}`);
    }

    // Try to get the space and reset its internal state
    try {
      const xAgent = await XAgent.resume(spaceId, { model: "openai/gpt-4o" });
      const space = xAgent.getSpace();

      // Clear all state
      if (space.plan) space.plan = undefined;
      space.history.length = 0; // Clear array by setting length to 0
      space.tasks.clear(); // Map has .clear()
      if (space.artifacts) space.artifacts = [];
      space.agents.clear(); // Map has .clear()

      await space.persistState();
      spaceReset = true;
      console.log(`[Reset API] Successfully reset space: ${spaceId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[Reset API] Could not reset space state:`, msg);
      errors.push(`Space reset failed: ${msg.split(".")[0]}`);
    }

    // Determine overall success
    const partialSuccess = !databaseAvailable || !spaceReset;
    
    return Response.json({
      success: !partialSuccess || errors.length === 0,
      partial: partialSuccess && errors.length > 0,
      message: partialSuccess 
        ? `Space ${spaceId} partially reset (UI cleared). Server state may persist until restart.`
        : `Space ${spaceId} has been fully reset`,
      deleted: {
        conversations: deletedConversations,
        artifacts: deletedArtifacts,
      },
      errors: errors.length > 0 ? errors : undefined,
      note: !databaseAvailable 
        ? "Database unavailable due to better-sqlite3/Turbopack issue. Full reset requires restarting the dev server."
        : undefined,
    });
  } catch (error) {
    console.error("[Reset API] Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

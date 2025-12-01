import { SpaceManager } from "vibex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/spaces/[spaceId]/artifacts/[artifactId] - Get artifact content
export async function GET(
  req: Request,
  { params }: { params: Promise<{ spaceId: string; artifactId: string }> }
) {
  try {
    const { spaceId, artifactId } = await params;

    if (!spaceId || !artifactId) {
      return Response.json(
        { error: "Space ID and Artifact ID are required" },
        { status: 400 }
      );
    }

    console.log(
      `[Artifact API] Fetching artifact: ${artifactId} from space: ${spaceId}`
    );

    try {
      const manager = await SpaceManager.createServer();
      const blob = await manager.downloadArtifactFile(
        spaceId,
        artifactId,
        artifactId
      );

      // Get artifact metadata to determine content type
      const artifacts = await manager.getArtifacts(spaceId);
      const artifact = artifacts.find((a) => a.id === artifactId);
      const mimeType = artifact?.mimeType || "text/plain";

      return new Response(blob, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${artifact?.originalName || artifactId}"`,
        },
      });
    } catch (error) {
      console.error(`[Artifact API] Error fetching artifact:`, error);
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to fetch artifact",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Artifact API] Error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

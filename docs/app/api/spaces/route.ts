import { getSpaceManagerServer, XAgent } from "vibex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/spaces - List all spaces
export async function GET() {
  try {
    const manager = getSpaceManagerServer();
    const spaces = await manager.listSpaces();
    
    // Transform to API format
    const apiSpaces = spaces.map((space) => ({
      id: space.id,
      name: space.name || "Untitled Space",
      goal: space.description || "",
      createdAt: space.createdAt ? new Date(space.createdAt).getTime() : Date.now(),
      updatedAt: space.updatedAt ? new Date(space.updatedAt).getTime() : Date.now(),
      status: "active" as const,
    }));
    
    return Response.json({ spaces: apiSpaces });
  } catch (error) {
    console.error("List spaces error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/spaces - Create a new space
export async function POST(req: Request) {
  try {
    const { goal, name } = await req.json();

    if (!goal) {
      return Response.json({ error: "Goal is required" }, { status: 400 });
    }

    const xAgent = await XAgent.start(goal);
    const space = xAgent.getSpace();

    return Response.json({
      space: {
        id: space.spaceId,
        goal: space.goal,
        name: name || goal.slice(0, 50),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "active",
      },
    });
  } catch (error) {
    console.error("Create space error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

"use client";

import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const SAMPLE_CODE = `import { XAgent } from "vibex";

async function main() {
  // Start a new space
  const xAgent = await XAgent.start("Build an API");
  const space = xAgent.getSpace();

  // Stream a response
  const stream = await xAgent.streamText({
    messages: [{ role: "user", content: "Create a REST API" }],
    metadata: { mode: "agent", requestedAgent: "X" }
  });

  for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
  }

  // Save the workspace
  await space.persistState();
}

main();`;

export function CodeSandbox() {
  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Code Sandbox</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Play className="w-4 h-4 shrink-0 mr-1" />
            Run
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 shrink-0 mr-1" />
            Reset
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-100 overflow-auto">
        <pre>{SAMPLE_CODE}</pre>
      </div>
    </div>
  );
}


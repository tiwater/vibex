import {
  Sparkles,
  Search,
  Code,
  PenTool,
  Globe,
  Database,
} from "lucide-react";
import type { Agent, Tool } from "./types";

export const DEMO_AGENTS: Agent[] = [
  {
    id: "x",
    name: "X (Orchestrator)",
    description: "Manages your space and coordinates all work",
    icon: Sparkles,
    color: "text-violet-500",
  },
  {
    id: "researcher",
    name: "Researcher",
    description: "Gathers and analyzes information",
    icon: Search,
    color: "text-blue-500",
  },
  {
    id: "developer",
    name: "Developer",
    description: "Writes and reviews code",
    icon: Code,
    color: "text-emerald-500",
  },
  {
    id: "writer",
    name: "Content Writer",
    description: "Creates written content",
    icon: PenTool,
    color: "text-amber-500",
  },
  {
    id: "web-researcher",
    name: "Web Researcher",
    description: "Browses web for real-time info",
    icon: Globe,
    color: "text-cyan-500",
  },
  {
    id: "dba",
    name: "Database Admin",
    description: "Manages databases",
    icon: Database,
    color: "text-rose-500",
  },
];

export const DEMO_TOOLS: Tool[] = [
  { name: "web_search", description: "Search the web", category: "Search" },
  { name: "read_file", description: "Read file contents", category: "File" },
  { name: "write_file", description: "Write to file", category: "File" },
  { name: "execute_code", description: "Run code in sandbox", category: "Code" },
  { name: "browse_web", description: "Browse websites", category: "Web" },
  { name: "query_database", description: "Execute DB queries", category: "Database" },
  { name: "create_artifact", description: "Create artifact", category: "Artifact" },
  { name: "github_search", description: "Search GitHub", category: "Code" },
];

export const SIMULATED_RESPONSES: Record<string, string> = {
  default: `I understand you'd like help with that. Let me analyze the requirements and create a plan.

**Analysis:**
Based on your request, I'll coordinate with the relevant specialist agents to deliver the best results.

**Next Steps:**
1. Research the topic thoroughly
2. Create an initial draft
3. Review and refine the output
4. Deliver the final artifact

Would you like me to proceed with this plan?`,
  research: `I've completed my research on the topic. Here's what I found:

📊 **Key Findings:**
- The field has seen 340% growth in the past year
- Major players include OpenAI, Anthropic, and Google
- Key trends point toward multi-agent systems

📚 **Sources Analyzed:**
- 12 academic papers
- 8 industry reports
- 15 news articles

Would you like me to dive deeper into any specific area?`,
  code: `I've analyzed the codebase and here's my implementation:

\`\`\`typescript
export async function processRequest(req: Request) {
  const { data } = await validateInput(req.body);
  
  const result = await orchestrator.execute({
    task: data.task,
    agents: ['researcher', 'developer'],
    parallel: true
  });
  
  return Response.json(result);
}
\`\`\`

This implementation uses parallel execution for optimal performance. Shall I explain any part in detail?`,
};

export const TOOL_CATEGORIES = [
  "Search",
  "File",
  "Code",
  "Web",
  "Database",
  "Artifact",
];

export const WELCOME_MESSAGE = `👋 Welcome to the **Vibex Playground**!

I'm **X**, your AI orchestrator. I manage this space and coordinate specialist agents to help you accomplish your goals.

**What can I do?**
- 🔬 Research topics in depth
- 💻 Write and review code
- ✍️ Create written content
- 🌐 Browse the web for real-time info
- 📊 Analyze and process data

**Try asking me something like:**
- "Research the latest trends in AI agents"
- "Help me build a REST API"
- "Write a blog post about space exploration"

What would you like to work on today?`;


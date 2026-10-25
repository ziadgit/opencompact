import { CopilotRuntime, BuiltInAgent, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { tools } from "@/lib/agent/tools";
import { SYSTEM_PROMPT } from "@/lib/agent/prompt";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

let handler: ((req: Request) => Promise<Response>) | null = null;

function getHandler() {
  if (handler) return handler;
  const agent = new BuiltInAgent({
    model: "google/gemini-4-argon",
    apiKey: process.env.GEMINI_API_KEY,
    prompt: SYSTEM_PROMPT,
    tools,
    maxSteps: 8,
  });
  const runtime = new CopilotRuntime({ agents: { default: agent } });
  handler = createCopilotRuntimeHandler({ runtime, basePath: "/api/copilotkit" });
  return handler;
}

function handle(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "Add GEMINI_API_KEY to .env.local" }, { status: 503 });
  }
  return getHandler()(req);
}

export const POST = handle;
export const GET = handle;

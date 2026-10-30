import { CopilotRuntime, BuiltInAgent, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { createAnthropic } from "@ai-sdk/anthropic";
import { wrapLanguageModel, type LanguageModelMiddleware } from "ai";
import { tools } from "@/lib/agent/tools";
import { SYSTEM_PROMPT } from "@/lib/agent/prompt";
import { MODEL } from "@/lib/agent/llm";
import { canSpend, recordUsage, takeRun } from "@/lib/budget";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

let handler: ((req: Request) => Promise<Response>) | null = null;

type V3Usage = { inputTokens: { noCache?: number; total?: number; cacheRead?: number; cacheWrite?: number }; outputTokens: { total?: number } };
const meter = (u: V3Usage) =>
  recordUsage({
    input: u.inputTokens.noCache ?? u.inputTokens.total ?? 0,
    output: u.outputTokens.total ?? 0,
    cacheRead: u.inputTokens.cacheRead ?? 0,
    cacheWrite: u.inputTokens.cacheWrite ?? 0,
  });

/** Records the token usage of every agent step against the daily budget. */
const metering: LanguageModelMiddleware = {
  specificationVersion: "v3",
  wrapGenerate: async ({ doGenerate }) => {
    const result = await doGenerate();
    await meter(result.usage);
    return result;
  },
  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();
    const tap = new TransformStream({
      transform(part, controller) {
        if (part.type === "finish") void meter(part.usage);
        controller.enqueue(part);
      },
    });
    return { stream: stream.pipeThrough(tap), ...rest };
  },
};

function getHandler() {
  if (handler) return handler;
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const agent = new BuiltInAgent({
    model: wrapLanguageModel({ model: anthropic(MODEL), middleware: metering }),
    prompt: SYSTEM_PROMPT,
    tools,
    maxSteps: 8,
    maxOutputTokens: 8000,
  });
  const runtime = new CopilotRuntime({ agents: { default: agent } });
  handler = createCopilotRuntimeHandler({ runtime, basePath: "/api/copilotkit" });
  return handler;
}

/** An agent run is the only request that spends tokens; info/connect calls are free. */
async function isRun(req: Request) {
  if (req.method !== "POST") return false;
  if (new URL(req.url).pathname.endsWith("/run")) return true;
  try {
    const body = (await req.clone().json()) as { method?: string };
    return body.method === "agent/run";
  } catch {
    return false;
  }
}

const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

async function handle(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Add ANTHROPIC_API_KEY to .env.local" }, { status: 503 });
  }
  if (await isRun(req)) {
    if (!(await canSpend())) return Response.json({ error: "daily-budget" }, { status: 503 });
    if (!(await takeRun(clientIp(req)))) return Response.json({ error: "ip-limit" }, { status: 429 });
  }
  return getHandler()(req);
}

export const POST = handle;
export const GET = handle;

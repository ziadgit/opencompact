import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { canSpend, recordUsage } from "@/lib/budget";

export const MODEL = "claude-haiku-5-5";

let client: Anthropic | null = null;
function ai() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

type Opts = { system?: string; urlContext?: boolean };

async function guard() {
  if (!(await canSpend())) throw new Error("daily AI budget used up");
}

function record(u: Anthropic.Usage) {
  return recordUsage({
    input: u.input_tokens,
    output: u.output_tokens,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
  });
}

/** One structured-output call to Claude Haiku 5.5, validated with zod. `urlContext` lets it fetch URLs in the prompt. */
export async function llmJSON<T>(prompt: string, schema: z.ZodType<T>, opts: Opts = {}): Promise<T> {
  await guard();
  const res = await ai().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: opts.system,
    output_config: { effort: "low", format: zodOutputFormat(schema) },
    tools: opts.urlContext ? [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 2 }] : undefined,
    messages: [{ role: "user", content: prompt }],
  });
  await record(res.usage);
  if (res.stop_reason === "refusal") throw new Error("model declined the request");
  if (res.parsed_output == null) throw new Error(`no structured output (stop_reason: ${res.stop_reason})`);
  return schema.parse(res.parsed_output);
}

/** Plain-text call (used for Markdown drafting). */
export async function llmText(prompt: string, opts: Opts = {}): Promise<string> {
  await guard();
  const res = await ai().messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: opts.system,
    output_config: { effort: "low" },
    messages: [{ role: "user", content: prompt }],
  });
  await record(res.usage);
  return res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
}

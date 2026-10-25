import type { AuditResult, Overall, ProductInput } from "@/lib/schemas";
import { ruleCheck } from "@/lib/rules";

/** AG-UI message shape, as much of it as the notebook needs. */
export type Msg = {
  id: string;
  role: string;
  content?: unknown;
  toolCalls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  toolCallId?: string;
};

/**
 * One notebook entry = one review. AI entries point at their user message in the agent's
 * message list; rules-only entries carry the product and are rendered deterministically.
 */
export type Entry =
  | { id: string; kind: "ai"; createdAt: number; prompt: string; userMessageId: string }
  | { id: string; kind: "rules"; createdAt: number; prompt: string; product: ProductInput | null; note?: string };

type Saved = { version: 1; entries: Entry[]; messages: Msg[] };

const KEY = "opencompact.notebook.v1";
const MAX_ENTRIES = 40;

export function loadNotebook(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? (JSON.parse(raw) as Saved) : null;
    if (data?.version === 1 && Array.isArray(data.entries)) return data;
  } catch {
    // private mode or corrupted data: start fresh
  }
  return { version: 1, entries: [], messages: [] };
}

export function saveNotebook(entries: Entry[], messages: Msg[]) {
  const kept = entries.slice(-MAX_ENTRIES);
  const firstUserId = kept.find((e) => e.kind === "ai")?.userMessageId;
  const start = firstUserId ? Math.max(0, messages.findIndex((m) => m.id === firstUserId)) : messages.length;
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, entries: kept, messages: messages.slice(start) } satisfies Saved));
  } catch {
    // quota exceeded: keep working in memory
  }
}

/** The messages belonging to an AI entry: from its user message up to the next user message. */
export function entryMessages(entry: Entry, messages: Msg[]): Msg[] {
  if (entry.kind !== "ai") return [];
  const start = messages.findIndex((m) => m.id === entry.userMessageId);
  if (start < 0) return [];
  const next = messages.findIndex((m, i) => i > start && m.role === "user");
  return messages.slice(start, next < 0 ? undefined : next);
}

/** Headline facts for the index and collapsed cells. */
export function entrySummary(entry: Entry, messages: Msg[]): { title: string; overall: Overall | null; headline: string | null } {
  if (entry.kind === "rules") {
    if (!entry.product) return { title: titleFromPrompt(entry.prompt), overall: null, headline: null };
    const a = ruleCheck(entry.product);
    return { title: entry.product.name, overall: a.overall, headline: a.headline };
  }
  const msgs = entryMessages(entry, messages);
  const auditCall = msgs.flatMap((m) => m.toolCalls ?? []).find((tc) => tc.function.name === "audit_formulation");
  const result = auditCall && msgs.find((m) => m.role === "tool" && m.toolCallId === auditCall.id);
  try {
    const audit = result && typeof result.content === "string" ? (JSON.parse(result.content) as AuditResult) : null;
    if (audit?.overall) return { title: audit.product?.name ?? titleFromPrompt(entry.prompt), overall: audit.overall, headline: audit.headline };
  } catch {
    // tool result not JSON
  }
  return { title: titleFromPrompt(entry.prompt), overall: null, headline: null };
}

export function titleFromPrompt(prompt: string): string {
  const first = prompt.replace(/^Audit this product:\s*/i, "").split("\n")[0].trim();
  return first.length > 60 ? `${first.slice(0, 57)}…` : first || "Untitled review";
}

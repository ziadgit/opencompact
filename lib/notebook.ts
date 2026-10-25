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

/** A notebook is a set of reviews plus the agent conversation behind them. */
export type Notebook = { id: string; createdAt: number; entries: Entry[]; messages: Msg[] };
export type Library = { activeId: string; notebooks: Notebook[] };

const KEY_V1 = "opencompact.notebook.v1";
const KEY = "opencompact.library.v2";
const MAX_ENTRIES = 40;
const MAX_NOTEBOOKS = 20;

export const newNotebook = (): Notebook => ({ id: Math.random().toString(36).slice(2), createdAt: Date.now(), entries: [], messages: [] });

export function loadLibrary(): Library {
  try {
    const raw = localStorage.getItem(KEY);
    const lib = raw ? (JSON.parse(raw) as Library) : null;
    if (lib?.notebooks?.length && lib.notebooks.some((n) => n.id === lib.activeId)) return lib;
    // Migrate the single v1 notebook, if any.
    const v1 = JSON.parse(localStorage.getItem(KEY_V1) ?? "null") as { entries?: Entry[]; messages?: Msg[] } | null;
    if (v1?.entries?.length) {
      const nb = { ...newNotebook(), createdAt: v1.entries[0].createdAt, entries: v1.entries, messages: v1.messages ?? [] };
      return { activeId: nb.id, notebooks: [nb] };
    }
  } catch {
    // private mode or corrupted data: start fresh
  }
  const nb = newNotebook();
  return { activeId: nb.id, notebooks: [nb] };
}

/** Drop messages that no kept entry points at, so storage stays small. */
function trim(nb: Notebook): Notebook {
  const entries = nb.entries.slice(-MAX_ENTRIES);
  const firstUserId = entries.find((e) => e.kind === "ai")?.userMessageId;
  const start = firstUserId ? Math.max(0, nb.messages.findIndex((m) => m.id === firstUserId)) : nb.messages.length;
  return { ...nb, entries, messages: nb.messages.slice(start) };
}

export function saveLibrary(lib: Library) {
  const notebooks = lib.notebooks.filter((n) => n.entries.length || n.id === lib.activeId).slice(-MAX_NOTEBOOKS).map(trim);
  try {
    localStorage.setItem(KEY, JSON.stringify({ activeId: lib.activeId, notebooks } satisfies Library));
    localStorage.removeItem(KEY_V1);
  } catch {
    // quota exceeded: keep working in memory
  }
}

export function notebookTitle(nb: Notebook): string {
  const first = nb.entries[0];
  if (!first) return "Empty notebook";
  return entrySummary(first, nb.messages).title + (nb.entries.length > 1 ? ` + ${nb.entries.length - 1}` : "");
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

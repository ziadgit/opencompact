"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAgent, useCopilotKit, useRenderToolCall } from "@copilotkit/react-core/v2";
import { PRESETS, findPresetInText, presetMessage } from "@/lib/presets";
import { parseIngredientText } from "@/lib/parse";
import { entryMessages, loadLibrary, newNotebook, saveLibrary, type Entry, type Msg, type Notebook } from "@/lib/notebook";
import { ToolRenderers } from "./ToolRenderers";
import { EntryCell, NotebookIndex, NotebookList } from "./Notebook";

const uid = () => Math.random().toString(36).slice(2);
const AI_DOWN =
  "The AI analyst is unavailable right now (the model returned an error, or today's AI budget is used up). Switching to rules-only mode — results below come from the deterministic rulebook.";
const OFFLINE_NOTE: Record<string, string> = {
  "daily-budget": "Today's AI budget is used up — rules-only until 00:00 UTC. Presets still run against the rulebook.",
  "no-key": "Add ANTHROPIC_API_KEY to .env.local for the AI analyst. Presets still run against the rulebook.",
};

function rulesEntry(prompt: string, note?: string): Entry {
  const preset = findPresetInText(prompt) ?? PRESETS.find((p) => p.chip === prompt);
  return { id: uid(), kind: "rules", createdAt: Date.now(), prompt, product: preset?.product ?? parseIngredientText(prompt), note };
}

export function Home() {
  const { agent, isReady } = useAgent();
  const { copilotkit } = useCopilotKit();
  const renderToolCall = useRenderToolCall();
  // Home is rendered client-only, so the library can be read synchronously on first render.
  const [initial] = useState(loadLibrary);
  const [saved] = useState(() => initial.notebooks.find((n) => n.id === initial.activeId)!);
  const [notebooks, setNotebooks] = useState<Notebook[]>(initial.notebooks);
  const [activeId, setActiveId] = useState(initial.activeId);
  const [entries, setEntries] = useState<Entry[]>(saved.entries);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(saved.entries.slice(-1).map((e) => e.id)));
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [offlineReason, setOfflineReason] = useState("no-key");
  const [rulesOnly, setRulesOnly] = useState(false);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const restoredInto = useRef<object | null>(null);
  const [hydrated, setHydrated] = useState(saved.messages.length === 0);
  const endRef = useRef<HTMLDivElement>(null);

  // Give the agent its past messages back so follow-up questions keep their context.
  // useAgent can hand out a provisional agent first, so restore into whichever one is ready.
  useEffect(() => {
    if (!agent || !isReady || restoredInto.current === agent) return;
    restoredInto.current = agent;
    if (saved.messages.length && agent.messages.length === 0) agent.setMessages(saved.messages as never);
    queueMicrotask(() => setHydrated(true));
  }, [agent, isReady, saved]);

  const checkStatus = () =>
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: { ai: boolean; reason?: string }) => {
        setAiReady(s.ai);
        if (s.reason) setOfflineReason(s.reason);
        if (!s.ai) setRulesOnly(true);
      })
      .catch(() => setRulesOnly(true));

  useEffect(() => {
    checkStatus();
  }, []);

  const messages = (hydrated && agent ? agent.messages : saved.messages) as unknown as Msg[];

  // The active notebook lives in `entries` + the agent; `notebooks` holds snapshots of the rest.
  const withActive = (): Notebook[] =>
    notebooks.map((n) => (n.id === activeId ? { ...n, entries, messages: [...messages] } : n));

  useEffect(() => {
    if (!hydrated || running) return;
    saveLibrary({
      activeId,
      notebooks: notebooks.map((n) => (n.id === activeId ? { ...n, entries, messages: [...messages] } : n)),
    });
  }, [notebooks, activeId, entries, messages, running, hydrated]);

  function openNotebook(target: Notebook, all: Notebook[]) {
    setNotebooks(all);
    setActiveId(target.id);
    setEntries(target.entries);
    setOpenIds(new Set(target.entries.slice(-1).map((e) => e.id)));
    agent?.setMessages(target.messages as never);
    window.scrollTo({ top: 0 });
  }

  function startNotebook() {
    if (running || entries.length === 0) return;
    const fresh = newNotebook();
    openNotebook(fresh, [...withActive(), fresh]);
  }

  function switchNotebook(id: string) {
    if (running || id === activeId) return;
    const all = withActive().filter((n) => n.entries.length || n.id === id);
    const target = all.find((n) => n.id === id);
    if (target) openNotebook(target, all);
  }

  function deleteNotebook(id: string) {
    if (running) return;
    const rest = withActive().filter((n) => n.id !== id);
    if (id !== activeId) return setNotebooks(rest);
    const next = rest.filter((n) => n.entries.length).at(-1) ?? newNotebook();
    openNotebook(next, rest.some((n) => n.id === next.id) ? rest : [...rest, next]);
  }

  const pastNotebooks = withActive().filter((n) => n.entries.length);

  const lastId = entries.at(-1)?.id;
  useEffect(() => {
    if (lastId && running) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lastId, running, messages.length]);

  function addEntry(entry: Entry) {
    setEntries((es) => [...es, entry]);
    setOpenIds(new Set([entry.id])); // newest review open, earlier ones fold to their headline
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || running) return;
    setInput("");
    if (rulesOnly || !agent) {
      addEntry(rulesEntry(t));
      return;
    }
    const userId = uid();
    const entry: Entry = { id: uid(), kind: "ai", createdAt: Date.now(), prompt: t, userMessageId: userId };
    addEntry(entry);
    setRunning(true);
    const before = agent.messages.length;
    agent.addMessage({ id: userId, role: "user", content: t });
    let failed = false;
    try {
      await copilotkit.runAgent({ agent });
    } catch {
      failed = true;
    }
    const added = (agent.messages as unknown as Msg[]).slice(before + 1);
    if (failed || !added.some((m) => m.role === "assistant")) {
      setRulesOnly(true);
      agent.setMessages(agent.messages.slice(0, before));
      const fallback = rulesEntry(t, AI_DOWN);
      setEntries((es) => es.map((e) => (e.id === entry.id ? { ...fallback, id: entry.id } : e)));
      void checkStatus();
    }
    setRunning(false);
  }

  function jump(id: string) {
    setOpenIds((s) => new Set(s).add(id));
    requestAnimationFrame(() => document.getElementById(`entry-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function toggle(id: string) {
    setOpenIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function remove(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (entry && agent) {
      const ids = new Set(entryMessages(entry, agent.messages as unknown as Msg[]).map((m) => m.id));
      agent.setMessages(agent.messages.filter((m) => !ids.has(m.id)));
    }
    setEntries((es) => es.filter((e) => e.id !== id));
  }

  function clearAll() {
    agent?.setMessages([]);
    setEntries([]);
    setOpenIds(new Set());
  }

  const started = entries.length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <ToolRenderers />
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 font-serif text-[20px] tracking-tight text-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.svg" alt="" width={24} height={24} />
          OpenCompact
        </Link>
        <nav className="flex items-center gap-4">
          <button
            onClick={startNotebook}
            disabled={running || !started}
            aria-label="New notebook"
            title="New notebook"
            className="group flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[13px] text-muted transition-colors hover:border-[var(--ink)] hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M9.5 1.75H4.25a1.5 1.5 0 0 0-1.5 1.5v9.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M5.5 1.75v12.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M12.5 1v4M10.5 3h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="hidden sm:inline">New notebook</span>
          </button>
          <Link href="/about" className="text-[14px] text-muted transition-colors hover:text-ink">
            About
          </Link>
        </nav>
      </header>

      {aiReady === false && (
        <div className="mx-auto mt-1 w-full max-w-[720px] px-4">
          <p className="rounded-full border border-line bg-card px-4 py-2 text-center text-[13px] text-muted">
            <span className="smallcaps text-ink">Rules-only mode</span> · {OFFLINE_NOTE[offlineReason] ?? OFFLINE_NOTE["no-key"]}
          </p>
        </div>
      )}

      {!started && (
        <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center px-4 pb-[12vh]">
          <div className="rise">
            <h1 className="font-serif text-[40px] leading-[1.02] tracking-[-0.01em] text-ink sm:text-[56px]">Is it legal to sell?</h1>
            <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-muted">
              Paste a product link, an ingredient list, or a question. Checked against US FDA, California and EU rules.
            </p>
          </div>
          <Composer value={input} onChange={setInput} onSubmit={() => send(input)} className="mt-9" />
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => send(presetMessage(p))} className="smallcaps text-[14px] text-muted transition-colors hover:text-ink">
                {p.chip}
              </button>
            ))}
          </div>
          {pastNotebooks.length > 0 && (
            <div className="mt-14 max-w-[420px]">
              <NotebookList notebooks={pastNotebooks} activeId={activeId} onOpen={switchNotebook} onDelete={deleteNotebook} />
            </div>
          )}
        </main>
      )}

      {started && (
        <div className="mx-auto grid w-full max-w-[1180px] flex-1 gap-8 px-4 pb-44 pt-4 sm:px-8 lg:grid-cols-[220px_minmax(0,720px)] lg:justify-between xl:grid-cols-[240px_minmax(0,720px)_240px]">
          <aside className="hidden lg:block">
            <div className="sticky top-6 max-h-[calc(100dvh-220px)] overflow-y-auto">
              <NotebookIndex entries={entries} messages={messages} activeId={lastId ?? null} onJump={jump} onClear={clearAll} />
              {pastNotebooks.length > 1 && (
                <div className="mt-8 border-t border-line pt-5">
                  <NotebookList notebooks={pastNotebooks} activeId={activeId} onOpen={switchNotebook} onDelete={deleteNotebook} />
                </div>
              )}
            </div>
          </aside>

          <main className="min-w-0">
            <details className="mb-4 rounded-[16px] border border-line bg-card px-4 py-3 lg:hidden">
              <summary className="smallcaps cursor-pointer text-[12px] text-muted">Notebook · {entries.length} reviews</summary>
              <div className="mt-3">
                <NotebookIndex entries={entries} messages={messages} activeId={lastId ?? null} onJump={jump} onClear={clearAll} />
                {pastNotebooks.length > 1 && (
                  <div className="mt-5 border-t border-line pt-4">
                    <NotebookList notebooks={pastNotebooks} activeId={activeId} onOpen={switchNotebook} onDelete={deleteNotebook} />
                  </div>
                )}
              </div>
            </details>
            <div className="space-y-8">
              {entries.map((e, i) => (
                <EntryCell
                  key={e.id}
                  entry={e}
                  index={i}
                  messages={messages}
                  open={openIds.has(e.id)}
                  running={running && e.id === lastId}
                  onToggle={() => toggle(e.id)}
                  onDelete={() => remove(e.id)}
                  renderToolCall={renderToolCall}
                />
              ))}
            </div>
            <div ref={endRef} />
          </main>
        </div>
      )}

      {started && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent pb-5 pt-10">
          <div className="mx-auto max-w-[720px] px-4">
            <Composer value={input} onChange={setInput} onSubmit={() => send(input)} disabled={running} placeholder="New review — paste a link, an INCI list, or ask…" />
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => send(presetMessage(p))} disabled={running} className="smallcaps text-[12px] text-muted hover:text-ink disabled:opacity-40">
                  {p.chip}
                </button>
              ))}
              {rulesOnly && <span className="smallcaps ml-auto text-[12px] text-[var(--review)]">rules-only</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  className = "",
  placeholder = "Paste a link, an INCI list, or ask…",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  return (
    <form
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <textarea
        value={value}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        aria-label="Product link, ingredient list or question"
        className="block max-h-48 min-h-16 w-full resize-none rounded-[32px] border border-line bg-card py-[21px] pl-6 pr-16 text-[16px] leading-[22px] text-ink shadow-[inset_0_1px_3px_rgb(28_26_23/0.06)] outline-none transition-colors placeholder:text-muted focus:border-[color-mix(in_srgb,var(--ink)_30%,var(--line))] [field-sizing:content]"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Check"
        className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-ink text-bg transition-opacity disabled:opacity-25"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M12 2v5.5a2 2 0 0 1-2 2H2m0 0 3.5-3.5M2 9.5 5.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}

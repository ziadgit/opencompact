"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { useAgent, useCopilotKit, useRenderToolCall } from "@copilotkit/react-core/v2";
import { PRESETS, findPresetInText, presetMessage } from "@/lib/presets";
import { parseIngredientText } from "@/lib/parse";
import { ToolRenderers } from "./ToolRenderers";
import { RulesOnlyResult } from "./RulesOnlyResult";
import { ProgressLine } from "@/components/cards/Verdict";
import type { ProductInput } from "@/lib/schemas";

type LocalItem =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "rules"; product: ProductInput }
  | { id: string; kind: "note"; text: string };

type Msg = {
  id: string;
  role: string;
  content?: unknown;
  toolCalls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  toolCallId?: string;
};

const uid = () => Math.random().toString(36).slice(2);

export function Home() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const renderToolCall = useRenderToolCall();
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [rulesOnly, setRulesOnly] = useState(false);
  const [local, setLocal] = useState<LocalItem[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => {
        setAiReady(s.ai);
        if (!s.ai) setRulesOnly(true);
      })
      .catch(() => setRulesOnly(true));
  }, []);

  const messages = (agent?.messages ?? []) as unknown as Msg[];
  const started = messages.length > 0 || local.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, local.length, running]);

  function runLocally(text: string, note?: string) {
    const preset = findPresetInText(text) ?? PRESETS.find((p) => p.chip === text);
    const product = preset?.product ?? parseIngredientText(text);
    const items: LocalItem[] = [];
    if (note) items.push({ id: uid(), kind: "note", text: note });
    items.push(
      product
        ? { id: uid(), kind: "rules", product }
        : { id: uid(), kind: "note", text: "In rules-only mode I can check presets or a pasted ingredient list (comma-separated, with % or ppm if you have them)." },
    );
    setLocal((l) => [...l, ...items]);
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || running) return;
    setInput("");
    if (rulesOnly || !agent) {
      setLocal((l) => [...l, { id: uid(), kind: "user", text: t }]);
      runLocally(t);
      return;
    }
    setRunning(true);
    const before = agent.messages.length;
    const userId = uid();
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
      if (!agent.messages.some((m) => m.id === userId)) setLocal((l) => [...l, { id: uid(), kind: "user", text: t }]);
      runLocally(t, "The AI analyst is unavailable right now (the model returned an error or quota limit). Switching to rules-only mode — results below come from the deterministic rulebook.");
    }
    setRunning(false);
  }

  const lastIsUser = messages.at(-1)?.role === "user";

  return (
    <div className="flex min-h-dvh flex-col">
      <ToolRenderers />
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" className="font-serif text-[20px] tracking-tight text-ink">
          OpenCompact
        </Link>
        <Link href="/about" className="text-[14px] text-muted transition-colors hover:text-ink">
          About
        </Link>
      </header>

      {aiReady === false && (
        <div className="mx-auto mt-1 w-full max-w-[720px] px-4">
          <p className="rounded-full border border-line bg-card px-4 py-2 text-center text-[13px] text-muted">
            <span className="smallcaps text-ink">Rules-only mode</span> · Add GEMINI_API_KEY to .env.local for the AI analyst. Presets still run against the rulebook.
          </p>
        </div>
      )}

      <main className={`mx-auto w-full max-w-[720px] flex-1 px-4 ${started ? "pb-44 pt-6" : "flex flex-col justify-center pb-[12vh]"}`}>
        {!started && (
          <div className="rise">
            <h1 className="font-serif text-[40px] leading-[1.02] tracking-[-0.01em] text-ink sm:text-[56px]">Is it legal to sell?</h1>
            <p className="mt-4 max-w-[520px] text-[16px] leading-relaxed text-muted">
              Paste a product link, an ingredient list, or a question. Checked against US FDA, California and EU rules.
            </p>
          </div>
        )}

        {started && (
          <div className="space-y-6">
            {messages.map((m) => (
              <MessageView key={m.id} m={m} messages={messages} renderToolCall={renderToolCall} />
            ))}
            {running && lastIsUser && <ProgressLine label="Reading your product…" />}
            {local.map((item) => (
              <LocalView key={item.id} item={item} />
            ))}
            <div ref={endRef} />
          </div>
        )}

        {!started && <Composer value={input} onChange={setInput} onSubmit={() => send(input)} className="mt-9" />}
        {!started && (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {PRESETS.map((p) => (
              <button key={p.id} onClick={() => send(presetMessage(p))} className="smallcaps text-[14px] text-muted transition-colors hover:text-ink">
                {p.chip}
              </button>
            ))}
          </div>
        )}
      </main>

      {started && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent pb-5 pt-10">
          <div className="mx-auto max-w-[720px] px-4">
            <Composer value={input} onChange={setInput} onSubmit={() => send(input)} disabled={running} />
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

function Composer({ value, onChange, onSubmit, disabled, className = "" }: { value: string; onChange: (v: string) => void; onSubmit: () => void; disabled?: boolean; className?: string }) {
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
        placeholder="Paste a link, an INCI list, or ask…"
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

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === "object" && c && "text" in c ? String(c.text) : "")).join("");
  return "";
}

function UserBubble({ text }: { text: string }) {
  const preset = findPresetInText(text);
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] whitespace-pre-line text-right text-[14px] leading-relaxed text-muted">
        {preset ? `Check the ${preset.product.name}.` : text}
      </p>
    </div>
  );
}

function MessageView({ m, messages, renderToolCall }: { m: Msg; messages: Msg[]; renderToolCall: ReturnType<typeof useRenderToolCall> }) {
  if (m.role === "user") return <UserBubble text={textOf(m.content)} />;
  if (m.role !== "assistant") return null;
  const text = textOf(m.content);
  return (
    <div className="space-y-6">
      {text && (
        <div className="prose-chat rise font-serif text-[18px] leading-[1.55] text-ink">
          <Markdown>{text}</Markdown>
        </div>
      )}
      {m.toolCalls?.map((tc) => {
        const toolMessage = messages.find((x) => x.role === "tool" && x.toolCallId === tc.id);
        return (
          <div key={tc.id}>
            {renderToolCall({
              toolCall: tc as Parameters<typeof renderToolCall>[0]["toolCall"],
              toolMessage: toolMessage as Parameters<typeof renderToolCall>[0]["toolMessage"],
            })}
          </div>
        );
      })}
    </div>
  );
}

function LocalView({ item }: { item: LocalItem }) {
  if (item.kind === "user") return <UserBubble text={item.text} />;
  if (item.kind === "note") return <p className="rise font-serif text-[18px] italic leading-[1.55] text-muted">{item.text}</p>;
  return <RulesOnlyResult product={item.product} />;
}

"use client";

import Markdown from "react-markdown";
import type { useRenderToolCall } from "@copilotkit/react-core/v2";
import { findPresetInText } from "@/lib/presets";
import { entryMessages, entrySummary, type Entry, type Msg } from "@/lib/notebook";
import { JURISDICTIONS, type Overall } from "@/lib/schemas";
import { VERDICT_STYLE, ProgressLine } from "@/components/cards/Verdict";
import { RulesOnlyResult } from "./RulesOnlyResult";

type RenderToolCall = ReturnType<typeof useRenderToolCall>;

const fmtTime = (t: number) =>
  new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Three tiny verdict marks: US · CA · EU. */
export function VerdictMini({ overall }: { overall: Overall | null }) {
  if (!overall) return null;
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px]">
      {JURISDICTIONS.map((j) => {
        const s = VERDICT_STYLE[overall[j]];
        return (
          <span key={j} className="inline-flex items-center gap-1" style={{ color: s.color }} title={`${j}: ${s.word}`}>
            <span aria-hidden className="inline-block size-1.5 rounded-full" style={{ background: s.color }} />
            {j}
            <span className="sr-only">{s.word}</span>
          </span>
        );
      })}
    </span>
  );
}

export function NotebookIndex({ entries, messages, activeId, onJump, onClear }: { entries: Entry[]; messages: Msg[]; activeId: string | null; onJump: (id: string) => void; onClear: () => void }) {
  return (
    <nav aria-label="Past reviews" className="text-[13px]">
      <div className="smallcaps mb-3 flex items-center justify-between text-[12px] text-muted">
        <span>Notebook · {entries.length}</span>
        <button onClick={onClear} className="smallcaps hover:text-[var(--violation)]">
          Clear
        </button>
      </div>
      <ol className="space-y-0.5">
        {entries.map((e, i) => {
          const s = entrySummary(e, messages);
          const active = e.id === activeId;
          return (
            <li key={e.id}>
              <button
                onClick={() => onJump(e.id)}
                className={`w-full rounded-[12px] px-3 py-2 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] ${active ? "bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]" : ""}`}
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="truncate font-serif text-[16px] leading-tight text-ink">{s.title}</span>
                </span>
                <span className="mt-1 flex items-center gap-2 pl-6">
                  <VerdictMini overall={s.overall} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type CellProps = {
  entry: Entry;
  index: number;
  messages: Msg[];
  open: boolean;
  running: boolean;
  onToggle: () => void;
  onDelete: () => void;
  renderToolCall: RenderToolCall;
};

export function EntryCell({ entry, index, messages, open, running, onToggle, onDelete, renderToolCall }: CellProps) {
  const s = entrySummary(entry, messages);
  const preset = findPresetInText(entry.prompt);
  return (
    <article id={`entry-${entry.id}`} className="scroll-mt-6 border-t border-line pt-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] text-muted">[{String(index + 1).padStart(2, "0")}]</span>
        <button onClick={onToggle} aria-expanded={open} className="group flex min-w-0 items-baseline gap-2 text-left">
          <h2 className="truncate font-serif text-[22px] leading-tight text-ink group-hover:underline group-hover:decoration-[var(--line)] group-hover:underline-offset-4">{s.title}</h2>
          <span aria-hidden className={`text-[12px] text-muted transition-transform ${open ? "rotate-90" : ""}`}>
            ›
          </span>
        </button>
        <span className="ml-auto flex items-center gap-3 text-[12px] text-muted">
          <VerdictMini overall={s.overall} />
          {entry.kind === "rules" && <span className="smallcaps text-[var(--review)]">rules-only</span>}
          <time>{fmtTime(entry.createdAt)}</time>
          <button onClick={onDelete} aria-label={`Delete review ${index + 1}`} className="text-muted hover:text-[var(--violation)]">
            ✕
          </button>
        </span>
      </header>

      <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[13px] text-muted">{preset ? `Check the ${preset.product.name}.` : entry.prompt}</p>

      {!open && s.headline && (
        <button onClick={onToggle} className="mt-3 block text-left font-serif text-[17px] italic leading-snug text-muted hover:text-ink">
          {s.headline} <span className="not-italic">— open</span>
        </button>
      )}

      {open && (
        <div className="mt-6 space-y-6 pb-4">
          {entry.kind === "rules" ? (
            <>
              {entry.note && <p className="font-serif text-[18px] italic leading-[1.55] text-muted">{entry.note}</p>}
              {entry.product ? (
                <RulesOnlyResult product={entry.product} />
              ) : (
                <p className="font-serif text-[18px] italic leading-[1.55] text-muted">
                  In rules-only mode I can check presets or a pasted ingredient list (comma-separated, with % or ppm if you have them).
                </p>
              )}
            </>
          ) : (
            <AiEntryBody entry={entry} messages={messages} running={running} renderToolCall={renderToolCall} />
          )}
        </div>
      )}
    </article>
  );
}

function AiEntryBody({ entry, messages, running, renderToolCall }: { entry: Entry; messages: Msg[]; running: boolean; renderToolCall: RenderToolCall }) {
  const msgs = entryMessages(entry, messages).slice(1);
  const waiting = running && !msgs.some((m) => m.role === "assistant");
  return (
    <>
      {msgs.map((m) => (m.role === "assistant" ? <AssistantMessage key={m.id} m={m} messages={msgs} renderToolCall={renderToolCall} /> : null))}
      {waiting && <ProgressLine label="Reading your product…" />}
    </>
  );
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === "object" && c && "text" in c ? String(c.text) : "")).join("");
  return "";
}

function AssistantMessage({ m, messages, renderToolCall }: { m: Msg; messages: Msg[]; renderToolCall: RenderToolCall }) {
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
              toolCall: tc as Parameters<RenderToolCall>[0]["toolCall"],
              toolMessage: toolMessage as Parameters<RenderToolCall>[0]["toolMessage"],
            })}
          </div>
        );
      })}
    </div>
  );
}

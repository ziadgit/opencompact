import type { Verdict } from "@/lib/schemas";

export const VERDICT_STYLE: Record<Verdict, { color: string; word: string; glyph: string }> = {
  PASS: { color: "var(--pass)", word: "Pass", glyph: "✓" },
  VIOLATION: { color: "var(--violation)", word: "Violation", glyph: "✕" },
  WARN: { color: "var(--review)", word: "Warn", glyph: "!" },
  NEEDS_REVIEW: { color: "var(--review)", word: "Review", glyph: "?" },
};

export function VerdictDot({ verdict, label = true }: { verdict: Verdict; label?: boolean }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: s.color }}>
      <span aria-hidden className="inline-block size-1.5 rounded-full" style={{ background: s.color }} />
      {label && <span className="text-[13px] font-medium">{s.word}</span>}
    </span>
  );
}

export function VerdictPill({ name, verdict }: { name: string; verdict: Verdict }) {
  const s = VERDICT_STYLE[verdict];
  return (
    <div
      className="flex flex-1 items-center justify-between gap-3 rounded-full border px-4 py-2.5"
      style={{ borderColor: `color-mix(in srgb, ${s.color} 35%, var(--line))`, background: `color-mix(in srgb, ${s.color} 7%, var(--card))` }}
    >
      <span className="text-[13px] text-ink">{name}</span>
      <span className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: s.color }}>
        <span aria-hidden className="font-mono text-[11px]">{s.glyph}</span>
        {s.word}
      </span>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rise rounded-[20px] border border-line bg-card p-5 sm:p-7 ${className}`} style={{ boxShadow: "var(--shadow)" }}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="smallcaps mb-3 text-[13px] text-muted">{children}</div>;
}

export function ProgressLine({ label }: { label: string }) {
  return (
    <div className="rise my-6 max-w-sm">
      <div className="hairline-progress" />
      <p className="mt-2.5 font-serif text-[17px] italic text-muted">{label}</p>
    </div>
  );
}

export function SourceTag({ source }: { source: "rule" | "ai" | "both" }) {
  const text = source === "both" ? "rule + ai" : source;
  return <span className="rounded-full border border-line px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-muted">{text}</span>;
}

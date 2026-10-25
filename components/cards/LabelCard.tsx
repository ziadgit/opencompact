import { JURISDICTION_NAMES, type LabelLint } from "@/lib/schemas";
import { Card, Eyebrow } from "./Verdict";

const SEV = {
  VIOLATION: { glyph: "✕", color: "var(--violation)" },
  WARN: { glyph: "!", color: "var(--review)" },
  OK: { glyph: "✓", color: "var(--pass)" },
} as const;

export function LabelCard({ lint }: { lint: LabelLint }) {
  return (
    <Card>
      <Eyebrow>Label review</Eyebrow>
      {lint.findings.length === 0 && <p className="font-serif text-[18px] text-ink">No label issues found: the warning is legible and the claims are cosmetic.</p>}
      <ul className="divide-y divide-[var(--line)]">
        {lint.findings.map((f, i) => {
          const s = SEV[f.severity];
          return (
            <li key={i} className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
              <span
                aria-label={f.severity}
                className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[11px]"
                style={{ color: s.color, borderColor: `color-mix(in srgb, ${s.color} 40%, transparent)` }}
              >
                {s.glyph}
              </span>
              <div className="min-w-0">
                <p className="text-[15px] text-ink">{f.title}</p>
                <p className="mt-1 text-[12px] text-muted">
                  <span className="smallcaps">{JURISDICTION_NAMES[f.jurisdiction]}</span> · <span className="font-mono">{f.citation}</span>
                </p>
                <p className="mt-1.5 font-serif text-[16px] italic text-muted">{f.fix}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

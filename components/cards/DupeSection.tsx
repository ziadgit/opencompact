"use client";

import dynamic from "next/dynamic";
import { JURISDICTIONS, type DupeResult } from "@/lib/schemas";
import { VerdictDot } from "./Verdict";

const DupeStage = dynamic(() => import("@/components/dupe3d/DupeStage"), {
  ssr: false,
  loading: () => <div className="h-[440px] animate-pulse rounded-[24px] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] sm:h-[520px]" />,
});

export function DupeSection({ dupe }: { dupe: DupeResult }) {
  return (
    <div className="rise relative left-1/2 w-[min(1100px,calc(100vw-32px))] -translate-x-1/2">
      <DupeStage dupe={dupe} />
      <div className="mx-auto mt-6 grid max-w-[720px] gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="smallcaps mb-2 text-[13px] text-muted">
            {dupe.alreadyCompliant ? "Already compliant — a refined variant" : `Swaps · ${dupe.dupe.brandName}`}
          </div>
          {dupe.swaps.length === 0 && (
            <p className="font-serif text-[20px] text-ink">No swaps needed. Same formula, refined vessel and label.</p>
          )}
          <ul className="space-y-3">
            {dupe.swaps.map((s, i) => (
              <li key={i} className="border-b border-line pb-3">
                <p className="font-serif text-[22px] leading-tight text-ink">
                  <span className="line-through decoration-[var(--violation)] decoration-1">{s.from}</span>
                  <span className="mx-2 text-muted">→</span>
                  <span>{s.to}</span>
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  {s.reason} <span className="font-mono text-[11px]">{s.citation}</span>
                </p>
              </li>
            ))}
          </ul>
          {dupe.newClaims.length > 0 && (
            <p className="mt-4 text-[13px] text-muted">
              New claims: <span className="font-serif text-[16px] italic text-ink">{dupe.newClaims.join(" · ")}</span>
            </p>
          )}
        </div>
        <div className="text-[13px] sm:min-w-[160px]">
          <div className="smallcaps mb-2 text-muted">Dupe verdict</div>
          {JURISDICTIONS.map((j) => (
            <div key={j} className="flex justify-between gap-4 py-1">
              <span className="text-muted">{j === "CA" ? "California" : j === "US" ? "US FDA" : "EU"}</span>
              <VerdictDot verdict={dupe.dupeOverall[j]} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

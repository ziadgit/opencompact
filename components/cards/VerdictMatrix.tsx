"use client";

import { useState } from "react";
import { JURISDICTIONS, JURISDICTION_NAMES, type AuditResult, type Jurisdiction } from "@/lib/schemas";
import { Card, Eyebrow, SourceTag, VerdictDot, VerdictPill } from "./Verdict";

export function VerdictMatrix({ audit }: { audit: AuditResult }) {
  const [open, setOpen] = useState<OpenCell>(null);
  const names = { US: "US FDA", CA: "California", EU: "EU" } as const;

  return (
    <Card>
      <Eyebrow>
        Verdict · {audit.product.name}
        {audit.mode === "rules-only" && " · rules-only"}
      </Eyebrow>
      <p className="font-serif text-[24px] leading-tight text-ink sm:text-[28px]">{audit.headline}</p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {JURISDICTIONS.map((j) => (
          <VerdictPill key={j} name={names[j]} verdict={audit.overall[j]} />
        ))}
      </div>

      <div className="mt-6 -mx-5 overflow-x-auto px-5 sm:-mx-7 sm:px-7">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="text-[12px] text-muted">
              <th className="smallcaps pb-2 font-normal">Ingredient</th>
              {JURISDICTIONS.map((j) => (
                <th key={j} className="smallcaps w-[22%] pb-2 font-normal">
                  {names[j]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {audit.rows.map((row, i) => (
              <Row key={row.inci + i} row={row} i={i} open={open} setOpen={setOpen} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[12px] text-muted">Tap a verdict for the citation. Draft, not legal advice.</p>
    </Card>
  );
}

type OpenCell = { row: number; j: Jurisdiction } | null;

function Row({ row, i, open, setOpen }: { row: AuditResult["rows"][number]; i: number; open: OpenCell; setOpen: (v: OpenCell) => void }) {
    const cell = open?.row === i ? row.verdicts[open.j] : null;
    return (
      <>
        <tr className="border-t border-line align-top">
          <td className="py-3 pr-3">
            <div className="text-[14px] text-ink">{row.inci}</div>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
              <span className="font-mono">{row.percent}</span>
              {row.role && (
                <span className="max-w-[150px] truncate" title={row.role}>
                  · {row.role}
                </span>
              )}
              <SourceTag source={row.source} />
            </div>
          </td>
          {JURISDICTIONS.map((j) => {
            const active = open?.row === i && open.j === j;
            return (
              <td key={j} className="py-3 pr-2">
                <button
                  onClick={() => setOpen(active ? null : { row: i, j })}
                  className={`rounded-full px-2 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] ${active ? "bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]" : ""}`}
                  aria-expanded={active}
                >
                  <VerdictDot verdict={row.verdicts[j].verdict} />
                </button>
              </td>
            );
          })}
        </tr>
        {cell && open && (
          <tr>
            <td colSpan={4} className="pb-4">
              <div className="rise rounded-[14px] border border-line bg-bg px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                  <span className="smallcaps">{JURISDICTION_NAMES[open.j]}</span>
                  <span className="font-mono text-ink">{cell.citation}</span>
                </div>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{cell.why}</p>
                {cell.verdict === "NEEDS_REVIEW" && (
                  <p className="mt-2 text-[13px]" style={{ color: "var(--review)" }}>
                    AI and rulebook disagree — {row.disagreement}
                  </p>
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  }

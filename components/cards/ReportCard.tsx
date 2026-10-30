"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { MocraReport } from "@/lib/schemas";
import { Card } from "./Verdict";

export function ReportCard({ report }: { report: MocraReport }) {
  const [copied, setCopied] = useState(false);
  const date = new Date(`${report.dueBy}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const download = () => {
    const url = URL.createObjectURL(new Blob([report.markdown], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `mocra-report-${report.dueBy}.md` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="overflow-hidden !p-0">
      <div
        className="px-5 py-4 sm:px-7"
        style={{ background: report.serious ? "color-mix(in srgb, var(--violation) 12%, var(--card))" : "var(--card)" }}
      >
        <div className="smallcaps text-[13px]" style={{ color: report.serious ? "var(--violation)" : "var(--muted)" }}>
          {report.serious ? "Serious adverse event" : "Adverse event — not classed serious"}
        </div>
        <p className="mt-1 font-serif text-[26px] leading-tight text-ink">
          {report.serious ? <>File with FDA by {date}</> : <>Keep records; no 15-day report required</>}
        </p>
        <p className="mt-1 font-mono text-[12px] text-muted">MoCRA §605 · 21 U.S.C. §364a · 15 business days</p>
      </div>
      <div className="max-h-[420px] overflow-y-auto border-t border-line px-5 py-5 sm:px-7">
        <div className="prose-report text-[14px] leading-relaxed text-ink">
          <Markdown remarkPlugins={[remarkGfm]}>{report.markdown}</Markdown>
        </div>
      </div>
      <div className="flex gap-2 border-t border-line px-5 py-3 sm:px-7">
        <button
          className="rounded-full border border-line px-4 py-1.5 text-[13px] text-ink hover:border-[var(--ink)]"
          onClick={async () => {
            await navigator.clipboard.writeText(report.markdown);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button className="rounded-full bg-ink px-4 py-1.5 text-[13px] text-bg" onClick={download}>
          Download .md
        </button>
      </div>
    </Card>
  );
}

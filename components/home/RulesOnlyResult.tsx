"use client";

import { useMemo } from "react";
import { lintLabelRules, ruleCheck, violatingJurisdictions } from "@/lib/rules";
import { deterministicDupe } from "@/lib/dupe";
import { mocraFallback } from "@/lib/report";
import { VerdictMatrix } from "@/components/cards/VerdictMatrix";
import { LabelCard } from "@/components/cards/LabelCard";
import { DupeSection } from "@/components/cards/DupeSection";
import { ReportCard } from "@/components/cards/ReportCard";
import type { ProductInput } from "@/lib/schemas";

/** The full deterministic pipeline, rendered without the AI: audit, label, dupe, MoCRA. */
export function RulesOnlyResult({ product }: { product: ProductInput }) {
  const { audit, lint, dupe, report } = useMemo(() => {
    const audit = ruleCheck(product);
    return {
      audit,
      lint: product.label ? { findings: lintLabelRules(product.label, product.category, violatingJurisdictions(audit.rows)) } : null,
      dupe: deterministicDupe(product, audit),
      report: product.adverseEvents ? mocraFallback(product, product.adverseEvents) : null,
    };
  }, [product]);

  return (
    <div className="space-y-6">
      <VerdictMatrix audit={audit} />
      {lint && <LabelCard lint={lint} />}
      {report && <ReportCard report={report} />}
      <DupeSection dupe={dupe} />
      <p className="font-serif text-[18px] leading-[1.55] text-ink">
        {audit.headline} <span className="italic text-muted">Rules-only check. Draft, not legal advice.</span>
      </p>
    </div>
  );
}

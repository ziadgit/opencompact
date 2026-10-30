"use client";

import { useRenderTool } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { ProgressLine } from "@/components/cards/Verdict";
import { VerdictMatrix } from "@/components/cards/VerdictMatrix";
import { LabelCard } from "@/components/cards/LabelCard";
import { DupeSection } from "@/components/cards/DupeSection";
import { ReportCard } from "@/components/cards/ReportCard";
import type { AuditResult, DupeResult, LabelLint, MocraReport, ProductInput } from "@/lib/schemas";

const anyArgs = z.any();

function parse<T>(result: string | undefined): T | null {
  try {
    return result ? (JSON.parse(result) as T) : null;
  } catch {
    return null;
  }
}

function ToolError({ result }: { result?: string }) {
  // Malformed tool arguments are rejected before the tool runs, and the agent retries with fixed ones.
  if (result?.startsWith("Error: Invalid input for tool")) return null;
  return <p className="font-serif text-[16px] italic text-muted">That step didn’t return a result.</p>;
}

/** Registers one generative-UI renderer per agent tool. Renders nothing itself. */
export function ToolRenderers() {
  useRenderTool({
    name: "read_product_url",
    parameters: anyArgs,
    render: ({ status, result }) => {
      if (status !== "complete") return <ProgressLine label="Reading the product page…" />;
      const p = parse<ProductInput>(result);
      if (!p?.ingredients) return <ToolError result={result} />;
      return (
        <p className="rise text-[13px] text-muted">
          <span className="smallcaps">Read</span> · {p.name} · {p.ingredients.length} ingredients
          {p.ingredients.some((i) => i.estimated) && " (concentrations estimated)"}
        </p>
      );
    },
  });

  useRenderTool({
    name: "audit_formulation",
    parameters: anyArgs,
    render: ({ status, result }) => {
      if (status !== "complete") return <ProgressLine label="Checking FDA, California and EU Annex III…" />;
      const a = parse<AuditResult>(result);
      return a?.rows ? <VerdictMatrix audit={a} /> : <ToolError result={result} />;
    },
  });

  useRenderTool({
    name: "lint_label",
    parameters: anyArgs,
    render: ({ status, result }) => {
      if (status !== "complete") return <ProgressLine label="Reading the label…" />;
      const l = parse<LabelLint>(result);
      return l?.findings ? <LabelCard lint={l} /> : <ToolError result={result} />;
    },
  });

  useRenderTool({
    name: "design_dupe",
    parameters: anyArgs,
    render: ({ status, result }) => {
      if (status !== "complete") return <ProgressLine label="Designing a compliant dupe…" />;
      const d = parse<DupeResult>(result);
      return d?.dupe ? <DupeSection dupe={d} /> : <ToolError result={result} />;
    },
  });

  useRenderTool({
    name: "draft_mocra_report",
    parameters: anyArgs,
    render: ({ status, result }) => {
      if (status !== "complete") return <ProgressLine label="Drafting the MoCRA report…" />;
      const r = parse<MocraReport>(result);
      return r?.markdown ? <ReportCard report={r} /> : <ToolError result={result} />;
    },
  });

  return null;
}

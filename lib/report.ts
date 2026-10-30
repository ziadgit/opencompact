import { isSeriousAdverseEvent, mocraDueDate, percent, ruleCheck } from "@/lib/rules";
import type { MocraReport, ProductInput } from "@/lib/schemas";

/** Deterministic MoCRA packet, used offline and as the fallback when the model is unavailable. */
export function mocraFallback(product: ProductInput, log: string): MocraReport {
  const serious = isSeriousAdverseEvent(log);
  const dueBy = mocraDueDate(log);
  const flagged = ruleCheck(product)
    .rows.filter((r) => Object.values(r.verdicts).some((v) => v.verdict === "VIOLATION"))
    .map((r) => `${r.inci} (${percent(r.ppm)})`);
  const markdown = [
    `# MoCRA adverse event packet — ${product.name}`,
    "",
    `**Serious adverse event:** ${serious ? `Yes — submit to FDA by **${dueBy}** (15 business days, 21 U.S.C. §364a).` : "No"}`,
    `**Batch:** ${product.batch ?? "not recorded"}`,
    "",
    "## Timeline",
    ...log
      .split("\n")
      .filter(Boolean)
      .map((l) => `- ${l.replace(/\d+yo (fe)?male/gi, "Adult consumer")}`),
    "",
    "## Suspected cause",
    `- Ingredients flagged by the rulebook: ${flagged.join(", ") || "none"}.`,
    "",
    "## Follow-up questions",
    "- Were other units from this batch distributed? What is the quarantine and recall scope?",
    "- What was the medical outcome at 7 and 30 days?",
    "- Are cleaning records available for the shared filling line?",
    "",
    "_Draft, not legal advice._",
  ].join("\n");
  return { serious, dueBy, markdown };
}

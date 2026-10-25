import {
  JURISDICTIONS,
  JURISDICTION_NAMES,
  type AuditResult,
  type Cell,
  type IngredientVerdict,
  type Jurisdiction,
  type LabelFinding,
  type Overall,
  type ProductInput,
  type Verdict,
} from "@/lib/schemas";
import { matchRule } from "./table";
import { lintLabelRules } from "./label";

export { RULES, matchRule } from "./table";
export { lintLabelRules, findDrugWords } from "./label";
export { isSeriousAdverseEvent, mocraDueDate, addBusinessDays } from "./mocra";

const RANK: Record<Verdict, number> = { PASS: 0, WARN: 1, NEEDS_REVIEW: 2, VIOLATION: 3 };
export const worst = (vs: Verdict[]): Verdict => vs.reduce<Verdict>((a, b) => (RANK[b] > RANK[a] ? b : a), "PASS");

export const percent = (ppm: number) => {
  const p = ppm / 10000;
  return `${p >= 1 ? p.toFixed(1).replace(/\.0$/, "") : p.toPrecision(2)}%`;
};

const NO_RULE: Cell = { verdict: "PASS", citation: "No specific rule found", why: "Not on the OpenCompact restricted list." };

/** Deterministic per-ingredient verdicts from the rules table. */
export function ruleRows(product: ProductInput): IngredientVerdict[] {
  return product.ingredients.map((ing) => {
    const rule = matchRule(ing);
    const verdicts = rule
      ? rule.evaluate({ ppm: ing.ppm, category: product.category })
      : { US: NO_RULE, CA: NO_RULE, EU: NO_RULE };
    return {
      inci: ing.inci,
      ppm: ing.ppm,
      percent: percent(ing.ppm),
      role: ing.role ?? "",
      verdicts,
      source: "rule",
    };
  });
}

export function isRuleMatched(inci: string) {
  return Boolean(matchRule({ inci }));
}

export function overallFrom(rows: IngredientVerdict[], findings: LabelFinding[] = []): Overall {
  const out = {} as Overall;
  for (const j of JURISDICTIONS) {
    const label = findings
      .filter((f) => f.jurisdiction === j && f.severity !== "OK")
      .map((f) => f.severity as Verdict);
    out[j] = worst([...rows.map((r) => r.verdicts[j].verdict), ...label]);
  }
  return out;
}

export function violatingJurisdictions(rows: IngredientVerdict[]): Jurisdiction[] {
  return JURISDICTIONS.filter((j) => rows.some((r) => r.verdicts[j].verdict === "VIOLATION"));
}

export function headlineFor(overall: Overall, name: string): string {
  const bad = JURISDICTIONS.filter((j) => overall[j] === "VIOLATION").map((j) => JURISDICTION_NAMES[j]);
  const review = JURISDICTIONS.filter((j) => overall[j] === "NEEDS_REVIEW").map((j) => JURISDICTION_NAMES[j]);
  if (!bad.length && !review.length) return `${name} can be sold in the US, California and the EU as formulated.`;
  if (bad.length === 3) return `${name} cannot be sold as-is in any of the three markets.`;
  const parts = [];
  if (bad.length) parts.push(`fails in ${bad.join(" and ")}`);
  if (review.length) parts.push(`needs review in ${review.join(" and ")}`);
  return `${name} ${parts.join(", and ")}.`;
}

/** Full deterministic audit: ingredients + label rules. Works offline. */
export function ruleCheck(product: ProductInput): AuditResult {
  const rows = ruleRows(product);
  const findings = product.label ? lintLabelRules(product.label, product.category, violatingJurisdictions(rows)) : [];
  const overall = overallFrom(rows, findings);
  return { product, rows, overall, headline: headlineFor(overall, product.name), mode: "rules-only" };
}

/**
 * Compare AI rows to rule rows. Rule-matched ingredients where AI and rulebook disagree become
 * NEEDS_REVIEW with both opinions shown. Ingredients only the AI judged keep `source: "ai"`.
 */
export function crosscheck(product: ProductInput, aiRows: IngredientVerdict[]): IngredientVerdict[] {
  const rules = ruleRows(product);
  const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return rules.map((rr) => {
    const ai = aiRows.find((a) => key(a.inci) === key(rr.inci)) ?? aiRows.find((a) => key(rr.inci).includes(key(a.inci)) || key(a.inci).includes(key(rr.inci)));
    const matched = isRuleMatched(rr.inci);
    if (!ai) return rr;
    if (!matched) return { ...ai, inci: rr.inci, ppm: rr.ppm, percent: rr.percent, role: ai.role || rr.role, source: "ai" };

    const notes: string[] = [];
    const verdicts = { ...rr.verdicts };
    for (const j of JURISDICTIONS) {
      const r = rr.verdicts[j];
      const a = ai.verdicts[j];
      if (a && a.verdict !== r.verdict && !(a.verdict === "WARN" && r.verdict === "PASS")) {
        notes.push(`${JURISDICTION_NAMES[j]}: rulebook says ${r.verdict}, AI says ${a.verdict}`);
        verdicts[j] = {
          verdict: "NEEDS_REVIEW",
          citation: r.citation,
          why: `Rulebook: ${r.verdict} — ${r.why} AI: ${a.verdict} — ${a.why}`,
        };
      }
    }
    return {
      ...rr,
      role: ai.role || rr.role,
      verdicts,
      source: "both",
      disagreement: notes.length ? notes.join("; ") : undefined,
    };
  });
}

import type { Category, Label, LabelFinding, Jurisdiction } from "@/lib/schemas";

const PROMINENCE = "21 CFR §701.2 (prominence & conspicuousness)";
const DRUG_WORDS = ["permanent", "reconstruct", "regrow", "reverse hair loss", "follicle", "cure", "treat"];
const ABSOLUTE_WORDS = ["non-toxic", "nontoxic", "100% clean"];

export function findDrugWords(text: string): string[] {
  const t = text.toLowerCase();
  return DRUG_WORDS.filter((w) => t.includes(w));
}

/**
 * Deterministic label rules. `violatingIn` lists jurisdictions where an ingredient already fails,
 * so absolute "non-toxic" claims can be flagged there.
 */
export function lintLabelRules(label: Label, _category: Category, violatingIn: Jurisdiction[] = []): LabelFinding[] {
  const out: LabelFinding[] = [];

  if (label.warningPt !== undefined && label.warningPt < 6) {
    out.push({
      severity: "VIOLATION",
      jurisdiction: "US",
      title: `Warning set at ${label.warningPt} pt — below the 6 pt minimum`,
      citation: PROMINENCE,
      fix: "Set the mandatory warning at 6 pt or larger.",
    });
  }
  if (label.contrast !== undefined && label.contrast < 4.5) {
    out.push({
      severity: "VIOLATION",
      jurisdiction: "US",
      title: `Warning contrast ${label.contrast}:1 — below 4.5:1`,
      citation: PROMINENCE,
      fix: "Print the warning in a color with at least 4.5:1 contrast against its background.",
    });
  }
  if (label.hiddenBehindPeel) {
    out.push({
      severity: "VIOLATION",
      jurisdiction: "US",
      title: "Mandatory warning is hidden behind a peel-off layer",
      citation: "21 CFR §701.2; 21 CFR §740.10",
      fix: "Move the warning to the outer label, visible at point of sale.",
    });
  }

  const drug = findDrugWords(label.frontClaim);
  if (drug.length) {
    out.push({
      severity: "VIOLATION",
      jurisdiction: "US",
      title: `Drug claim: "${drug.join('", "')}"`,
      citation: "FD&C Act §201(g)(1)",
      fix: "Describe appearance only (e.g. “lifts and sets the look of brows”), not changes to structure or function.",
    });
    out.push({
      severity: "WARN",
      jurisdiction: "EU",
      title: "Claim may fail the EU common criteria for cosmetic claims",
      citation: "Reg. (EU) 655/2013",
      fix: "Keep claims truthful, evidence-backed and within cosmetic function.",
    });
  }

  const claim = label.frontClaim.toLowerCase();
  if (ABSOLUTE_WORDS.some((w) => claim.includes(w))) {
    for (const j of violatingIn) {
      out.push({
        severity: "WARN",
        jurisdiction: j,
        title: "Absolute “non-toxic / clean” claim alongside a restricted ingredient",
        citation: j === "EU" ? "Reg. (EU) 655/2013 (honesty criterion)" : "FTC Act §5; Cal. Bus. & Prof. Code §17500",
        fix: "Drop the absolute claim, or reformulate first.",
      });
    }
  }

  const measured = label.warningPt !== undefined && label.contrast !== undefined && label.hiddenBehindPeel !== undefined;
  if (!out.length) {
    out.push(
      measured
        ? { severity: "OK", jurisdiction: "US", title: "Warning is legible, visible and claims are cosmetic", citation: PROMINENCE, fix: "No change needed." }
        : { severity: "OK", jurisdiction: "US", title: "Claims are cosmetic, with no drug or absolute wording", citation: "FD&C Act §201(g)(1)", fix: "No change needed." },
    );
  }
  if (!measured) {
    out.push({
      severity: "NOTE",
      jurisdiction: "US",
      title: "Warning size, contrast and placement not checked",
      citation: PROMINENCE,
      fix: "A product page doesn't show how the warning is printed. Check the physical package: at least 6 pt, 4.5:1 contrast, not under a peel-off.",
    });
  }
  return out;
}

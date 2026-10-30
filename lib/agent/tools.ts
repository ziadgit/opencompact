import { defineTool } from "@copilotkit/runtime/v2";
import { z } from "zod";
import { llmJSON, llmText } from "./llm";
import { RULEBOOK } from "./prompt";
import {
  crosscheck,
  headlineFor,
  isSeriousAdverseEvent,
  lintLabelRules,
  mocraDueDate,
  overallFrom,
  ruleCheck,
  violatingJurisdictions,
} from "@/lib/rules";
import { deterministicDupe } from "@/lib/dupe";
import { mocraFallback } from "@/lib/report";
import {
  Category,
  Cell,
  Label,
  ProductInput,
  VesselSpec,
  type AuditResult,
  type DupeResult,
  type IngredientVerdict,
  type LabelLint,
  type MocraReport,
} from "@/lib/schemas";

const warn = (tool: string, e: unknown) => console.warn(`[${tool}] AI unavailable, using rulebook:`, (e as Error).message?.slice(0, 160));

// ---------- audit ----------

const AiAudit = z.object({
  rows: z.array(z.object({ inci: z.string(), role: z.string(), US: Cell, CA: Cell, EU: Cell })),
  headline: z.string(),
});

export async function auditFormulation(product: ProductInput): Promise<AuditResult> {
  const base = ruleCheck(product);
  try {
    const ai = await llmJSON(
      `Audit this cosmetic product for US FDA, California and EU. For every ingredient give a verdict (PASS, VIOLATION or WARN), a citation and a one-sentence why. Headline: one plain-English sentence of at most 20 words, no citations.\n\n${JSON.stringify(product)}`,
      AiAudit,
      { system: `You are a cosmetics regulatory analyst. Never invent citations; use these or "No specific rule found".\n${RULEBOOK}` },
    );
    const aiRows: IngredientVerdict[] = ai.rows.map((r) => ({
      inci: r.inci,
      ppm: 0,
      percent: "",
      role: r.role,
      verdicts: { US: r.US, CA: r.CA, EU: r.EU },
      source: "ai",
    }));
    const rows = crosscheck(product, aiRows);
    const findings = product.label ? lintLabelRules(product.label, product.category, violatingJurisdictions(rows)) : [];
    const overall = overallFrom(rows, findings);
    return { product, rows, overall, headline: ai.headline || headlineFor(overall, product.name), mode: "ai" };
  } catch (e) {
    warn("audit_formulation", e);
    return base;
  }
}

// ---------- label ----------

export async function lintLabel(label: Label, category: Category, violatingIn: AuditResult["overall"] | undefined): Promise<LabelLint> {
  const bad = violatingIn ? (Object.keys(violatingIn) as (keyof typeof violatingIn)[]).filter((j) => violatingIn[j] === "VIOLATION") : [];
  const findings = lintLabelRules(label, category, bad);
  try {
    const extra = await llmJSON(
      `Review this cosmetic front claim for drug claims (structure/function), fear-based or misleading claims not already covered. Claim: "${label.frontClaim}". Category: ${category}. Already flagged: ${findings.map((f) => f.title).join("; ") || "nothing"}. Return at most 2 new findings; return an empty list if none.`,
      z.object({
        findings: z.array(
          z.object({ severity: z.enum(["VIOLATION", "WARN"]), jurisdiction: z.enum(["US", "CA", "EU"]), title: z.string(), citation: z.string(), fix: z.string() }),
        ),
      }),
      { system: `Cite only from this rulebook or say "No specific rule found".\n${RULEBOOK}` },
    );
    const all = [...findings.filter((f) => f.severity === "VIOLATION" || f.severity === "WARN"), ...extra.findings.slice(0, 2)].sort(bySeverity);
    // A clean label still gets a visible "OK" row rather than an empty card.
    const notes = findings.filter((f) => f.severity === "NOTE");
    return { findings: all.length ? [...all, ...notes] : findings };
  } catch (e) {
    warn("lint_label", e);
    return { findings };
  }
}

const bySeverity = (a: { severity: string }, b: { severity: string }) =>
  ["VIOLATION", "WARN", "OK", "NOTE"].indexOf(a.severity) - ["VIOLATION", "WARN", "OK", "NOTE"].indexOf(b.severity);

// ---------- dupe ----------

const AiDupe = z.object({
  brandName: z.string(),
  productTitle: z.string(),
  newClaims: z.array(z.string()),
  original: VesselSpec.pick({ bodyHex: true, accentHex: true, contentHex: true, finish: true }),
  dupe: VesselSpec.pick({ bodyHex: true, accentHex: true, contentHex: true, finish: true, glassFrost: true }),
});

export async function designDupe(product: ProductInput, brief?: string): Promise<DupeResult> {
  const base = deterministicDupe(product, ruleCheck(product));
  try {
    const ai = await llmJSON(
      `Design a legally distinct, compliant "dupe" of this product. Always invent a new brand name (never a real brand, never "None") and a product title, even when the original is unsafe: the dupe is the safe reformulation. Write 2–3 positive, cosmetic (non-drug) claims. Pick vessel colors (hex) and finish (platinum, gold, obsidian or porcelain) for the original and an elevated dupe.\nIngredient swaps already chosen by the rulebook: ${base.swaps.map((s) => `${s.from} → ${s.to}`).join("; ") || "none (already compliant: offer a refined variant)"}.\n${brief ? `Brief: ${brief}\n` : ""}Product: ${JSON.stringify(product)}`,
      AiDupe,
    );
    // Small models sometimes answer "None" instead of inventing a name; keep the rulebook's brand then.
    const named = (s: string) => s.trim().length > 1 && !/^(none|n\/a|null|unknown)$/i.test(s.trim());
    if (!named(ai.brandName)) ai.brandName = base.dupe.brandName;
    if (!named(ai.productTitle)) ai.productTitle = base.dupe.productTitle;
    return {
      ...base,
      original: { ...base.original, ...ai.original },
      dupe: { ...base.dupe, ...ai.dupe, brandName: ai.brandName, productTitle: ai.productTitle, labelFront: ai.newClaims[0] ?? base.dupe.labelFront },
      newClaims: ai.newClaims.length ? ai.newClaims : base.newClaims,
    };
  } catch (e) {
    warn("design_dupe", e);
    return base;
  }
}

// ---------- MoCRA ----------

export async function draftMocraReport(product: ProductInput, adverseEvents: string): Promise<MocraReport> {
  const serious = isSeriousAdverseEvent(adverseEvents);
  const dueBy = mocraDueDate(adverseEvents);
  const { markdown: fallback } = mocraFallback(product, adverseEvents);

  try {
    const markdown = await llmText(
      `Write a concise MoCRA serious adverse event packet in Markdown for FDA (MedWatch 3500A style). Sections: Summary (anonymize patients: age band and state only), Timeline, Suspected cause (link QC findings to ingredients), Actions taken, Follow-up questions. Serious: ${serious}. Due by ${dueBy}. End with "Draft, not legal advice."\nProduct: ${JSON.stringify(product)}\nLog:\n${adverseEvents}`,
      { system: RULEBOOK },
    );
    return { serious, dueBy, markdown: markdown.trim() || fallback };
  } catch (e) {
    warn("draft_mocra_report", e);
    return { serious, dueBy, markdown: fallback };
  }
}

// ---------- URL ----------

const UrlProduct = ProductInput.extend({
  ingredientSource: z.string().describe("URL the ingredient list was read from, or empty if none was found"),
  sourceNote: z.string().describe("One sentence: where the list came from, which shade/variant, and anything missing"),
});
export type UrlProduct = z.infer<typeof UrlProduct>;

export async function readProductUrl(url: string): Promise<UrlProduct> {
  const product = await llmJSON(
    `Find this product and its full INCI ingredient list: ${url}

1. Fetch the page. Many retailers (e.g. Sephora, Ulta) block automated fetching; that's expected.
2. If the page is blocked or has no ingredient list, work out the brand, product and shade from the URL, search the web for "<brand> <product> ingredients", and fetch the brand's own product page, another retailer or an INCI database (e.g. INCIDecoder, Skinsort).
3. If ingredients differ by shade, use the shade named in the URL; otherwise use the first shade listed and say which in sourceNote.
   Include the "may contain" / "+/-" colorants (iron oxides, titanium dioxide, lakes, CI numbers) as ingredients too; compliance often depends on them.
4. Only use ingredients you read on a page in this session. Never fill gaps from memory. If no page gives the full list, return the part you found (or none) and say so in sourceNote.

Extract: name (brand + product), category, ingredients in list order (estimate ppm from list order: first ~300000, falling quickly, colorants and preservatives 1000–10000; set estimated: true), the marketing claims as label.frontClaim (omit warningPt, contrast and hiddenBehindPeel: a web page doesn't show how the warning is printed), the vessel archetype (compact, dropper or airless-pump), ingredientSource and sourceNote.`,
    UrlProduct,
    { web: true },
  );
  return { ...product, sourceUrl: url };
}

// ---------- tool definitions ----------

export const tools = [
  defineTool({
    name: "read_product_url",
    description:
      "Read a product URL and extract a ProductInput (name, category, INCI list with ppm, claims, vessel). If the retailer blocks fetching, it finds the same product's ingredient list on the brand site or another source; ingredientSource and sourceNote say where it came from.",
    parameters: z.object({ url: z.string().describe("Product page URL") }),
    execute: async ({ url }) => readProductUrl(url),
  }),
  defineTool({
    name: "audit_formulation",
    description: "Audit a product's ingredients against US FDA, California and EU rules. Rulebook check, AI review, then cross-check.",
    parameters: ProductInput,
    execute: async (product) => auditFormulation(product),
  }),
  defineTool({
    name: "lint_label",
    description: "Check a product label: warning size, contrast, peel-off concealment, drug claims and absolute claims.",
    parameters: z.object({ label: Label, category: Category, product: ProductInput.optional() }),
    execute: async ({ label, category, product }) => lintLabel(label, category, product ? ruleCheck(product).overall : undefined),
  }),
  defineTool({
    name: "design_dupe",
    description: "Design a compliant, legally distinct dupe of the product: ingredient swaps, new invented brand, vessel specs for the 3D stage.",
    parameters: z.object({ product: ProductInput, brief: z.string().optional() }),
    execute: async ({ product, brief }) => designDupe(product, brief),
  }),
  defineTool({
    name: "draft_mocra_report",
    description: "Classify an adverse event log under MoCRA and draft the FDA report packet with its due date.",
    parameters: z.object({ product: ProductInput, adverseEvents: z.string() }),
    execute: async ({ product, adverseEvents }) => draftMocraReport(product, adverseEvents),
  }),
];

import { z } from "zod";

export const JURISDICTIONS = ["US", "CA", "EU"] as const;
export const JURISDICTION_NAMES = { US: "US FDA", CA: "California", EU: "EU" } as const;

export const Jurisdiction = z.enum(JURISDICTIONS);
export type Jurisdiction = z.infer<typeof Jurisdiction>;

export const Verdict = z.enum(["PASS", "VIOLATION", "WARN", "NEEDS_REVIEW"]);
export type Verdict = z.infer<typeof Verdict>;

export const Category = z.enum(["eye-area", "lip", "face-leave-on", "rinse-off", "hair-scalp", "body"]);
export type Category = z.infer<typeof Category>;

export const VesselArchetype = z.enum(["compact", "dropper", "airless-pump"]);
export type VesselArchetype = z.infer<typeof VesselArchetype>;

export const Ingredient = z.object({
  inci: z.string(),
  cas: z.string().optional(),
  ppm: z.number(),
  role: z.string().optional(),
  estimated: z.boolean().optional(),
});
export type Ingredient = z.infer<typeof Ingredient>;

/** Typography fields are optional: a product page shows the claims, not how the warning is printed. */
export const Label = z.object({
  frontClaim: z.string(),
  warningText: z.string().optional(),
  warningPt: z.number().optional(),
  contrast: z.number().optional(),
  hiddenBehindPeel: z.boolean().optional(),
});
export type Label = z.infer<typeof Label>;

export const ProductInput = z.object({
  name: z.string(),
  category: Category,
  vessel: VesselArchetype.optional(),
  ingredients: z.array(Ingredient),
  label: Label.optional(),
  adverseEvents: z.string().optional(),
  sourceUrl: z.string().optional(),
  batch: z.string().optional(),
});
export type ProductInput = z.infer<typeof ProductInput>;

export const Cell = z.object({ verdict: Verdict, citation: z.string(), why: z.string() });
export type Cell = z.infer<typeof Cell>;

const cells = z.object({ US: Cell, CA: Cell, EU: Cell });

export const IngredientVerdict = z.object({
  inci: z.string(),
  ppm: z.number(),
  percent: z.string(),
  role: z.string(),
  verdicts: cells,
  source: z.enum(["rule", "ai", "both"]),
  disagreement: z.string().optional(),
});
export type IngredientVerdict = z.infer<typeof IngredientVerdict>;

export const Overall = z.object({ US: Verdict, CA: Verdict, EU: Verdict });
export type Overall = z.infer<typeof Overall>;

export const AuditResult = z.object({
  product: ProductInput,
  rows: z.array(IngredientVerdict),
  overall: Overall,
  headline: z.string(),
  mode: z.enum(["ai", "rules-only"]).optional(),
});
export type AuditResult = z.infer<typeof AuditResult>;

export const LabelFinding = z.object({
  severity: z.enum(["VIOLATION", "WARN", "OK", "NOTE"]),
  jurisdiction: Jurisdiction,
  title: z.string(),
  citation: z.string(),
  fix: z.string(),
});
export type LabelFinding = z.infer<typeof LabelFinding>;

export const LabelLint = z.object({ findings: z.array(LabelFinding) });
export type LabelLint = z.infer<typeof LabelLint>;

export const Finish = z.enum(["platinum", "gold", "obsidian", "porcelain"]);

export const VesselSpec = z.object({
  archetype: VesselArchetype,
  brandName: z.string(),
  productTitle: z.string(),
  bodyHex: z.string(),
  accentHex: z.string(),
  contentHex: z.string(),
  panHexes: z.array(z.string()).optional(),
  finish: Finish,
  glassFrost: z.number(),
  labelFront: z.string(),
  hiddenWarning: z.string().optional(),
});
export type VesselSpec = z.infer<typeof VesselSpec>;

export const Swap = z.object({ from: z.string(), to: z.string(), reason: z.string(), citation: z.string() });
export type Swap = z.infer<typeof Swap>;

export const DupeResult = z.object({
  original: VesselSpec,
  dupe: VesselSpec,
  swaps: z.array(Swap),
  newClaims: z.array(z.string()),
  dupeOverall: Overall,
  originalOverall: Overall.optional(),
  alreadyCompliant: z.boolean().optional(),
});
export type DupeResult = z.infer<typeof DupeResult>;

export const MocraReport = z.object({ serious: z.boolean(), dueBy: z.string(), markdown: z.string() });
export type MocraReport = z.infer<typeof MocraReport>;

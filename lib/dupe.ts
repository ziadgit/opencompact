import { matchRule, ruleCheck, findDrugWords } from "@/lib/rules";
import type { AuditResult, DupeResult, ProductInput, Swap, VesselArchetype, VesselSpec } from "@/lib/schemas";

const INVENTED_BRANDS = ["Maison Ostra", "Calme Atelier", "Verelle", "Sœur Matin", "Oriel & Fils", "Nacre Studio"];

export function archetypeFor(p: ProductInput): VesselArchetype {
  if (p.vessel) return p.vessel;
  if (p.category === "eye-area" || p.category === "lip") return "compact";
  if (p.category === "hair-scalp") return "dropper";
  return "airless-pump";
}

function splitName(name: string) {
  const [brand, ...rest] = name.split(" ");
  return { brand, title: rest.join(" ") || name };
}

const PALETTES: Record<VesselArchetype, { original: Partial<VesselSpec>; dupe: Partial<VesselSpec> }> = {
  compact: {
    original: { bodyHex: "#1a1717", accentHex: "#d14b8f", contentHex: "#ff3d8b", finish: "obsidian", panHexes: ["#ff2e88", "#ff5a5f", "#e0115f", "#2f3fbf", "#f7c6d9", "#c2185b"] },
    dupe: { bodyHex: "#efe6da", accentHex: "#c9a86a", contentHex: "#b5374a", finish: "porcelain", panHexes: ["#b5374a", "#7b4a8e", "#d77a8f", "#2f3fbf", "#f0d3d0", "#8c2f4c"] },
  },
  dropper: {
    original: { bodyHex: "#8a5a2b", accentHex: "#2b2622", contentHex: "#b88a3e", finish: "obsidian", glassFrost: 0.15 },
    dupe: { bodyHex: "#d8d2c8", accentHex: "#c9a86a", contentHex: "#9b8cc4", finish: "gold", glassFrost: 0.55 },
  },
  "airless-pump": {
    original: { bodyHex: "#e9e4f2", accentHex: "#9aa0b5", contentHex: "#f2eef7", finish: "platinum" },
    dupe: { bodyHex: "#f3ece2", accentHex: "#c9a86a", contentHex: "#f6efe6", finish: "porcelain" },
  },
};

function spec(archetype: VesselArchetype, brandName: string, productTitle: string, labelFront: string, base: Partial<VesselSpec>, hiddenWarning?: string): VesselSpec {
  return {
    archetype,
    brandName,
    productTitle,
    labelFront,
    bodyHex: "#eeeeee",
    accentHex: "#c9a86a",
    contentHex: "#cccccc",
    finish: "porcelain",
    glassFrost: 0.3,
    ...base,
    ...(hiddenWarning ? { hiddenWarning } : {}),
  };
}

function cosmeticClaim(claim: string): string {
  if (!claim) return "";
  let c = claim;
  if (findDrugWords(c).length) c = "LIFTS & SETS THE LOOK OF LASHES AND BROWS";
  return c.replace(/100%\s*NON-TOXIC\s*/i, "").replace(/NON-TOXIC\s*/i, "").replace(/ULTRA-NEON/i, "LUMINOUS").trim();
}

/** Deterministic dupe: rulebook swaps, a fresh invented brand, legible label. AI may enrich it. */
export function deterministicDupe(product: ProductInput, audit: AuditResult = ruleCheck(product), brandSeed = 0): DupeResult {
  const archetype = archetypeFor(product);
  const { brand, title } = splitName(product.name);
  const pal = PALETTES[archetype];
  const label = product.label;

  const swaps: Swap[] = [];
  const ingredients = product.ingredients.flatMap((ing) => {
    const row = audit.rows.find((r) => r.inci === ing.inci);
    const bad = row && Object.values(row.verdicts).some((v) => v.verdict === "VIOLATION" || v.verdict === "NEEDS_REVIEW");
    const rule = matchRule(ing);
    if (!bad || !rule) return [ing];
    const cite = Object.values(row.verdicts).find((v) => v.verdict !== "PASS")?.citation ?? "";
    swaps.push({ from: ing.inci.replace(/\s*\(.*\)$/, "") || ing.inci, to: rule.swap.to, reason: rule.swap.reason, citation: cite });
    if (rule.swap.to.startsWith("Remove")) return [];
    return [{ ...ing, inci: rule.swap.to, cas: undefined }];
  });

  const newClaim = cosmeticClaim(label?.frontClaim ?? title.toUpperCase());
  const dupeProduct: ProductInput = {
    ...product,
    name: `${INVENTED_BRANDS[brandSeed % INVENTED_BRANDS.length]} ${title}`,
    ingredients,
    label: label
      ? { ...label, frontClaim: newClaim, warningPt: Math.max(label.warningPt, 7), contrast: Math.max(label.contrast, 7), hiddenBehindPeel: false }
      : undefined,
  };
  const dupeAudit = ruleCheck(dupeProduct);
  const dupeBrand = INVENTED_BRANDS[brandSeed % INVENTED_BRANDS.length];
  const alreadyCompliant = Object.values(audit.overall).every((v) => v === "PASS");

  return {
    original: spec(archetype, brand, title, label?.frontClaim ?? title, pal.original, label?.hiddenBehindPeel ? label.warningText : undefined),
    dupe: spec(archetype, dupeBrand, alreadyCompliant ? `${title} — Refined` : title, newClaim || title, pal.dupe),
    swaps,
    newClaims: [newClaim, ...(label && (label.hiddenBehindPeel || label.warningPt < 6) ? ["Warning moved to the outer label at 7 pt, 7:1 contrast"] : [])].filter(Boolean),
    dupeOverall: dupeAudit.overall,
    originalOverall: audit.overall,
    alreadyCompliant,
  };
}

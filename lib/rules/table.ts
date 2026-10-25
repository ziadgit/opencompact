import type { Category, Cell, Ingredient, Jurisdiction } from "@/lib/schemas";

export type Rule = {
  id: string;
  name: string;
  aliases: string[];
  cas: string;
  /** Extra matcher for families like "any perfluoro INCI". */
  pattern?: RegExp;
  /** Compliant replacement used by the dupe designer. */
  swap: { to: string; reason: string };
  evaluate: (ctx: { ppm: number; category: Category }) => Record<Jurisdiction, Cell>;
};

const pass = (citation = "No restriction triggered", why = "Permitted at this level for this product type."): Cell => ({
  verdict: "PASS",
  citation,
  why,
});
const violation = (citation: string, why: string): Cell => ({ verdict: "VIOLATION", citation, why });

const isEye = (c: Category) => c === "eye-area";
const isLeaveOn = (c: Category) => c !== "rinse-off";

const CA_PFAS = "Cal. Health & Safety Code §108982 (AB 2771)";
// California's Sherman Law adopts the federal adulteration standard, so an FD&C §601 problem is also a CA problem.
const CA_SHERMAN = "Cal. Health & Safety Code §111670 (Sherman Law, mirrors FD&C Act §601)";

export const RULES: Rule[] = [
  {
    id: "red28",
    name: "D&C Red No. 28",
    aliases: ["d&c red no. 28", "d&c red 28", "red 28", "ci 45410", "phloxine b"],
    cas: "18472-87-2",
    swap: { to: "Carmine (CI 75470)", reason: "Approved by FDA for the eye area; permitted in the EU." },
    evaluate: ({ category }) => ({
      US: isEye(category)
        ? violation("21 CFR §74.2328", "Red No. 28 is not approved for use in the area of the eye.")
        : pass("21 CFR §74.2328"),
      CA: pass(),
      EU: pass("Reg. (EC) 1223/2009 Annex IV (CI 45410)", "Listed colorant; permitted in all product types."),
    }),
  },
  {
    id: "red7",
    name: "D&C Red No. 7",
    aliases: ["d&c red no. 7", "d&c red 7", "red 7", "ci 15850"],
    cas: "5281-04-9",
    swap: { to: "Manganese Violet (CI 77742)", reason: "Approved for the eye area in the US; permitted in the EU." },
    evaluate: ({ category }) => ({
      US: isEye(category)
        ? violation("21 CFR §74.2307", "Red No. 7 is not approved for use in the area of the eye.")
        : pass("21 CFR §74.2307"),
      CA: pass(),
      EU: pass("Reg. (EC) 1223/2009 Annex IV (CI 15850)", "Listed colorant; permitted."),
    }),
  },
  {
    id: "ptfe",
    name: "Polytetrafluoroethylene",
    aliases: ["polytetrafluoroethylene", "ptfe"],
    cas: "9002-84-0",
    swap: { to: "Boron Nitride", reason: "Same soft-focus slip without intentionally added PFAS." },
    evaluate: () => ({
      US: pass(),
      CA: violation(CA_PFAS, "Intentionally added PFAS are banned in cosmetics sold in California from 2025-01-01."),
      EU: pass(),
    }),
  },
  {
    id: "pfas-dimethicone",
    name: "Perfluorononyl Dimethicone",
    aliases: ["perfluorononyl dimethicone"],
    pattern: /perfluoro|polyfluoro/i,
    cas: "259725-95-6",
    swap: { to: "Caprylyl Methicone", reason: "Silicone with similar spreadability, no fluorine chain." },
    evaluate: () => ({
      US: pass(),
      CA: violation(CA_PFAS, "Fluorinated INCI names are intentionally added PFAS, banned in California cosmetics."),
      EU: pass(),
    }),
  },
  {
    id: "d4",
    name: "Cyclotetrasiloxane",
    aliases: ["cyclotetrasiloxane", "d4"],
    cas: "556-67-2",
    swap: { to: "C13-15 Alkane", reason: "Plant-derived volatile emollient with a similar dry-down." },
    evaluate: () => ({
      US: pass(),
      CA: violation("Cal. Health & Safety Code §108980 (AB 2762)", "D4 is on California's list of banned cosmetic ingredients."),
      EU: violation("Reg. (EC) 1223/2009 Annex II; Reg. (EU) 2024/1328", "D4 is prohibited in cosmetic products."),
    }),
  },
  {
    id: "d5",
    name: "Cyclopentasiloxane",
    aliases: ["cyclopentasiloxane", "d5"],
    cas: "541-02-6",
    swap: { to: "C13-15 Alkane", reason: "Volatile emollient with the same weightless finish, no siloxane limit." },
    evaluate: ({ ppm, category }) => ({
      US: pass(),
      CA: pass(),
      EU:
        isLeaveOn(category) && ppm > 1000
          ? violation("Reg. (EU) 2024/1328", "D5 is limited to 0.1% (1,000 ppm) in leave-on products.")
          : pass("Reg. (EU) 2024/1328", "Within the 0.1% limit, or rinse-off."),
    }),
  },
  {
    id: "mit",
    name: "Methylisothiazolinone",
    aliases: ["methylisothiazolinone", "mit"],
    cas: "2682-20-4",
    swap: { to: "Phenoxyethanol + Ethylhexylglycerin", reason: "Broad-spectrum preservative allowed in leave-on products." },
    evaluate: ({ ppm, category }) => ({
      US: pass(),
      CA: pass(),
      EU: isLeaveOn(category)
        ? violation("Reg. (EC) 1223/2009 Annex V, entry 57", "MIT is not allowed in leave-on products.")
        : ppm > 15
          ? violation("Reg. (EC) 1223/2009 Annex V, entry 57", "Rinse-off products are capped at 15 ppm.")
          : pass("Reg. (EC) 1223/2009 Annex V, entry 57", "Rinse-off, at or under 15 ppm."),
    }),
  },
  {
    id: "tga",
    name: "Thioglycolic Acid",
    aliases: ["thioglycolic acid", "tga"],
    cas: "68-11-1",
    swap: { to: "Cysteamine HCl (rinse-off kit only)", reason: "Milder reducing agent, sold as a salon rinse-off step." },
    evaluate: ({ ppm, category }) => {
      const bad = (isEye(category) && isLeaveOn(category)) || ppm > 20000;
      return {
        US: bad
          ? violation("FD&C Act §601 (adulteration)", "A strong reducing agent left on near the eyes may be injurious under normal use.")
          : pass(),
        CA: bad ? violation(CA_SHERMAN, "California adopts the federal adulteration standard.") : pass(),
        EU: bad
          ? violation("Reg. (EC) 1223/2009 Annex III, entry 2a", "Eyelash use is professional-only and capped; this exceeds the limits.")
          : pass("Reg. (EC) 1223/2009 Annex III, entry 2a"),
      };
    },
  },
  {
    id: "ppd",
    name: "p-Phenylenediamine",
    aliases: ["p-phenylenediamine", "phenylenediamine", "ppd"],
    cas: "106-50-3",
    swap: { to: "Remove (contamination source)", reason: "PPD has no place in an eye-area product; clean the filling line." },
    evaluate: ({ category }) => ({
      US: isEye(category)
        ? violation("FD&C Act §601(a)", "The coal-tar hair dye exemption excludes use on eyelashes or eyebrows.")
        : pass("FD&C Act §601(a)"),
      CA: isEye(category) ? violation(CA_SHERMAN, "California adopts the federal adulteration standard.") : pass(),
      EU: isEye(category)
        ? violation("Reg. (EC) 1223/2009 Annex III", "PPD is restricted to oxidative hair dye products.")
        : pass("Reg. (EC) 1223/2009 Annex III"),
    }),
  },
  {
    id: "av43",
    name: "Acid Violet 43",
    aliases: ["ci 60730", "acid violet 43", "ext. d&c violet no. 2", "ext d&c violet 2"],
    cas: "4430-18-6",
    swap: { to: "CI 60730 at ≤ 5,000 ppm", reason: "Keep the toner, stay under the EU hair-product limit." },
    evaluate: ({ ppm }) => ({
      US: pass("21 CFR §74.2602a", "Approved for externally applied cosmetics."),
      CA: pass(),
      EU:
        ppm > 5000
          ? violation("Reg. (EC) 1223/2009 Annex IV (CI 60730)", "Hair products are capped at 0.5% (5,000 ppm).")
          : pass("Reg. (EC) 1223/2009 Annex IV (CI 60730)", "Under the 0.5% hair-product limit."),
    }),
  },
];

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Match an ingredient to a rule by INCI, CI number, CAS or alias (case-insensitive, whole words). */
export function matchRule(ing: Pick<Ingredient, "inci" | "cas">): Rule | undefined {
  const text = norm(ing.inci);
  return RULES.find((r) => {
    if (ing.cas && ing.cas.trim() === r.cas) return true;
    if (text.includes(r.cas)) return true;
    if (r.pattern?.test(text)) return true;
    return r.aliases.some((a) => new RegExp(`(^|[^a-z0-9])${escape(a)}($|[^a-z0-9])`).test(text));
  });
}

/** The rules table as plain text, for prompts. */
export function rulesAsText(): string {
  return RULES.map((r) => `- ${r.name} (aliases: ${r.aliases.join(", ")}; CAS ${r.cas}). Compliant swap: ${r.swap.to}.`).join("\n");
}

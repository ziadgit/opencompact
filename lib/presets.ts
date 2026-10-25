import type { ProductInput } from "@/lib/schemas";

export type Preset = { id: string; chip: string; product: ProductInput };

export const PRESETS: Preset[] = [
  {
    id: "neon-palette",
    chip: "Neon Eye Palette",
    product: {
      name: "Lumière Neon Eye Palette",
      category: "eye-area",
      vessel: "compact",
      ingredients: [
        { inci: "Talc", ppm: 440000, role: "filler" },
        { inci: "CI 45410 (D&C Red No. 28 Aluminum Lake)", ppm: 18500, role: "colorant" },
        { inci: "CI 15850 (D&C Red No. 7 Calcium Lake)", ppm: 9400, role: "colorant" },
        { inci: "CI 77510 (Ferric Ferrocyanide)", ppm: 14000, role: "colorant" },
        { inci: "Synthetic Fluorphlogopite", ppm: 210000, role: "pearl base" },
      ],
      label: {
        frontClaim: "ULTRA-NEON EYE & ARTISTRY COMPACT PALETTE",
        warningText: "CONTAINS COLOR ADDITIVES NOT APPROVED BY THE US FDA FOR USE IN THE IMMEDIATE EYE AREA.",
        warningPt: 3.5,
        contrast: 1.8,
        hiddenBehindPeel: true,
      },
    },
  },
  {
    id: "pfas-primer",
    chip: "Blur Primer",
    product: {
      name: "Vellum Blur Primer",
      category: "face-leave-on",
      vessel: "airless-pump",
      ingredients: [
        { inci: "PTFE", ppm: 1000, role: "slip agent" },
        { inci: "Perfluorononyl Dimethicone", ppm: 250, role: "film former" },
        { inci: "Cyclopentasiloxane (D5)", ppm: 45000, role: "volatile emollient" },
        { inci: "Niacinamide", ppm: 30000, role: "skin conditioner" },
      ],
      label: {
        frontClaim: "100% NON-TOXIC PORELESS BLURRING PRIMER",
        warningText: "Avoid contact with eyes. Discontinue use if irritation occurs.",
        warningPt: 6.5,
        contrast: 4.8,
        hiddenBehindPeel: false,
      },
    },
  },
  {
    id: "lash-serum",
    chip: "Lash Serum (adverse events)",
    product: {
      name: "Arcadia Lash Lamination Serum",
      category: "eye-area",
      vessel: "dropper",
      batch: "OC-2026-884B",
      ingredients: [
        { inci: "Thioglycolic Acid", ppm: 48000, role: "reducing agent" },
        { inci: "Methylisothiazolinone", ppm: 180, role: "preservative" },
        { inci: "p-Phenylenediamine (trace)", ppm: 420, role: "contaminant" },
        { inci: "Hydrolyzed Keratin", ppm: 25000, role: "conditioner" },
      ],
      label: {
        frontClaim: "PERMANENT FOLLICLE RECONSTRUCTION & BROW LAMINATION",
        warningText: "For professional use. Avoid contact with eyes. Perform a patch test 48 hours before use.",
        warningPt: 4.5,
        contrast: 2.4,
        hiddenBehindPeel: true,
      },
      adverseEvents: [
        "[AE-1091 2026-10-23] 42yo female, NY. Applied serum batch OC-2026-884B at 6:30 PM; within 3h severe bilateral periorbital swelling, blistering, chemical conjunctivitis. ER visit 10:15 PM: IV steroids, eye irrigation, ophthalmology consult.",
        "[AE-1094 2026-10-24] 56yo female, CA. Burning, weeping dermatitis, localized brow hair shedding within 12h. Urgent care, oral prednisone.",
        "[QC-884B 2026-10-24] Retain sample pH 11.4 (spec 8.2–8.8), thioglycolic acid 48,000 ppm, MIT 180 ppm, PPD 420 ppm from shared filling line.",
      ].join("\n"),
    },
  },
  {
    id: "silver-toner",
    chip: "Silver Toner",
    product: {
      name: "Argentea Silver Hair Toning Elixir",
      category: "hair-scalp",
      vessel: "dropper",
      ingredients: [
        { inci: "CI 60730 (Acid Violet 43)", ppm: 1200, role: "toning colorant" },
        { inci: "Biotinoyl Tripeptide-1", ppm: 500, role: "conditioner" },
        { inci: "Niacinamide", ppm: 20000, role: "scalp conditioner" },
        { inci: "Panthenol", ppm: 15000, role: "humectant" },
      ],
      label: {
        frontClaim: "AMPLIFY NATURALLY SILVER, GRAY & WHITE HAIR",
        warningText: "For external use only. Avoid contact with eyes.",
        warningPt: 7.5,
        contrast: 7.4,
        hiddenBehindPeel: false,
      },
    },
  },
];

/** The chat message a preset chip sends. Includes the full structured product so the agent can audit it directly. */
export function presetMessage(p: Preset): string {
  const { product } = p;
  const lines = [
    `Audit this product: ${product.name}`,
    `Category: ${product.category}${product.vessel ? `, vessel: ${product.vessel}` : ""}${product.batch ? `, batch ${product.batch}` : ""}`,
    `Ingredients (ppm): ${product.ingredients.map((i) => `${i.inci} ${i.ppm}`).join("; ")}`,
  ];
  if (product.label) {
    const l = product.label;
    lines.push(
      `Label: front "${l.frontClaim}"; warning "${l.warningText}" at ${l.warningPt} pt, contrast ${l.contrast}:1${l.hiddenBehindPeel ? ", hidden behind a peel-off layer" : ", visible"}`,
    );
  }
  if (product.adverseEvents) lines.push(`Adverse event log:\n${product.adverseEvents}`);
  lines.push(`[preset:${p.id}]`);
  return lines.join("\n");
}

export function findPresetInText(text: string): Preset | undefined {
  const id = text.match(/\[preset:([a-z-]+)\]/)?.[1];
  return PRESETS.find((p) => p.id === id);
}

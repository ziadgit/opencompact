import { deterministicDupe } from "@/lib/dupe";
import { PRESETS } from "@/lib/presets";
import type { DupeResult } from "@/lib/schemas";

/** Hard-coded sample (P1 Neon Eye Palette) so /about works without AI. */
export const DEMO_DUPE: DupeResult = {
  ...deterministicDupe(PRESETS[0].product),
  newClaims: ["LUMINOUS EYE & ARTISTRY COMPACT PALETTE", "Eye-safe pigments, legible warnings"],
};
DEMO_DUPE.dupe = { ...DEMO_DUPE.dupe, brandName: "Maison Ostra", productTitle: "Luminous Eye Compact" };

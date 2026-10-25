import type { Category, Ingredient, ProductInput } from "@/lib/schemas";

function guessCategory(t: string): Category {
  if (/\b(eye|lash|brow|mascara|liner|shadow)/i.test(t)) return "eye-area";
  if (/\b(lip|gloss)/i.test(t)) return "lip";
  if (/\b(shampoo|cleanser|wash|rinse)/i.test(t)) return "rinse-off";
  if (/\b(hair|scalp|toner)/i.test(t)) return "hair-scalp";
  if (/\b(body|lotion)/i.test(t)) return "body";
  return "face-leave-on";
}

/** Best-effort offline parser for a pasted ingredient list (rules-only mode). */
export function parseIngredientText(text: string): ProductInput | null {
  const body = text.replace(/^.*ingredients?\s*:?/i, "");
  const parts = body.split(/[,;\n]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 80);
  if (parts.length < 2) return null;
  const ingredients: Ingredient[] = parts.map((p, i) => {
    const pct = p.match(/([\d.]+)\s*%/);
    const ppm = p.match(/([\d,]+)\s*ppm/i);
    const inci = p.replace(/\(?[\d.,]+\s*(%|ppm)\)?/i, "").trim();
    const value = pct ? parseFloat(pct[1]) * 10000 : ppm ? parseInt(ppm[1].replace(/,/g, ""), 10) : Math.round(200000 / (i + 1));
    return { inci, ppm: value, estimated: !pct && !ppm };
  });
  return { name: "Your product", category: guessCategory(text), ingredients };
}

/**
 * Rules-as-code generation: one Gemini 4 Argon call turns the official EU Annex V table
 * into a TypeScript module of `Rule`s. Usage: npx tsx scripts/gen-annex-v.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const annex = JSON.parse(readFileSync("data/eu-annex-v/annex-v.json", "utf8"));
const ruleType = readFileSync("lib/rules/table.ts", "utf8").split("export const RULES")[0];

const prompt = `You are converting a regulation table into executable TypeScript.

Here is the existing rule interface and helpers (from lib/rules/table.ts):
\`\`\`ts
${ruleType}
\`\`\`

Here is the official EU Cosmetics Regulation (EC) 1223/2009 Annex V (allowed preservatives), as JSON from the EU CosIng database:
${JSON.stringify(annex.entries)}

Write ONE complete TypeScript module, lib/rules/generated/eu-annex-v.ts, that:
- starts with: import type { Category, Cell, Jurisdiction } from "@/lib/schemas"; and import type { Rule } from "@/lib/rules/table";
- defines its own small helpers (pass, violation, isLeaveOn = category !== "rinse-off") — do not import helpers from table.ts
- exports const EU_ANNEX_V_RULES: Rule[] with one Rule per real entry (skip entries that are empty or "Moved or deleted")
- id: "eu-v-<ref>"; name: the INCI or chemical name; aliases: lowercase INCI name, chemical name, common salts named in the entry; cas: first CAS number or ""
- evaluate({ ppm, category }): US and CA always pass("No specific rule found", "Not on the OpenCompact US/California list."). EU: compare ppm (1% = 10,000 ppm) to the Annex V maximum concentration for the product type implied by category. When the table gives different limits by product type (a/b/c, rinse-off vs leave-on, oral, spray), map: rinse-off category -> rinse-off limit; every other category -> leave-on limit; if a type is not allowed for that category, it is a VIOLATION at any ppm. If the limit is stated "as acid"/"as phenol"/"of Hg", compare ppm directly.
- citation for EU: "Reg. (EC) 1223/2009 Annex V, entry <ref>"; why: one plain sentence stating the limit that applies.
- swap: { to: "Reduce to the Annex V limit or use Phenoxyethanol", reason: "<short>" } (Phenoxyethanol entry itself: swap to "Sodium Benzoate").
Return only the TypeScript code, no Markdown fences, no commentary.`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const t0 = Date.now();
const res = await ai.models.generateContent({ model: "gemini-4-argon", contents: prompt, config: { temperature: 0.1 } });
const code = (res.text ?? "").replace(/^```(?:ts|typescript)?\s*/i, "").replace(/\s*```\s*$/, "");
writeFileSync("lib/rules/generated/eu-annex-v.ts", code + "\n");
const u = res.usageMetadata;
const stats = { seconds: (Date.now() - t0) / 1000, inputTokens: u?.promptTokenCount, outputTokens: u?.candidatesTokenCount, thoughtTokens: u?.thoughtsTokenCount, lines: code.split("\n").length };
writeFileSync("data/eu-annex-v/generation-stats.json", JSON.stringify(stats, null, 1));
console.log(stats);

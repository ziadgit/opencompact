/**
 * Scores systems on test cases derived mechanically from the official EU Annex V table.
 *   A. hand-written rulebook (lib/rules/table.ts)
 *   B. Argon-generated rulebook (lib/rules/generated/eu-annex-v.ts, shipped in the app)
 *   D. Haiku-generated rulebook (lib/rules/generated/eu-annex-v.haiku.ts, if `rules:gen` was run)
 *   C. Claude Haiku 5.5 answering each case directly, no rule code (how the app's AI audit works today)
 * The v1 run with Argon answering directly is kept in data/eu-annex-v/eval-results.argon.json.
 * Usage: npx tsx scripts/eval-annex-v.mts [--no-direct]
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { RULES, matchRule, type Rule } from "../lib/rules/table";
import { EU_ANNEX_V_RULES } from "../lib/rules/generated/eu-annex-v";
import type { Category } from "../lib/schemas";

type Entry = { ref: string; inciName: string; chemicalName: string; casNo: string; productTypeBodyParts: string; maximumConcentration: string };
type Case = { id: string; ref: string; inci: string; cas?: string; ppm: number; category: Category; expected: "PASS" | "VIOLATION"; why: string };

const annex: { entries: Entry[] } = JSON.parse(readFileSync("data/eu-annex-v/annex-v.json", "utf8"));

// Only entries whose official limit is a single, unambiguous percentage become test cases.
function buildCases(): Case[] {
  const cases: Case[] = [];
  for (const e of annex.entries) {
    const text = `${e.maximumConcentration} ${e.productTypeBodyParts}`.toLowerCase();
    const pcts = e.maximumConcentration.match(/\d+(?:[.,]\d+)?\s*%/g) ?? [];
    if (pcts.length !== 1 || /\b[a-c]\)/.test(e.maximumConcentration)) continue;
    const limitPpm = parseFloat(pcts[0].replace(",", ".")) * 10000;
    const inci = (e.inciName || e.chemicalName).split(" | ")[0];
    const cas = e.casNo.split(/[ /|]+/).find((c) => /^\d+-\d+-\d$/.test(c));
    const rinseOnly = /rinse-off/.test(text) && !/leave-on/.test(text);
    const cat: Category = rinseOnly ? "rinse-off" : "face-leave-on";
    cases.push({ id: `${e.ref}-below`, ref: e.ref, inci, cas, ppm: Math.round(limitPpm * 0.5), category: cat, expected: "PASS", why: `half of ${pcts[0]}` });
    cases.push({ id: `${e.ref}-above`, ref: e.ref, inci, cas, ppm: Math.round(limitPpm * 2), category: cat, expected: "VIOLATION", why: `double ${pcts[0]}` });
    if (rinseOnly) cases.push({ id: `${e.ref}-leaveon`, ref: e.ref, inci, cas, ppm: Math.round(limitPpm * 0.5), category: "face-leave-on", expected: "VIOLATION", why: "rinse-off only, used leave-on" });
  }
  return cases;
}

function ruleVerdict(rules: Rule[], c: Case) {
  const rule = matchRule({ inci: c.inci, cas: c.cas }, rules);
  if (!rule) return { verdict: "PASS" as const, covered: false };
  const v = rule.evaluate({ ppm: c.ppm, category: c.category }).EU.verdict;
  return { verdict: v === "VIOLATION" ? ("VIOLATION" as const) : ("PASS" as const), covered: true };
}

async function directVerdicts(cases: Case[]) {
  const { llmJSON } = await import("../lib/agent/llm");
  const schema = z.object({ answers: z.array(z.object({ id: z.string(), EU: z.enum(["PASS", "VIOLATION"]) })) });
  const out = await llmJSON(
    `For each case, is this preservative at this concentration allowed in the EU for this product type? Answer PASS or VIOLATION for EU only.\n${JSON.stringify(cases.map(({ id, inci, cas, ppm, category }) => ({ id, inci, cas, ppm, percent: `${ppm / 10000}%`, category })))}`,
    schema,
    { system: "You are an EU cosmetics regulatory analyst. Use your knowledge of Regulation (EC) 1223/2009." },
  );
  return new Map(out.answers.map((a) => [a.id, a.EU]));
}

function score(name: string, verdicts: { verdict: "PASS" | "VIOLATION"; covered?: boolean }[], cases: Case[]) {
  const correct = verdicts.filter((v, i) => v.verdict === cases[i].expected).length;
  const violations = cases.filter((c) => c.expected === "VIOLATION").length;
  const missed = verdicts.filter((v, i) => cases[i].expected === "VIOLATION" && v.verdict === "PASS").length;
  const covered = verdicts.filter((v) => v.covered).length;
  return {
    system: name,
    accuracy: +(correct / cases.length).toFixed(3),
    correct,
    cases: cases.length,
    violationsCaught: `${violations - missed}/${violations}`,
    coverage: verdicts[0]?.covered === undefined ? "n/a" : `${covered}/${cases.length}`,
  };
}

const cases = buildCases();
const A = cases.map((c) => ruleVerdict(RULES, c));
const B = cases.map((c) => ruleVerdict(EU_ANNEX_V_RULES, c));
const results = [score("A. Hand-written rulebook (10 rules)", A, cases), score(`B. Argon-generated rulebook (${EU_ANNEX_V_RULES.length} rules)`, B, cases)];

const HAIKU_RULES = "../lib/rules/generated/eu-annex-v.haiku.ts";
if (existsSync(new URL(HAIKU_RULES, import.meta.url))) {
  const { EU_ANNEX_V_RULES: haiku } = (await import(HAIKU_RULES)) as { EU_ANNEX_V_RULES: Rule[] };
  results.push(score(`D. Haiku-generated rulebook (${haiku.length} rules)`, cases.map((c) => ruleVerdict(haiku, c)), cases));
}

if (!process.argv.includes("--no-direct")) {
  try {
    const d = await directVerdicts(cases);
    results.push(score("C. Claude Haiku 5.5 direct, no rule code", cases.map((c) => ({ verdict: d.get(c.id) ?? "PASS" })), cases));
  } catch (e) {
    console.warn("direct baseline failed:", (e as Error).message.slice(0, 120));
  }
}

const misses = cases.filter((c, i) => B[i].verdict !== c.expected).map((c, i) => ({ ...c, got: B[cases.indexOf(c)].verdict, i }));
console.table(results);
console.log(`B errors (${misses.length}):`, misses.map((m) => `${m.id} ${m.inci} ${m.ppm}ppm ${m.category} expected ${m.expected}`));
writeFileSync("data/eu-annex-v/eval-results.json", JSON.stringify({ cases: cases.length, results, bErrors: misses }, null, 1));

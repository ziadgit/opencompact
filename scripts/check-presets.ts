import { PRESETS } from "../lib/presets";
import { ruleCheck } from "../lib/rules";
import type { Overall } from "../lib/schemas";

const EXPECTED: Record<string, Overall> = {
  "neon-palette": { US: "VIOLATION", CA: "PASS", EU: "PASS" },
  "pfas-primer": { US: "PASS", CA: "VIOLATION", EU: "VIOLATION" },
  "lash-serum": { US: "VIOLATION", CA: "VIOLATION", EU: "VIOLATION" },
  "silver-toner": { US: "PASS", CA: "PASS", EU: "PASS" },
};

let failed = 0;
for (const p of PRESETS) {
  const r = ruleCheck(p.product);
  const exp = EXPECTED[p.id];
  const ok = (["US", "CA", "EU"] as const).every((j) => r.overall[j] === exp[j]);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${p.id.padEnd(14)} US=${r.overall.US} CA=${r.overall.CA} EU=${r.overall.EU}`);
  for (const row of r.rows) {
    console.log(`        ${row.inci.padEnd(44)} ${row.verdicts.US.verdict.padEnd(10)} ${row.verdicts.CA.verdict.padEnd(10)} ${row.verdicts.EU.verdict}`);
  }
  console.log(`        → ${r.headline}`);
}
process.exit(failed ? 1 : 0);

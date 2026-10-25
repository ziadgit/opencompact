# OpenCompact — Build Spec

> **Pitch:** Paste a beauty product (link, ingredient list, or a question). An AI agent tells you whether it can legally be sold in the **US (FDA)**, **California**, and the **EU**, explains why with citations, and designs a **compliant "dupe"** you can inspect in 3D next to the original.

Audience: indie beauty founders, cosmetic chemists, packaging designers. Every result is a **draft, not legal advice**.

Time budget: **75 minutes total**, unattended. Read `CLAUDE.md` for operating rules.

---

## 1. Stack (versions verified on npm 2026-10-25 — do not re-research)

| Package | Version | Notes |
|---|---|---|
| `next` | 16.x | App Router, TypeScript, `src/` dir NOT used |
| `tailwindcss` | v4 | via `create-next-app` defaults |
| `@copilotkit/runtime` | 1.80.0 | **use the v2 API: `@copilotkit/runtime/v2`** |
| `@copilotkit/react-core` | 1.80.0 | **use `@copilotkit/react-core/v2`** |
| `@copilotkit/react-ui` | 1.80.0 | only if v2 `CopilotChat` from react-core/v2 is insufficient |
| `@google/genai` | 2.31.x | direct structured-output calls inside server tools |
| `zod` | latest 3.x/4.x | tool parameter schemas (Standard Schema) |
| `three` | 0.186.x | |
| `@react-three/fiber` | 9.8.x | |
| `@react-three/drei` | latest compatible with fiber 9 | |
| `motion` | latest | scroll reveals on /about (optional) |

Scaffold: `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes` (the dir already contains spec files; if it refuses a non-empty dir, scaffold into `./_scaffold` and move contents up).

### Model: Google Gemini 4 Argon
- Model id: **`gemini-4-argon`**. In CopilotKit's BuiltInAgent the specifier is **`"google/gemini-4-argon"`**.
- GA on Gemini API since 2026-10-13. 1M-token context, 65K output. Supports function calling, **structured outputs** (`responseMimeType: "application/json"` + `responseSchema`), **URL context** tool (`tools: [{ urlContext: {} }]`), Search grounding, thinking levels low/medium/high.
- Key: `process.env.GEMINI_API_KEY` (in `.env.local`, never committed).

### CopilotKit v2 — verified exports (1.80.0)
Server, from `@copilotkit/runtime/v2`:
- `CopilotRuntime`, `BuiltInAgent`, `defineTool`, `createCopilotRuntimeHandler`
- `BuiltInAgent` classic config: `{ model: "google/gemini-4-argon", apiKey, prompt, tools, maxSteps, temperature, providerOptions }`
- `defineTool({ name, description, parameters /* zod */, execute: async (args) => result })`
- `createCopilotRuntimeHandler({ runtime, basePath?, mode? })` returns `(req: Request) => Promise<Response>` — ideal for Next route handlers.

Client, from `@copilotkit/react-core/v2`:
- `CopilotKitProvider` (or `CopilotKit`), `CopilotChat`, `CopilotChatView`, `CopilotChatInput`, `CopilotChatMessageView`
- Hooks: `useAgent`, `useFrontendTool`, `useRenderTool`, `useComponent`, `useConfigureSuggestions`, `useAgentContext`, `useHumanInTheLoop`, `useDefaultRenderTool`

**Do NOT use** the v1 `GoogleGenerativeAIAdapter` / `copilotRuntimeNextJSAppRouterEndpoint` — deprecated since 1.68.2.

If any signature differs from above, read `node_modules/@copilotkit/runtime/dist/v2/index.d.mts`, `node_modules/@copilotkit/runtime/dist/agent/index.d.mts`, and `node_modules/@copilotkit/react-core/dist/*.d.mts`. Do not web-search unless types are unreadable.

Expected route shape (adjust to real types):

```ts
// app/api/copilotkit/[[...slug]]/route.ts
import { CopilotRuntime, BuiltInAgent, createCopilotRuntimeHandler } from "@copilotkit/runtime/v2";
import { tools } from "@/lib/agent/tools";
import { SYSTEM_PROMPT } from "@/lib/agent/prompt";

const agent = new BuiltInAgent({
  model: "google/gemini-4-argon",
  apiKey: process.env.GEMINI_API_KEY,
  prompt: SYSTEM_PROMPT,
  tools,
  maxSteps: 8,
});
const runtime = new CopilotRuntime({ agents: { default: agent } });
const handler = createCopilotRuntimeHandler({ runtime, basePath: "/api/copilotkit" });
export const POST = (req: Request) => handler(req);
export const GET = (req: Request) => handler(req);
```

---

## 2. Rules table (the trust layer) — `lib/rules/`

Hard-coded, deterministic. Used two ways: (a) injected into tool prompts, (b) `crosscheck()` compares AI verdicts to these and flags disagreements as **NEEDS_REVIEW**.

Match ingredients case-insensitively by INCI name, CI number, CAS, or alias.

| id | Ingredient (aliases) | CAS | US FDA | California | EU | Condition |
|---|---|---|---|---|---|---|
| red28 | D&C Red No. 28, CI 45410, Phloxine B | 18472-87-2 | VIOLATION | PASS | PASS | if product is eye-area. Cite 21 CFR §74.2328 (not approved for eye area); EU Annex IV entry for CI 45410 permits |
| red7 | D&C Red No. 7, CI 15850 | 5281-04-9 | VIOLATION | PASS | PASS | if eye-area. 21 CFR §74.2307; EU Annex IV permits |
| ptfe | Polytetrafluoroethylene, PTFE | 9002-84-0 | PASS | VIOLATION | PASS | any amount. Cal. Health & Safety Code §108982 (AB 2771: intentionally added PFAS banned from 2025-01-01) |
| pfas-dimethicone | Perfluorononyl Dimethicone (any "perfluoro"/"polyfluoro" INCI) | 259725-95-6 | PASS | VIOLATION | PASS | any amount. Same CA cite |
| d4 | Cyclotetrasiloxane, D4 | 556-67-2 | PASS | VIOLATION | VIOLATION | CA AB 2762 §108980; EU Annex II / Reg. (EU) 2024/1328 |
| d5 | Cyclopentasiloxane, D5 | 541-02-6 | PASS | PASS | VIOLATION | if leave-on and > 1,000 ppm (0.1%). Reg. (EU) 2024/1328 |
| mit | Methylisothiazolinone, MIT | 2682-20-4 | PASS | PASS | VIOLATION | if leave-on (any amount); rinse-off max 15 ppm. EU Annex V entry 57 |
| tga | Thioglycolic Acid | 68-11-1 | VIOLATION | PASS | VIOLATION | if leave-on eye/brow consumer use, or > 20,000 ppm. EU Annex III entry 2a; US: adulteration risk FD&C Act §601 — mark US verdict NEEDS_REVIEW-able |
| ppd | p-Phenylenediamine, PPD | 106-50-3 | VIOLATION | PASS | VIOLATION | if used near eyes/brows. FD&C Act §601(a) coal-tar exemption excludes eye-area use; EU Annex III restricts to oxidative hair dye |
| av43 | CI 60730, Acid Violet 43, Ext. D&C Violet No. 2 | 4430-18-6 | PASS | PASS | PASS | if ≤ 5,000 ppm in hair product; VIOLATION in EU above. EU Annex IV; 21 CFR §74.2602a (externally applied) |

**Label rules** (`lib/rules/label.ts`):
- Mandatory warning font size **≥ 6.0 pt** → else VIOLATION (US, 21 CFR §701.2 prominence & conspicuousness).
- Contrast ratio **≥ 4.5:1** → else VIOLATION (same cite).
- Warning hidden behind peel-off layer → VIOLATION (21 CFR §701.2, §740.10).
- Drug-claim boundary (FD&C Act §201(g)(1)): claims containing "permanent", "reconstruct", "regrow", "reverse hair loss", "follicle", "cure", "treat" → VIOLATION (US) and flag EU (Reg. 655/2013 claims criteria).
- "Non-toxic" / "100% clean" absolute claims alongside a VIOLATION ingredient → WARN.

**MoCRA rule:** adverse event involving ER visit, hospitalization, significant disfigurement, persistent rash/alopecia, or eye injury → **Serious Adverse Event**: report to FDA within **15 business days** (21 U.S.C. §364a, MoCRA §605).

Unknown ingredients not in the table: trust the AI verdict but tag `source: "ai"`; table-matched rows get `source: "rule"`. If AI and rule disagree → overall row `NEEDS_REVIEW`, show both.

---

## 3. Demo presets — `lib/presets.ts` (inputs only; results always live)

Rename brands to fictional names. These double as **acceptance tests**.

### P1 "Neon Eye Palette" — `neon-palette`
- Category: eye-area, vessel `compact`
- Ingredients (ppm): Talc 440000; CI 45410 (D&C Red No. 28 Aluminum Lake) 18500; CI 15850 (D&C Red No. 7 Calcium Lake) 9400; CI 77510 (Ferric Ferrocyanide) 14000; Synthetic Fluorphlogopite 210000
- Label: front "ULTRA-NEON EYE & ARTISTRY COMPACT PALETTE"; warning "CONTAINS COLOR ADDITIVES NOT APPROVED BY THE US FDA FOR USE IN THE IMMEDIATE EYE AREA." at 3.5 pt, contrast 1.8, **behind peel-off layer**
- **Expected:** US **VIOLATION** (Red 28, Red 7, label), CA PASS, EU PASS (ingredients). Dupe swaps Red 28/Red 7 → Carmine CI 75470 / Manganese Violet CI 77742.

### P2 "Blur Primer" — `pfas-primer`
- Category: leave-on face, vessel `airless-pump`
- Ingredients: PTFE 1000; Perfluorononyl Dimethicone 250; Cyclopentasiloxane (D5) 45000; Niacinamide 30000
- Label: front "100% NON-TOXIC PORELESS BLURRING PRIMER"; warning 6.5 pt, contrast 4.8, not hidden
- **Expected:** US PASS, CA **VIOLATION** (PTFE, PFAS), EU **VIOLATION** (D5 > 0.1% leave-on). "Non-toxic" claim WARN. Dupe swaps PTFE → Boron Nitride; PFAS dimethicone → Caprylyl Methicone; D5 → C13-15 Alkane.

### P3 "Lash Lamination Serum" (adverse events) — `lash-serum`
- Category: eye-area leave-on, vessel `dropper`, batch `OC-2026-884B`
- Ingredients: Thioglycolic Acid 48000; Methylisothiazolinone 180; p-Phenylenediamine (trace) 420; Hydrolyzed Keratin 25000
- Label: front "PERMANENT FOLLICLE RECONSTRUCTION & BROW LAMINATION"; warning 4.5 pt, contrast 2.4, behind peel-off
- Adverse event log (paste verbatim into preset):
  > [AE-1091 2026-10-23] 42yo female, NY. Applied serum batch OC-2026-884B at 6:30 PM; within 3h severe bilateral periorbital swelling, blistering, chemical conjunctivitis. ER visit 10:15 PM: IV steroids, eye irrigation, ophthalmology consult.
  > [AE-1094 2026-10-24] 56yo female, CA. Burning, weeping dermatitis, localized brow hair shedding within 12h. Urgent care, oral prednisone.
  > [QC-884B 2026-10-24] Retain sample pH 11.4 (spec 8.2–8.8), thioglycolic acid 48,000 ppm, MIT 180 ppm, PPD 420 ppm from shared filling line.
- **Expected:** US, CA, EU all **VIOLATION**; drug claim flagged; **MoCRA SAE: yes, due within 15 business days**.

### P4 "Silver Hair Toning Elixir" — `silver-toner` (the clean benchmark)
- Category: hair/scalp leave-on, vessel `dropper`
- Ingredients: CI 60730 (Acid Violet 43) 1200; Biotinoyl Tripeptide-1 500; Niacinamide 20000; Panthenol 15000
- Label: "AMPLIFY NATURALLY SILVER, GRAY & WHITE HAIR"; warning 7.5 pt, contrast 7.4, visible
- **Expected:** **PASS** everywhere. Dupe step says "already compliant" and offers a refined variant only.

---

## 4. Data contracts — `lib/schemas.ts` (zod; derive TS types)

```ts
type Jurisdiction = "US" | "CA" | "EU";
type Verdict = "PASS" | "VIOLATION" | "WARN" | "NEEDS_REVIEW";

ProductInput { name, category: "eye-area"|"lip"|"face-leave-on"|"rinse-off"|"hair-scalp"|"body", vessel?: VesselArchetype,
  ingredients: { inci: string; cas?: string; ppm: number; role?: string }[],
  label?: { frontClaim: string; warningText: string; warningPt: number; contrast: number; hiddenBehindPeel: boolean },
  adverseEvents?: string, sourceUrl?: string }

IngredientVerdict { inci, ppm, percent: string, role, verdicts: Record<Jurisdiction, { verdict: Verdict; citation: string; why: string }>, source: "rule"|"ai"|"both", disagreement?: string }

AuditResult { product: ProductInput, rows: IngredientVerdict[], overall: Record<Jurisdiction, Verdict>, headline: string /* one plain-English sentence */ }

LabelLint { findings: { severity: "VIOLATION"|"WARN"|"OK"; jurisdiction: Jurisdiction; title; citation; fix }[] }

VesselArchetype = "compact" | "dropper" | "airless-pump"
VesselSpec { archetype, brandName, productTitle, bodyHex, accentHex, contentHex, panHexes?: string[] /* compact only, 4–9 */, finish: "platinum"|"gold"|"obsidian"|"porcelain", glassFrost: number /*0..1*/, labelFront: string, hiddenWarning?: string }

DupeResult { original: VesselSpec, dupe: VesselSpec, swaps: { from: string; to: string; reason: string; citation: string }[], newClaims: string[], dupeOverall: Record<Jurisdiction, Verdict> }

MocraReport { serious: boolean, dueBy: string /* ISO date, +15 business days */, markdown: string }
```

---

## 5. Agent tools — `lib/agent/tools.ts`

All server tools via `defineTool`. Tools that need strict JSON call `@google/genai` directly:

```ts
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
await ai.models.generateContent({ model: "gemini-4-argon", contents, config: { responseMimeType: "application/json", responseSchema, temperature: 0.2, systemInstruction } });
```

Convert zod → Gemini schema with `z.toJSONSchema()` (zod 4) or hand-write `Type.*` schemas — whichever compiles first. Keep one helper `lib/agent/argon.ts` → `argonJSON<T>(prompt, schema, opts?)`.

| Tool | Params | Does | Returns |
|---|---|---|---|
| `read_product_url` | `{ url }` | Argon with `tools: [{ urlContext: {} }]` to read the real page; extract name, category, INCI list (estimate ppm if absent and mark `estimated`), front claims, vessel archetype. | `ProductInput` |
| `audit_formulation` | `ProductInput` | Run `ruleCheck()` first; then Argon with rules table in system prompt; then `crosscheck()`. | `AuditResult` |
| `lint_label` | `{ label, category }` | Deterministic label rules + Argon for drug/fear claims. | `LabelLint` |
| `design_dupe` | `{ product: ProductInput, audit: AuditResult, brief?: string }` | Argon designs a legally distinct compliant variant: new invented brand name (never reuse real brand), swaps from rules table, positive non-drug claims, two `VesselSpec`s. Re-run `ruleCheck()` on dupe ingredients to fill `dupeOverall`. | `DupeResult` |
| `draft_mocra_report` | `{ product, adverseEvents }` | Classify serious; compute due date (+15 business days, skip weekends); Argon writes Markdown packet (patient summary anonymized, timeline, suspected cause, follow-up questions). | `MocraReport` |

**System prompt** (`lib/agent/prompt.ts`), essentials:
- You are OpenCompact, a calm, precise cosmetics-compliance analyst. Plain language, short sentences.
- Input routing: URL → `read_product_url` then `audit_formulation`. Ingredient list → parse into `ProductInput` then `audit_formulation`. If a label is present also `lint_label`. If adverse events present also `draft_mocra_report`. After any audit with a VIOLATION, call `design_dupe` automatically. If all PASS, offer it.
- Never invent citations; use the rules table citations or say "no specific rule found".
- End with one-sentence bottom line + "Draft, not legal advice."

**No-key behavior:** if `GEMINI_API_KEY` missing, route returns a friendly 503 JSON `{ error: "Add GEMINI_API_KEY to .env.local" }` and the UI shows a calm banner. `ruleCheck()` still works offline: add a fallback path where the UI can run the deterministic audit for presets without AI (label it "Rules-only mode").

---

## 6. `/` — minimalist agentic entry

Feel: a quiet perfumery counter. Almost nothing on screen until you ask.

- Ivory canvas (`--bg`), centered column max 720px.
- Top-left wordmark "OpenCompact" (serif, small). Top-right link "About".
- Headline (display serif, ~56px desktop / 36px mobile): **"Is it legal to sell?"**
- Sub (muted, 16px): "Paste a product link, an ingredient list, or a question. Checked against US FDA, California and EU rules."
- One large input (pill, 64px tall, subtle inner shadow), submit with ↵. Supports multi-line paste.
- Four preset chips below in muted small caps: Neon Eye Palette · Blur Primer · Lash Serum (adverse events) · Silver Toner. Register them with `useConfigureSuggestions` and/or render as buttons that send the preset as a message.
- On first message: headline fades up and away, input docks to bottom, conversation appears as an editorial column (assistant text in serif 18px, user text in sans, right-aligned muted).

**Generative UI** — register renderers with `useRenderTool` (or `useComponent`) keyed by tool name:
- *In-progress* state for any tool: a single hairline progress bar + italic step label ("Reading the product page…", "Checking EU Annex III…", "Designing a compliant dupe…").
- `audit_formulation` → **Verdict Matrix card**: headline sentence; three jurisdiction pills (US / California / EU) with verdict color; table of ingredients × 3 columns; each cell a dot + word; click/tap a cell to expand citation + why; `NEEDS_REVIEW` cells amber with "AI and rulebook disagree" note; small `source` tag (rule / ai).
- `lint_label` → **Label card**: list of findings with severity glyph, citation, suggested fix.
- `design_dupe` → **Dupe Stage** (section 7) embedded full-width (breaks out of the column to 1100px) + swap list beneath.
- `draft_mocra_report` → **Report card**: "Serious adverse event — file by {date}" banner, rendered Markdown, Copy and Download .md buttons.

Use v2 `CopilotChat` with custom slots/`className`s if it can be themed enough; otherwise build the view from `useAgent` + `CopilotChatMessageView` + own input. Prioritize looking exquisite over using the stock chat chrome.

---

## 7. The 3D Dupe Stage — `components/dupe3d/`

My take on the "3D duper": **original and dupe face each other on a studio plinth; the illegal ingredients physically leave the original and transform into their safe replacements in the dupe.**

Canvas: R3F `<Canvas dpr={[1,2]} frameloop="demand" shadows camera={{ fov: 30 }}>`; call `invalidate()` during animations. Height 520px desktop, 440px mobile.

Scene:
- Background matches page `--bg`; drei `<Environment preset="studio" />` (or `city` toned down), `<ContactShadows opacity={0.35} blur={2.5} />`, soft key light.
- Two plinths (short cylinders, porcelain material) at x = ±1.6. Labels under each in HTML (`<Html>`): "Original" / "Dupe — {brandName}".
- Gentle turntable (0.15 rad/s) when idle; `<OrbitControls enablePan={false} minPolarAngle maxPolarAngle />` limited. Disable orbit on touch devices; stack vertically (y offset) when viewport < 640px.

Procedural vessels — `Vessel.tsx` switches on `archetype`, all from `VesselSpec`:
- **compact**: rounded cylinder base + hinged lid (lid opened ~110° to show pans); pans = shallow cylinders in a grid colored `panHexes`; mirror inside lid (`MeshReflectorMaterial` or high-metalness plane). Finish → metalness/roughness/clearcoat presets.
- **dropper**: `LatheGeometry` bottle profile; glass `MeshPhysicalMaterial({ transmission: 1, thickness: 0.6, roughness: glassFrost*0.5, ior: 1.5 })`; inner liquid lathe slightly smaller with `contentHex`; metallic collar; rubber bulb (sphere-capped cylinder).
- **airless-pump**: tall rounded cylinder body, pump head + nozzle, accent collar.
- **Label**: plane wrapped on front with `CanvasTexture` rendering `brandName` / `productTitle` in the page's fonts.

Interactions (UI overlaid with small glass buttons/slider at stage bottom):
1. **"Dupe it" button** — the hero moment. Each flagged ingredient = a cluster of ~40 instanced spheres (`InstancedMesh`) glowing oxblood inside/around the original. On click, clusters lift, travel along a bezier arc over the gap (1.6s, ease-in-out, staggered), color-lerp to green/gold, and settle inside the dupe. Hovering a cluster (or its legend chip) shows `<Html>` tooltip: "PTFE → Boron Nitride · CA H&S Code §108982".
2. **Peel slider** (0–100%) — if `hiddenWarning`, the original's front label curls back (bend the label plane's vertices around a moving cylinder axis in a small custom vertex shader or by updating geometry positions on change), revealing the warning text underneath in tiny, low-contrast type with a pulsing amber outline. Dupe has no hidden warning; its label is printed legibly.
3. **Verdict halos** — thin torus on each plinth's top edge, three arc segments (US / CA / EU) colored by verdict. Original likely red segments; dupe green.
4. **Before/after toggle** on mobile: show one vessel at a time with a crossfade.

Performance: geometries memoized; `frameloop="demand"`; no postprocessing required (optional subtle `Bloom` only if time permits). Must not crash without WebGL: fallback to a static SVG silhouette + swap list.

---

## 8. `/about` — maximalist, beautiful, clear

Feel: a luxury beauty editorial meets a policy explainer. Big type, rich color blocks, generous imagery made from our own 3D and type (no stock photos needed).

Sections (each full-bleed, alternating palettes):
1. **Hero** — live Dupe Stage running a looping auto demo (P1 data, hard-coded `DupeResult` sample in `lib/demo.ts` so it works without AI). Oversized serif: **"Three rulebooks. One answer."** Sub: "OpenCompact checks your cosmetics against US FDA, California and EU rules — then designs a version that passes all three." CTA: "Try it" → `/`.
2. **Marquee strip** — endlessly scrolling ingredient names, banned ones struck through in oxblood (PTFE, Red 28, D4, MIT…), safe ones in sage.
3. **The problem** — "The same eyeshadow can be legal in Paris and illegal in New York." Three tall cards side by side (US / California / EU) showing Red 28 → ✕ / ✓ / ✓ and PTFE → ✓ / ✕ / ✓. Plain explanation: rules disagree; small brands can't afford consultants.
4. **How it works** — four huge numerals 01–04 with one-line steps: Read the product → Check three rulebooks → Cross-check AI against hard rules → Design the dupe.
5. **The three rulebooks** — three color-blocked panels (US navy, California poppy, EU cobalt) each with 3 real example rules and citations from §2.
6. **The dupe** — before/after diptych with swap list typography ("PTFE → Boron Nitride").
7. **When something goes wrong** — the 15-business-day MoCRA report, explained in two sentences with a mock report preview.
8. **Who it's for** — founders, chemists, packaging designers (three portrait-style type cards).
9. **Honesty** — "What it is, and isn't": AI drafts + deterministic rulebook cross-check; disagreements are flagged, never hidden; not legal advice.
10. **FAQ** — 5 questions, accordion.
11. **Closing CTA** — giant "Is it legal to sell?" linking to `/`, footer with model credit "Reasoning by Google Gemini 4 Argon · Agent by CopilotKit".

Motion: scroll-reveal (fade/translate 24px), marquee, numerals parallax. Respect `prefers-reduced-motion`. **No horizontal scroll at 375px.**

---

## 9. Design tokens — `app/globals.css`

Fonts via `next/font/google`: display **Instrument Serif** (fallback Fraunces), text **Inter**, mono **JetBrains Mono** (citations).

```css
:root {
  --bg: #F6F1EA;        /* ivory */
  --ink: #1C1A17;
  --muted: #7A736A;
  --line: #E4DCD1;
  --card: #FBF8F4;
  --pass: #5E7B5A;      /* sage */
  --violation: #8E2A2A; /* oxblood */
  --review: #B7832F;    /* amber */
  --accent: #C9A86A;    /* champagne gold */
  --us: #1F2A44; --ca: #D9572B; --eu: #2443A6;
}
@media (prefers-color-scheme: dark) { :root {
  --bg: #121110; --ink: #EFE9E1; --muted: #9A928A; --line: #2A2724; --card: #1A1817;
  --pass: #8DB187; --violation: #D06A62; --review: #E0AE5A; --accent: #D8BD85;
}}
```

Radii 14–24px, hairline borders `--line`, shadows very soft. Verdict colors always paired with a word/glyph (accessibility).

---

## 10. Milestones (priority order, commit after each)

| # | Budget | Deliverable | Done when |
|---|---|---|---|
| M1 | 10 min | Scaffold, deps, fonts/tokens, CopilotKit v2 route + provider, Argon hello | `npm run build` passes; with key, chat replies |
| M2 | 15 min | `lib/rules`, `lib/schemas`, `lib/presets`, `argon.ts`, `audit_formulation`, `crosscheck`, `ruleCheck` | `npx tsx scripts/check-presets.ts` prints rule-only verdicts matching §3 expectations for all 4 presets |
| M3 | 12 min | `/` entry + chat + Verdict Matrix generative UI + progress states + no-key banner | Preset chip → matrix renders |
| M4 | 15 min | Dupe Stage (3 vessels, Dupe-it particles, peel slider, halos) + `design_dupe` + `lib/demo.ts` sample | Stage renders demo data; build passes |
| M5 | 12 min | `/about` all sections | Renders; no h-scroll at 375px |
| M6 | 6 min | `read_product_url`, `lint_label` + Label card | URL tool returns ingredients for a real page |
| M7 | 5 min | `draft_mocra_report` + Report card (stretch), README, final polish | build + lint clean |

If behind schedule: skip M7 report, simplify peel to a crossfade, simplify particles to color-changing ingredient chips orbiting each vessel. Never skip M1–M5.

## 11. Acceptance checklist
- [ ] `npm run build` and `npm run lint` pass.
- [ ] `scripts/check-presets.ts` (rules-only) matches §3 expectations for P1–P4.
- [ ] With key: each preset chip yields a matrix whose overall verdicts match §3 (NEEDS_REVIEW acceptable only where rules and AI disagree, and it is shown).
- [ ] Dupe stage: "Dupe it" animates; peel reveals hidden warning on P1; halos reflect verdicts.
- [ ] `/about` complete, gorgeous, no horizontal scroll at 375px, works in dark mode.
- [ ] Without key: no crash; banner + rules-only mode for presets.
- [ ] `.env.local` not committed. README explains setup in 5 lines.

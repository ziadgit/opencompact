# OpenCompact

Paste a beauty product (link, ingredient list, or question). An AI agent tells you whether it can be sold in the **US (FDA)**, **California** and the **EU**, explains why with citations, and designs a **compliant dupe** you can inspect in 3D next to the original. Every result is a draft, not legal advice.

## Setup
1. `npm install`
2. `cp .env.example .env.local` and set `GEMINI_API_KEY` (model: `gemini-4-argon`).
3. `npm run dev` → http://localhost:3000 (and `/about`).
4. No key? The app runs in **rules-only mode**: presets and pasted INCI lists are checked by the deterministic rulebook.
5. Check the rulebook: `npx tsx scripts/check-presets.ts`. Note: a `GEMINI_API_KEY` exported in your shell overrides `.env.local` (`unset GEMINI_API_KEY` if it is a different key).

## Architecture
- **Agent**: CopilotKit v2 `BuiltInAgent` (`google/gemini-4-argon`) served by `createCopilotRuntimeHandler` at `app/api/copilotkit/[[...slug]]`; five server tools in `lib/agent/tools.ts` (`read_product_url`, `audit_formulation`, `lint_label`, `design_dupe`, `draft_mocra_report`).
- **Structured AI**: tools call Argon directly via `@google/genai` (`lib/agent/argon.ts`) with JSON schemas from zod 4, plus URL context for product pages.
- **Trust layer**: `lib/rules/` is a hard-coded rulebook (ingredients, label, MoCRA). `crosscheck()` compares AI verdicts to it and marks disagreements `NEEDS_REVIEW`; every tool falls back to the rulebook if Argon fails.
- **UI**: `/` is a custom chat on `useAgent` with generative UI registered via `useRenderTool` (verdict matrix, label card, dupe stage, MoCRA report). `/about` is a static editorial page with a looping demo.
- **3D**: `components/dupe3d/` — React Three Fiber stage with procedural compact / dropper / airless-pump vessels, instanced “Dupe it” particles, a peelable label, verdict halos and an SVG fallback without WebGL.

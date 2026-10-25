# CLAUDE.md — operating rules for the unattended build

You are building the app in `SPEC.md` in one unattended run (`--dangerously-skip-permissions`). Hard budget: **75 minutes**.

## Rules
1. **Never ask the user questions.** When something is ambiguous, choose the sensible default, append a one-line entry to `DECISIONS.md`, and continue.
2. **Work milestones M1→M7 in order** (SPEC §10). Commit after each milestone: `git add -A && git commit -m "M<n>: <summary>"`. Push after each commit (`git push`), ignore push failures.
3. **Respect per-milestone budgets.** If a milestone runs > 1.5× its budget, ship the simpler fallback described in SPEC §10 and move on. M1–M5 are mandatory.
4. **Run `npm run build` before every commit.** Fix errors before committing. Don't commit a broken build unless the budget is exhausted (then note it in `DECISIONS.md`).
5. **Never commit secrets.** `.env.local` stays local. Read the key from `process.env.GEMINI_API_KEY` only on the server.
6. **API truth comes from installed types**, not memory: when a CopilotKit or `@google/genai` call doesn't type-check, read the `.d.mts` files in `node_modules` (paths in SPEC §1). Avoid web searches unless types are unreadable.
7. **Model is fixed:** `gemini-4-argon` (`"google/gemini-4-argon"` in BuiltInAgent). Don't substitute another model. If the key is missing, the app must still build and run in rules-only mode.
8. **Design bar is high.** `/` is minimal and quiet; `/about` is maximal and editorial. Use the tokens in SPEC §9. No default-looking Tailwind UI, no emoji icons, no stock imagery.
9. Keep code plain and readable; small components; no over-abstraction. No tests framework needed beyond `scripts/check-presets.ts`.
10. Don't run long-lived dev servers in the foreground. To smoke test: `npm run build && (npm run start -- -p 3123 &) ; sleep 6; curl -s localhost:3123 | head -c 400; curl -s localhost:3123/about | head -c 400`, then kill the server.
11. At the end: update `README.md` (what it is, setup in 5 lines, architecture in 5 bullets), make a final commit "Final polish", push, and print a short summary of what shipped, what was skipped, and anything in `DECISIONS.md`.

## Commands
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Rules-only preset check: `npx tsx scripts/check-presets.ts`

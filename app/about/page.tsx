import type { Metadata } from "next";
import Link from "next/link";
import { HeroStage, Numeral, Reveal } from "@/components/about/Motion";
import { DEMO_DUPE } from "@/lib/demo";

export const metadata: Metadata = {
  title: "About — OpenCompact",
  description: "Three rulebooks. One answer. How OpenCompact checks cosmetics against US FDA, California and EU rules.",
};

const MARQUEE: { name: string; banned: boolean }[] = [
  { name: "PTFE", banned: true },
  { name: "Niacinamide", banned: false },
  { name: "D&C Red No. 28", banned: true },
  { name: "Carmine", banned: false },
  { name: "Cyclotetrasiloxane", banned: true },
  { name: "Boron Nitride", banned: false },
  { name: "Methylisothiazolinone", banned: true },
  { name: "Panthenol", banned: false },
  { name: "Perfluorononyl Dimethicone", banned: true },
  { name: "Caprylyl Methicone", banned: false },
  { name: "D&C Red No. 7", banned: true },
  { name: "Manganese Violet", banned: false },
  { name: "Thioglycolic Acid", banned: true },
  { name: "C13-15 Alkane", banned: false },
];

const RULEBOOKS = [
  {
    j: "US FDA",
    bg: "#1F2A44",
    accent: "#C9A86A",
    note: "Color additives are approved area by area. Labels must be legible. Claims decide whether you sell a cosmetic or a drug.",
    rules: [
      ["D&C Red No. 28 is not approved for the eye area", "21 CFR §74.2328"],
      ["Mandatory warnings must be prominent and conspicuous", "21 CFR §701.2"],
      ["“Regrow”, “cure”, “permanent” make it a drug", "FD&C Act §201(g)(1)"],
    ],
  },
  {
    j: "California",
    bg: "#D9572B",
    accent: "#1C1A17",
    note: "California bans by ingredient family — and enforces on its own, on top of federal law.",
    rules: [
      ["Intentionally added PFAS banned from 2025", "Cal. H&S Code §108982"],
      ["D4 is on the banned ingredient list", "Cal. H&S Code §108980"],
      ["Federal adulteration standard applies too", "Cal. H&S Code §111670"],
    ],
  },
  {
    j: "European Union",
    bg: "#2443A6",
    accent: "#F6F1EA",
    note: "The EU works from annexes: what is prohibited, what is restricted, and at what concentration.",
    rules: [
      ["D5 capped at 0.1% in leave-on products", "Reg. (EU) 2024/1328"],
      ["MIT not allowed in leave-on products", "Annex V, entry 57"],
      ["Acid Violet 43 limited to 0.5% in hair products", "Annex IV, CI 60730"],
    ],
  },
];

const FAQ = [
  ["Is this legal advice?", "No. Every result is a draft for a qualified regulatory professional to confirm. OpenCompact helps you find problems early and ask better questions."],
  ["Where do the citations come from?", "From a hard-coded rulebook of real rules — CFR sections, California Health & Safety Code, EU Annexes. The AI may only cite those, or say no specific rule was found."],
  ["What happens when the AI and the rulebook disagree?", "The cell turns amber and says NEEDS REVIEW, with both opinions shown. Disagreements are surfaced, never silently resolved."],
  ["Does it work without an API key?", "Yes. Without a Gemini key the app runs in rules-only mode: presets and pasted ingredient lists are checked deterministically, and the dupe is designed from rulebook swaps."],
  ["Is the dupe a copy?", "No. It is a legally distinct product: a newly invented brand name, compliant ingredient swaps and positive, cosmetic-only claims. It never reuses a real brand."],
];

export default function About() {
  return (
    <div className="overflow-x-hidden">
      {/* 1. Hero */}
      <section className="relative px-4 pb-16 pt-6 sm:px-8">
        <header className="mx-auto flex max-w-[1240px] items-center justify-between">
          <Link href="/" className="font-serif text-[20px] text-ink">
            OpenCompact
          </Link>
          <Link href="/" className="rounded-full border border-line px-4 py-1.5 text-[14px] text-ink transition-colors hover:bg-ink hover:text-bg">
            Try it
          </Link>
        </header>
        <div className="mx-auto mt-14 max-w-[1240px] sm:mt-20">
          <Reveal>
            <p className="smallcaps text-[14px] text-muted">Cosmetics compliance · US · California · EU</p>
            <h1 className="mt-4 font-serif text-[64px] leading-[0.9] tracking-[-0.02em] text-ink sm:text-[128px] lg:text-[168px]">
              Three rulebooks.
              <br />
              <em className="text-[var(--accent)]">One answer.</em>
            </h1>
          </Reveal>
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
            <Reveal delay={0.1}>
              <HeroStage />
            </Reveal>
            <Reveal delay={0.2}>
              <p className="font-serif text-[24px] leading-[1.25] text-ink sm:text-[28px]">
                OpenCompact checks your cosmetics against US FDA, California and EU rules — then designs a version that passes all three.
              </p>
              <Link href="/" className="mt-6 inline-flex items-center gap-3 rounded-full bg-ink px-6 py-3.5 text-[15px] text-bg">
                Try it <span aria-hidden>→</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 2. Marquee */}
      <section aria-label="Ingredients" className="overflow-hidden border-y border-[#2a2724] bg-[#1C1A17] py-5 text-[#F6F1EA]">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap font-serif text-[34px] sm:text-[44px]">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className={m.banned ? "text-[#D06A62] line-through decoration-2" : "text-[#8DB187]"} aria-hidden={i >= MARQUEE.length}>
              {m.name}
              <span className="ml-10 text-[#C9A86A]">✦</span>
            </span>
          ))}
        </div>
      </section>

      {/* 3. The problem */}
      <section className="px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <p className="smallcaps text-[14px] text-muted">The problem</p>
            <h2 className="mt-4 max-w-[980px] font-serif text-[44px] leading-[1] text-ink sm:text-[80px]">
              The same eyeshadow can be legal in Paris and illegal in New York.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              { j: "US FDA", c: "var(--us)", red: false, ptfe: true },
              { j: "California", c: "var(--ca)", red: true, ptfe: false },
              { j: "EU", c: "var(--eu)", red: true, ptfe: true },
            ].map((col, i) => (
              <Reveal key={col.j} delay={i * 0.08}>
                <div className="flex min-h-[380px] flex-col justify-between rounded-[24px] p-7 text-[#F6F1EA]" style={{ background: col.c }}>
                  <div className="smallcaps text-[15px] opacity-80">{col.j}</div>
                  <div className="space-y-6">
                    <Verdictline name="Red 28, eye shadow" ok={col.red} />
                    <Verdictline name="PTFE, face primer" ok={col.ptfe} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-10 max-w-[720px] text-[18px] leading-relaxed text-muted">
              The rules disagree with each other, change every year, and live in three different legal systems. Big brands pay regulatory consultants. Small brands find out from a recall notice.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 4. How it works */}
      <section className="bg-[#EFE5D6] px-4 py-24 text-[#1C1A17] sm:px-8 sm:py-32 dark:bg-[#1A1714] dark:text-[#EFE9E1]">
        <div className="mx-auto max-w-[1240px]">
          <p className="smallcaps text-[14px] opacity-60">How it works</p>
          <div className="mt-10 grid gap-x-10 gap-y-14 sm:grid-cols-2">
            {[
              ["01", "Read the product", "Paste a link, an INCI list or a label. Gemini reads the real page."],
              ["02", "Check three rulebooks", "Every ingredient against US FDA, California and EU rules, with citations."],
              ["03", "Cross-check AI against hard rules", "A deterministic rulebook audits the AI. Disagreements turn amber."],
              ["04", "Design the dupe", "Compliant swaps, a new brand, and a 3D vessel you can inspect."],
            ].map(([n, t, d]) => (
              <div key={n} className="border-t border-current/20 pt-4">
                <Numeral n={n} />
                <h3 className="mt-8 font-serif text-[32px] leading-tight sm:text-[40px]">{t}</h3>
                <p className="mt-2 max-w-[420px] text-[16px] leading-relaxed opacity-70">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. The three rulebooks */}
      <section aria-label="The three rulebooks">
        {RULEBOOKS.map((r) => (
          <div key={r.j} className="px-4 py-20 text-[#F6F1EA] sm:px-8 sm:py-28" style={{ background: r.bg }}>
            <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[1fr_1.3fr]">
              <Reveal>
                <h2 className="font-serif text-[56px] leading-[0.95] sm:text-[96px]">{r.j}</h2>
                <p className="mt-5 max-w-[420px] text-[17px] leading-relaxed opacity-85">{r.note}</p>
              </Reveal>
              <ol className="space-y-0">
                {r.rules.map(([rule, cite], i) => (
                  <Reveal key={cite} delay={i * 0.06}>
                    <li className="border-t border-white/25 py-6">
                      <p className="font-serif text-[26px] leading-tight sm:text-[32px]">{rule}</p>
                      <p className="mt-2 font-mono text-[13px]" style={{ color: r.accent }}>
                        {cite}
                      </p>
                    </li>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </section>

      {/* 6. The dupe */}
      <section className="px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <p className="smallcaps text-[14px] text-muted">The dupe</p>
            <h2 className="mt-4 font-serif text-[44px] leading-[1] text-ink sm:text-[80px]">Same look. Every rulebook.</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <Diptych title="Before" name="Lumière Neon Eye Palette" tone="var(--violation)" hexes={DEMO_DUPE.original.panHexes ?? []} verdict="Fails US FDA · eye-area colorants, hidden warning" />
            <Diptych title="After" name={`${DEMO_DUPE.dupe.brandName} ${DEMO_DUPE.dupe.productTitle}`} tone="var(--pass)" hexes={DEMO_DUPE.dupe.panHexes ?? []} verdict="Passes US · California · EU" />
          </div>
          <div className="mt-14 space-y-2">
            {[
              ["PTFE", "Boron Nitride"],
              ["D&C Red No. 28", "Carmine"],
              ["Cyclopentasiloxane", "C13-15 Alkane"],
              ["Perfluorononyl Dimethicone", "Caprylyl Methicone"],
            ].map(([a, b], i) => (
              <Reveal key={a} delay={i * 0.05}>
                <p className="font-serif text-[30px] leading-tight text-ink sm:text-[56px]">
                  <span className="text-[var(--violation)] line-through decoration-2">{a}</span> <span className="text-muted">→</span> <span>{b}</span>
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 7. When something goes wrong */}
      <section className="bg-[#8E2A2A] px-4 py-24 text-[#F6F1EA] sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="smallcaps text-[14px] opacity-70">When something goes wrong</p>
            <h2 className="mt-4 font-serif text-[64px] leading-[0.95] sm:text-[112px]">15 business days.</h2>
            <p className="mt-6 max-w-[480px] text-[18px] leading-relaxed opacity-90">
              Under MoCRA, a serious adverse event — an ER visit, an eye injury, hair loss — must be reported to the FDA within 15 business days. OpenCompact classifies the event, counts the days and drafts the packet.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rotate-[-1.5deg] rounded-[20px] bg-[#FBF8F4] p-6 text-[#1C1A17] shadow-2xl sm:p-8">
              <div className="smallcaps text-[13px] text-[#8E2A2A]">Serious adverse event</div>
              <p className="mt-1 font-serif text-[28px] leading-tight">File with FDA by Friday, November 13, 2026</p>
              <div className="mt-5 space-y-2 border-t border-[#E4DCD1] pt-4 text-[14px] leading-relaxed">
                <p className="font-serif text-[19px]">Timeline</p>
                <p>— Adult consumer, NY. Periorbital swelling and chemical conjunctivitis within 3 h. ER visit.</p>
                <p>— Adult consumer, CA. Weeping dermatitis, localized brow hair shedding.</p>
                <p className="font-serif text-[19px]">Suspected cause</p>
                <p>— Thioglycolic acid at 4.8%, pH 11.4 against spec 8.2–8.8.</p>
              </div>
              <p className="mt-4 font-mono text-[11px] text-[#7A736A]">21 U.S.C. §364a · MoCRA §605</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8. Who it's for */}
      <section className="px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1240px]">
          <p className="smallcaps text-[14px] text-muted">Who it’s for</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Indie founders", "Launch in three markets without three consultants.", "#C9A86A", "F"],
              ["Cosmetic chemists", "See every restriction, with its citation, before the stability test.", "#5E7B5A", "C"],
              ["Packaging designers", "Warnings that are legible, visible, and still beautiful.", "#2443A6", "P"],
            ].map(([who, line, c, letter], i) => (
              <Reveal key={who} delay={i * 0.08}>
                <div className="relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-[24px] p-7 text-[#F6F1EA]" style={{ background: c }}>
                  <span aria-hidden className="absolute -right-6 -top-10 font-serif text-[300px] leading-none opacity-20">
                    {letter}
                  </span>
                  <h3 className="relative font-serif text-[40px] leading-none">{who}</h3>
                  <p className="relative mt-3 text-[16px] leading-relaxed opacity-90">{line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Honesty */}
      <section className="border-y border-line bg-card px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-2">
          <Reveal>
            <h2 className="font-serif text-[44px] leading-[1] text-ink sm:text-[72px]">What it is, and isn’t.</h2>
          </Reveal>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <div className="smallcaps text-[14px] text-[var(--pass)]">It is</div>
              <ul className="mt-3 space-y-3 font-serif text-[22px] leading-snug text-ink">
                <li>AI drafts, cross-checked against a deterministic rulebook.</li>
                <li>Every verdict paired with a citation.</li>
                <li>Disagreements flagged, never hidden.</li>
              </ul>
            </div>
            <div>
              <div className="smallcaps text-[14px] text-[var(--violation)]">It isn’t</div>
              <ul className="mt-3 space-y-3 font-serif text-[22px] leading-snug text-ink">
                <li>Legal advice.</li>
                <li>A complete regulatory database.</li>
                <li>A substitute for a safety assessor.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section className="px-4 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[880px]">
          <p className="smallcaps text-[14px] text-muted">Questions</p>
          <div className="mt-6">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-t border-line py-5 last:border-b">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-[24px] leading-snug text-ink sm:text-[30px]">
                  {q}
                  <span aria-hidden className="shrink-0 text-[24px] text-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[680px] text-[16px] leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Closing */}
      <section className="bg-[#1C1A17] px-4 pb-10 pt-24 text-[#F6F1EA] sm:px-8 sm:pt-36">
        <div className="mx-auto max-w-[1240px]">
          <Link href="/" className="group block">
            <h2 className="font-serif text-[64px] leading-[0.9] tracking-[-0.02em] sm:text-[150px]">
              Is it legal <br className="hidden sm:block" />
              to <em className="text-[#C9A86A] transition-colors group-hover:text-[#F6F1EA]">sell?</em>
            </h2>
            <span className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#F6F1EA] px-6 py-3.5 text-[15px] text-[#1C1A17]">
              Check a product <span aria-hidden>→</span>
            </span>
          </Link>
          <footer className="mt-24 flex flex-col justify-between gap-3 border-t border-white/15 pt-6 text-[13px] text-white/60 sm:flex-row">
            <span>Reasoning by Google Gemini 4 Argon · Agent by CopilotKit</span>
            <span>Drafts, not legal advice.</span>
          </footer>
        </div>
      </section>
    </div>
  );
}

function Verdictline({ name, ok }: { name: string; ok: boolean }) {
  return (
    <div className="flex items-end justify-between gap-4 border-t border-white/25 pt-4">
      <span className="font-serif text-[24px] leading-tight">{name}</span>
      <span className="flex items-center gap-2 font-serif text-[56px] leading-none">
        <span aria-hidden>{ok ? "✓" : "✕"}</span>
        <span className="sr-only">{ok ? "allowed" : "not allowed"}</span>
      </span>
    </div>
  );
}

function Diptych({ title, name, tone, hexes, verdict }: { title: string; name: string; tone: string; hexes: string[]; verdict: string }) {
  return (
    <Reveal>
      <div className="rounded-[24px] border border-line bg-card p-7">
        <div className="smallcaps text-[13px]" style={{ color: tone }}>
          {title}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {hexes.slice(0, 6).map((h, i) => (
            <div key={i} className="aspect-square rounded-full shadow-[inset_0_-6px_12px_rgb(0_0_0/0.18)]" style={{ background: h }} />
          ))}
        </div>
        <p className="mt-6 font-serif text-[28px] leading-tight text-ink">{name}</p>
        <p className="mt-1 text-[14px]" style={{ color: tone }}>
          {verdict}
        </p>
      </div>
    </Reveal>
  );
}

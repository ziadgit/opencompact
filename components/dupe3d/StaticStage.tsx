import type { DupeResult, VesselSpec } from "@/lib/schemas";

function Silhouette({ spec }: { spec: VesselSpec }) {
  if (spec.archetype === "compact")
    return (
      <svg viewBox="0 0 120 120" className="h-36 w-36" aria-hidden>
        <ellipse cx="60" cy="40" rx="46" ry="14" fill={spec.bodyHex} opacity="0.9" />
        <rect x="14" y="70" width="92" height="16" rx="8" fill={spec.bodyHex} />
        <ellipse cx="60" cy="70" rx="46" ry="12" fill={spec.accentHex} />
      </svg>
    );
  if (spec.archetype === "dropper")
    return (
      <svg viewBox="0 0 120 160" className="h-40 w-32" aria-hidden>
        <rect x="53" y="10" width="14" height="26" rx="7" fill="#2b2622" />
        <rect x="48" y="34" width="24" height="12" fill={spec.accentHex} />
        <path d="M52 46h16l14 14v86a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6V60z" fill={spec.bodyHex} opacity="0.6" />
        <path d="M42 90h36v52H42z" fill={spec.contentHex} opacity="0.7" />
      </svg>
    );
  return (
    <svg viewBox="0 0 120 170" className="h-40 w-28" aria-hidden>
      <rect x="46" y="8" width="28" height="18" rx="4" fill={spec.bodyHex} />
      <rect x="72" y="12" width="20" height="5" rx="2" fill={spec.accentHex} />
      <rect x="34" y="26" width="52" height="8" fill={spec.accentHex} />
      <rect x="36" y="34" width="48" height="128" rx="10" fill={spec.bodyHex} stroke="var(--line)" />
    </svg>
  );
}

/** No-WebGL fallback: flat silhouettes and the swap list. */
export function StaticStage({ dupe, className = "" }: { dupe: DupeResult; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-6 rounded-[24px] border border-line bg-card p-6 ${className}`}>
      <div className="flex items-end justify-center gap-10">
        <figure className="text-center">
          <Silhouette spec={dupe.original} />
          <figcaption className="smallcaps mt-2 text-[12px] text-muted">Original</figcaption>
        </figure>
        <figure className="text-center">
          <Silhouette spec={dupe.dupe} />
          <figcaption className="smallcaps mt-2 text-[12px] text-muted">Dupe — {dupe.dupe.brandName}</figcaption>
        </figure>
      </div>
      <p className="text-[12px] text-muted">3D preview needs WebGL.</p>
    </div>
  );
}

"use client";

import type { DupeResult } from "@/lib/schemas";

export default function DupeStage({ dupe }: { dupe: DupeResult }) {
  return <div className="h-[440px] rounded-[24px] border border-line sm:h-[520px]">{dupe.dupe.brandName}</div>;
}

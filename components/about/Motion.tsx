"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { MotionConfig, motion, useScroll, useTransform } from "motion/react";
import { DEMO_DUPE } from "@/lib/demo";

const DupeStage = dynamic(() => import("@/components/dupe3d/DupeStage"), {
  ssr: false,
  loading: () => <div className="h-[440px] sm:h-[560px]" />,
});

export function HeroStage() {
  return <DupeStage dupe={DEMO_DUPE} autoPlay height="h-[440px] sm:h-[560px]" />;
}

export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

export function Numeral({ n }: { n: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);
  return (
    <MotionConfig reducedMotion="user">
      <motion.div ref={ref} style={{ y }} className="font-serif text-[96px] leading-none text-[var(--accent)] sm:text-[160px]">
        {n}
      </motion.div>
    </MotionConfig>
  );
}

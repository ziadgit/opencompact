"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Html, Lightformer, OrbitControls } from "@react-three/drei";
import { JURISDICTIONS, type DupeResult, type Overall, type Verdict } from "@/lib/schemas";
import { Vessel } from "./Vessel";
import { Particles } from "./Particles";
import { StaticStage } from "./StaticStage";

const VERDICT_HEX: Record<Verdict, string> = { PASS: "#6f9a69", VIOLATION: "#a3302f", WARN: "#c99a45", NEEDS_REVIEW: "#c99a45" };
const ALL_PASS: Overall = { US: "PASS", CA: "PASS", EU: "PASS" };

function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return match;
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

type Props = { dupe: DupeResult; autoPlay?: boolean; height?: string };

export default function DupeStage({ dupe, autoPlay = false, height }: Props) {
  const [webgl] = useState<boolean>(() => hasWebGL());
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [duped, setDuped] = useState(false);
  const [peel, setPeel] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [side, setSide] = useState<"original" | "dupe">("original");
  const clockRef = useRef<THREE.Clock | null>(null);
  const mobile = useMedia("(max-width: 639px)");
  const coarse = useMedia("(pointer: coarse)");
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const canPeel = Boolean(dupe.original.hiddenWarning);

  const runDupe = () => {
    if (!clockRef.current) return;
    if (duped) {
      setStartedAt(null);
      setDuped(false);
      setSide("original");
      return;
    }
    setStartedAt(clockRef.current.elapsedTime);
    setDuped(true);
    if (mobile) setTimeout(() => setSide("dupe"), 1400 + dupe.swaps.length * 350);
  };

  // Looping demo for /about: peel, dupe, reset.
  useEffect(() => {
    if (!autoPlay || webgl === false) return;
    let step = 0;
    const id = setInterval(() => {
      step = (step + 1) % 4;
      if (step === 1) setPeel(canPeel ? 0.85 : 0);
      if (step === 2 && clockRef.current) {
        setPeel(0);
        setStartedAt(clockRef.current.elapsedTime);
        setDuped(true);
      }
      if (step === 0) {
        setStartedAt(null);
        setDuped(false);
      }
    }, 3200);
    return () => clearInterval(id);
  }, [autoPlay, webgl, canPeel]);

  const h = height ?? "h-[440px] sm:h-[520px]";

  if (webgl === false) return <StaticStage dupe={dupe} className={h} />;

  const origX = mobile ? 0 : -1.6;
  const dupeX = mobile ? 0 : 1.6;

  return (
    <div className={`relative overflow-hidden rounded-[24px] border border-line ${h}`} style={{ background: "radial-gradient(120% 90% at 50% 20%, var(--card), var(--bg))" }}>
      {webgl && (
        <Canvas dpr={[1, 2]} frameloop="demand" shadows camera={{ fov: 30, position: [0, 1.7, mobile ? 7.4 : 6.9] }} gl={{ alpha: true, antialias: true }}>
          <ClockGrab clockRef={clockRef} />
          <ambientLight intensity={0.35} />
          <directionalLight position={[3, 6, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
          <Environment resolution={256}>
            <Lightformer form="rect" intensity={2.2} position={[0, 4, 3]} scale={[8, 2, 1]} />
            <Lightformer form="rect" intensity={1.2} position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
            <Lightformer form="rect" intensity={1.2} position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
            <Lightformer form="ring" color="#f3e3c3" intensity={1.5} position={[0, 2, -5]} scale={3} />
          </Environment>

          <group position={[0, -0.5, 0]}>
            <Station x={origX} visible={!mobile || side === "original"} label="Original" overall={dupe.originalOverall ?? { US: "VIOLATION", CA: "PASS", EU: "PASS" }} spin={!reduced && !hovered}>
              <Vessel spec={dupe.original} peel={peel} />
            </Station>
            <Station x={dupeX} visible={!mobile || side === "dupe"} label={`Dupe — ${dupe.dupe.brandName}`} overall={dupe.dupeOverall ?? ALL_PASS} spin={!reduced && !hovered} phase={Math.PI}>
              <Vessel spec={dupe.dupe} />
            </Station>
            {!mobile || side === "original" || startedAt !== null ? (
              <group position={[0, 0.18, 0]}>
                <Particles
                  swaps={dupe.swaps}
                  from={new THREE.Vector3(origX, 0, 0)}
                  to={new THREE.Vector3(dupeX, mobile ? 0.9 : 0, 0)}
                  startedAt={startedAt}
                  hovered={hovered}
                  onHover={setHovered}
                />
              </group>
            ) : null}
            <ContactShadows position={[0, 0.001, 0]} opacity={0.35} blur={2.5} scale={10} far={3} />
          </group>
          {!coarse && <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 3.2} maxPolarAngle={Math.PI / 2.05} minAzimuthAngle={-0.6} maxAzimuthAngle={0.6} target={[0, 0, 0]} />}
        </Canvas>
      )}

      {/* overlay controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 p-3 sm:p-4">
        <div className="pointer-events-auto mx-auto flex w-full max-w-[560px] flex-wrap items-center justify-center gap-2 rounded-full border border-white/40 bg-card/70 p-1.5 shadow-sm backdrop-blur-md">
          <button
            onClick={runDupe}
            disabled={dupe.swaps.length === 0 && !mobile}
            className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-bg transition-opacity disabled:opacity-40"
          >
            {dupe.swaps.length === 0 ? "Already compliant" : duped ? "Reset" : "Dupe it"}
          </button>
          {canPeel && (
            <label className="flex min-w-[150px] flex-1 items-center gap-2 px-2 text-[12px] text-muted">
              <span className="smallcaps whitespace-nowrap">Peel label</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(peel * 100)}
                onChange={(e) => setPeel(Number(e.target.value) / 100)}
                className="w-full accent-[var(--review)]"
                aria-label="Peel the original label"
              />
            </label>
          )}
          {mobile && (
            <div className="flex rounded-full border border-line p-0.5 text-[12px]">
              {(["original", "dupe"] as const).map((s) => (
                <button key={s} onClick={() => setSide(s)} className={`rounded-full px-3 py-1 capitalize ${side === s ? "bg-ink text-bg" : "text-muted"}`}>
                  {s === "original" ? "Before" : "After"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Legend />
      {dupe.swaps.length > 0 && (
          <div className="pointer-events-auto absolute right-3 top-3 flex max-w-[60%] flex-wrap justify-end gap-1.5 sm:right-4">
            {dupe.swaps.map((s, i) => (
              <button
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                className="rounded-full border border-line bg-card/80 px-2.5 py-1 text-[11px] text-ink backdrop-blur transition-colors hover:border-[var(--ink)]"
              >
                <span className="mr-1.5 inline-block size-1.5 rounded-full align-middle" style={{ background: duped ? "var(--pass)" : "var(--violation)" }} />
                {duped ? s.to : s.from}
              </button>
            ))}
          </div>
        )}
    </div>
  );
}

function Legend() {
  return (
    <div className="smallcaps pointer-events-none absolute left-4 top-3 text-[11px] text-muted sm:top-4">
      Halo arcs · US · California · EU
    </div>
  );
}

function ClockGrab({ clockRef }: { clockRef: React.RefObject<THREE.Clock | null> }) {
  const clock = useThree((s) => s.clock);
  useEffect(() => {
    clockRef.current = clock;
  }, [clock, clockRef]);
  return null;
}

function Station({ x, label, overall, children, spin, phase = 0, visible }: { x: number; label: string; overall: Overall; children: React.ReactNode; spin: boolean; phase?: number; visible: boolean }) {
  const turn = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  useFrame(({ clock, invalidate }, dt) => {
    if (turn.current && spin) {
      turn.current.rotation.y = Math.sin(clock.elapsedTime * 0.15 + phase) * 0.5;
      invalidate();
    }
    if (root.current) {
      const target = visible ? 1 : 0.001;
      const s = THREE.MathUtils.damp(root.current.scale.x, target, 8, dt);
      root.current.scale.setScalar(s);
      if (Math.abs(s - target) > 0.002) invalidate();
    }
  });
  return (
    <group ref={root} position={[x, 0, 0]}>
      <mesh position={[0, -0.09, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.05, 1.1, 0.18, 72]} />
        <meshPhysicalMaterial color="#f4efe8" roughness={0.5} clearcoat={0.4} />
      </mesh>
      <Halo overall={overall} />
      <group ref={turn}>{children}</group>
      <Html position={[0, -0.3, 1.2]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className="smallcaps whitespace-nowrap text-[12px] text-muted">{label}</div>
      </Html>
    </group>
  );
}

/** Thin ring on the plinth's top edge: three arcs, one per jurisdiction. */
function Halo({ overall }: { overall: Overall }) {
  const gap = 0.12;
  const arc = (Math.PI * 2) / 3 - gap;
  const geo = useMemo(() => new THREE.TorusGeometry(1.06, 0.014, 8, 64, arc), [arc]);
  return (
    <group position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {JURISDICTIONS.map((j, i) => (
        <mesh key={j} geometry={geo} rotation={[0, 0, -Math.PI / 2 - arc / 2 + i * (arc + gap)]}>
          <meshBasicMaterial color={VERDICT_HEX[overall[j]]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

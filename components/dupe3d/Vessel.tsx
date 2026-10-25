"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { VesselSpec } from "@/lib/schemas";

const FINISH = {
  platinum: { metalness: 1, roughness: 0.22, clearcoat: 0.3 },
  gold: { metalness: 1, roughness: 0.28, clearcoat: 0.2 },
  obsidian: { metalness: 0.3, roughness: 0.18, clearcoat: 1 },
  porcelain: { metalness: 0, roughness: 0.42, clearcoat: 0.6 },
} as const;

function Finish({ spec, hex }: { spec: VesselSpec; hex?: string }) {
  const f = FINISH[spec.finish] ?? FINISH.porcelain;
  return <meshPhysicalMaterial color={hex ?? spec.bodyHex} {...f} clearcoatRoughness={0.2} />;
}

function Metal({ hex }: { hex: string }) {
  return <meshPhysicalMaterial color={hex} metalness={1} roughness={0.25} />;
}

/** Label art drawn to a canvas in the page's fonts. */
function useLabelTexture(spec: VesselSpec, w: number, h: number, kind: "front" | "warning") {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const scale = 512 / Math.max(w, h);
    const c = document.createElement("canvas");
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    const ctx = c.getContext("2d")!;
    const css = getComputedStyle(document.body);
    const serif = css.getPropertyValue("--font-serif").trim() || "Georgia, serif";
    const sans = css.getPropertyValue("--font-inter").trim() || "system-ui, sans-serif";

    if (kind === "front") {
      ctx.fillStyle = "#f8f3ec";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.strokeStyle = spec.accentHex;
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, c.width - 20, c.height - 20);
      ctx.fillStyle = "#1c1a17";
      ctx.textAlign = "center";
      ctx.font = `${Math.round(c.height * 0.2)}px ${serif}`;
      ctx.fillText(spec.brandName, c.width / 2, c.height * 0.38, c.width - 40);
      ctx.font = `500 ${Math.round(c.height * 0.075)}px ${sans}`;
      wrap(ctx, spec.productTitle.toUpperCase(), c.width / 2, c.height * 0.56, c.width - 50, c.height * 0.09);
      ctx.fillStyle = "#7a736a";
      ctx.font = `${Math.round(c.height * 0.055)}px ${sans}`;
      wrap(ctx, spec.labelFront, c.width / 2, c.height * 0.8, c.width - 60, c.height * 0.07);
    } else {
      ctx.fillStyle = "#efe7dc";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#d8cfc3"; // deliberately low contrast, like the real thing
      ctx.textAlign = "center";
      ctx.font = `600 ${Math.round(c.height * 0.06)}px ${sans}`;
      wrap(ctx, spec.hiddenWarning ?? "", c.width / 2, c.height * 0.4, c.width - 50, c.height * 0.075);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [spec, w, h, kind]);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

/** Front label that curls back from its right edge as `peel` goes 0 → 1. */
function PeelLabel({ spec, w, h, peel }: { spec: VesselSpec; w: number; h: number; peel: number }) {
  const invalidate = useThree((s) => s.invalidate);
  const front = useLabelTexture(spec, w, h, "front");
  const warning = useLabelTexture(spec, w, h, "warning");
  const mesh = useRef<THREE.Mesh>(null);
  const base = useRef<Float32Array | null>(null);

  useEffect(() => {
    const geo = mesh.current?.geometry;
    if (!geo) return;
    const pos = geo.attributes.position;
    base.current ??= Float32Array.from(pos.array as Float32Array);
    const b = base.current;
    const r = 0.06;
    const x0 = w / 2 - peel * w * 1.15;
    for (let i = 0; i < pos.count; i++) {
      const x = b[i * 3];
      if (x <= x0) {
        pos.setXYZ(i, x, b[i * 3 + 1], 0);
      } else {
        const theta = Math.min((x - x0) / r, Math.PI);
        const rest = x - x0 - theta * r; // past a half-roll, the label lies flat back over itself
        pos.setXYZ(i, x0 + r * Math.sin(theta) - rest, b[i * 3 + 1], r * (1 - Math.cos(theta)) + 0.002);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    invalidate();
  }, [peel, w, invalidate]);

  return (
    <group>
      {spec.hiddenWarning && warning && (
        <group position={[0, 0, -0.003]}>
          <mesh>
            <planeGeometry args={[w * 0.96, h * 0.92]} />
            <meshBasicMaterial map={warning} toneMapped={false} />
          </mesh>
          <WarningOutline w={w * 0.96} h={h * 0.92} visible={peel > 0.15} />
        </group>
      )}
      <mesh ref={mesh}>
        <planeGeometry args={[w, h, 48, 1]} />
        <meshStandardMaterial map={front ?? undefined} side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
    </group>
  );
}

function WarningOutline({ w, h, visible }: { w: number; h: number; visible: boolean }) {
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-w / 2, -h / 2, 0.001),
      new THREE.Vector3(w / 2, -h / 2, 0.001),
      new THREE.Vector3(w / 2, h / 2, 0.001),
      new THREE.Vector3(-w / 2, h / 2, 0.001),
      new THREE.Vector3(-w / 2, -h / 2, 0.001),
    ]);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: "#E0AE5A", transparent: true }));
  }, [w, h]);
  const ref = useRef<THREE.Line>(null);
  useFrame(({ clock, invalidate }) => {
    if (!visible || !ref.current) return;
    (ref.current.material as THREE.LineBasicMaterial).opacity = 0.45 + 0.55 * Math.abs(Math.sin(clock.elapsedTime * 2.4));
    invalidate();
  });
  return <primitive ref={ref} object={line} visible={visible} name="warning-outline" />;
}

function Compact({ spec, peel }: { spec: VesselSpec; peel: number }) {
  const pans = spec.panHexes?.length ? spec.panHexes.slice(0, 9) : [spec.contentHex];
  const cols = pans.length > 4 ? 3 : 2;
  const rows = Math.ceil(pans.length / cols);
  const step = 0.36;
  return (
    <group>
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.82, 0.2, 64]} />
        <Finish spec={spec} />
      </mesh>
      <mesh position={[0, 0.201, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.74, 64]} />
        <meshStandardMaterial color={spec.accentHex} metalness={0.6} roughness={0.35} />
      </mesh>
      {pans.map((hex, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return (
          <mesh key={i} position={[(c - (cols - 1) / 2) * step, 0.21, (r - (rows - 1) / 2) * step + 0.04]}>
            <cylinderGeometry args={[0.15, 0.15, 0.03, 40]} />
            <meshStandardMaterial color={hex} roughness={0.85} />
          </mesh>
        );
      })}
      {/* hinged lid, opened ~110° */}
      <group position={[0, 0.2, -0.8]} rotation={[-(110 * Math.PI) / 180, 0, 0]}>
        <mesh position={[0, 0.04, 0.8]} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 0.08, 64]} />
          <Finish spec={spec} />
        </mesh>
        <mesh position={[0, -0.001, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.66, 64]} />
          <meshStandardMaterial color="#e9e3da" metalness={0.75} roughness={0.12} envMapIntensity={1.6} />
        </mesh>
      </group>
      <group position={[0, 0.34, 0.93]} rotation={[-0.25, 0, 0]}>
        <PeelLabel spec={spec} w={0.95} h={0.52} peel={peel} />
      </group>
    </group>
  );
}

const DROPPER_PROFILE: [number, number][] = [
  [0, 0], [0.38, 0], [0.42, 0.04], [0.43, 0.12], [0.43, 0.92], [0.4, 1.0], [0.2, 1.1], [0.16, 1.14], [0.16, 1.24], [0, 1.24],
];

function Dropper({ spec, peel }: { spec: VesselSpec; peel: number }) {
  const glass = useMemo(() => new THREE.LatheGeometry(DROPPER_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), 64), []);
  const liquid = useMemo(
    () => new THREE.LatheGeometry([[0, 0.04], [0.38, 0.04], [0.39, 0.1], [0.39, 0.72], [0, 0.72]].map(([x, y]) => new THREE.Vector2(x, y)), 48),
    [],
  );
  return (
    <group>
      <mesh geometry={glass} castShadow>
        <meshPhysicalMaterial color={spec.bodyHex} transmission={1} thickness={0.6} roughness={spec.glassFrost * 0.5} ior={1.5} transparent opacity={0.98} />
      </mesh>
      <mesh geometry={liquid}>
        <meshPhysicalMaterial color={spec.contentHex} roughness={0.2} transmission={0.4} thickness={0.4} />
      </mesh>
      <mesh position={[0, 1.31, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.16, 48]} />
        <Metal hex={spec.accentHex} />
      </mesh>
      <mesh position={[0, 1.53, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.15, 0.3, 40]} />
        <meshStandardMaterial color={spec.finish === "obsidian" ? "#1c1a17" : "#2b2622"} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.68, 0]}>
        <sphereGeometry args={[0.13, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={spec.finish === "obsidian" ? "#1c1a17" : "#2b2622"} roughness={0.6} />
      </mesh>
      <group position={[0, 0.5, 0.44]}>
        <PeelLabel spec={spec} w={0.6} h={0.52} peel={peel} />
      </group>
    </group>
  );
}

function Pump({ spec, peel }: { spec: VesselSpec; peel: number }) {
  return (
    <group>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.42, 1.5, 64]} />
        <Finish spec={spec} />
      </mesh>
      <mesh position={[0, 1.54, 0]} castShadow>
        <cylinderGeometry args={[0.43, 0.43, 0.1, 64]} />
        <Metal hex={spec.accentHex} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.27, 0.24, 48]} />
        <Finish spec={spec} />
      </mesh>
      <mesh position={[0, 1.79, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.3, 16]} />
        <Metal hex={spec.accentHex} />
      </mesh>
      <group position={[0, 0.72, 0.43]}>
        <PeelLabel spec={spec} w={0.62} h={0.82} peel={peel} />
      </group>
    </group>
  );
}

export function Vessel({ spec, peel = 0 }: { spec: VesselSpec; peel?: number }) {
  if (spec.archetype === "compact") return <Compact spec={spec} peel={peel} />;
  if (spec.archetype === "dropper") return <Dropper spec={spec} peel={peel} />;
  return <Pump spec={spec} peel={peel} />;
}

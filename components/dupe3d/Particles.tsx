"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Swap } from "@/lib/schemas";

const COUNT = 40;
const DURATION = 1.6;
const STAGGER = 0.35;
const BAD = new THREE.Color("#a3302f");
const GOOD = [new THREE.Color("#7fa57a"), new THREE.Color("#d8bd85")];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Props = {
  swaps: Swap[];
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** Seconds since "Dupe it" was pressed, or null when at rest in the original. */
  startedAt: number | null;
  hovered: number | null;
  onHover: (i: number | null) => void;
};

/** One glowing cluster per flagged ingredient. They arc from the original to the dupe and change color. */
export function Particles({ swaps, from, to, startedAt, hovered, onHover }: Props) {
  return (
    <group>
      {swaps.map((s, i) => (
        <Cluster key={i} index={i} total={swaps.length} swap={s} from={from} to={to} startedAt={startedAt} hovered={hovered === i} onHover={onHover} />
      ))}
    </group>
  );
}

function Cluster({ index, total, swap, from, to, startedAt, hovered, onHover }: { index: number; total: number; swap: Swap; from: THREE.Vector3; to: THREE.Vector3; startedAt: number | null; hovered: boolean; onHover: (i: number | null) => void }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const tip = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Each cluster sits at its own height and angle around the vessel.
  const anchor = useMemo(() => {
    const a = (index / Math.max(total, 1)) * Math.PI * 2 + 0.6;
    return new THREE.Vector3(Math.cos(a) * 0.62, 0.45 + (index % 3) * 0.32, Math.sin(a) * 0.62);
  }, [index, total]);
  const offsets = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, k) => {
        const r = 0.13 * Math.cbrt(((k * 9301 + index * 49297) % 233280) / 233280);
        const t = k * 2.399;
        const y = 1 - (2 * (k + 0.5)) / COUNT;
        const rad = Math.sqrt(1 - y * y);
        return new THREE.Vector3(Math.cos(t) * rad * r, y * r, Math.sin(t) * rad * r);
      }),
    [index],
  );
  const good = GOOD[index % 2];

  useEffect(() => {
    // Seed instance colors so the first frame is correct.
    if (!mesh.current) return;
    for (let k = 0; k < COUNT; k++) mesh.current.setColorAt(k, BAD);
    mesh.current.instanceColor!.needsUpdate = true;
  }, []);

  useFrame(({ clock, invalidate }) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const raw = startedAt === null ? 0 : (t - startedAt - index * STAGGER) / DURATION;
    const p = ease(Math.min(Math.max(raw, 0), 1));
    const a = from.clone().add(anchor);
    const b = to.clone().add(new THREE.Vector3(anchor.x * 0.5, anchor.y * 0.85, anchor.z * 0.5));
    const ctrl = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 1.4, 0.4));
    const center = new THREE.Vector3()
      .copy(a)
      .multiplyScalar((1 - p) * (1 - p))
      .add(ctrl.clone().multiplyScalar(2 * (1 - p) * p))
      .add(b.clone().multiplyScalar(p * p));
    const breathe = 1 + Math.sin(t * 2 + index) * 0.08;
    const scale = hovered ? 1.35 : 1;
    color.copy(BAD).lerp(good, p);
    for (let k = 0; k < COUNT; k++) {
      const o = offsets[k];
      dummy.position.set(center.x + o.x * breathe * scale, center.y + o.y * breathe * scale + Math.sin(t * 1.6 + k) * 0.01, center.z + o.z * breathe * scale);
      dummy.scale.setScalar(0.022 + (k % 5) * 0.004);
      dummy.updateMatrix();
      m.setMatrixAt(k, dummy.matrix);
      m.setColorAt(k, color);
    }
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor!.needsUpdate = true;
    tip.current?.position.copy(center);
    if (startedAt !== null && raw < 1.05) invalidate();
  });

  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, COUNT]}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(index);
        }}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <group ref={tip}>
        {hovered && (
          <Html center position={[0, 0.3, 0]} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
            <div className="whitespace-nowrap rounded-full border border-line bg-card/95 px-3 py-1.5 text-[12px] text-ink shadow-sm backdrop-blur">
              {swap.from} → {swap.to} <span className="font-mono text-[10px] text-muted">· {swap.citation}</span>
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

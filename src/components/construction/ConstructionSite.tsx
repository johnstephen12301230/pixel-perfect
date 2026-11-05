import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CylinderGeometry, Group, MeshStandardMaterial, SphereGeometry } from "three";
import { easeOut, windowed } from "@/utils/construction";

// Shared, module-level resources: every site reuses them, nothing to dispose per site.
const box = new BoxGeometry(1, 1, 1);
const cyl = new CylinderGeometry(0.5, 0.5, 1, 8);
const head = new SphereGeometry(0.5, 8, 6);
const M = {
  fence: new MeshStandardMaterial({ color: "#f2b33d", roughness: 0.7 }),
  slab: new MeshStandardMaterial({ color: "#c9c3b8", roughness: 1 }),
  steel: new MeshStandardMaterial({ color: "#8d99a6", metalness: 0.5, roughness: 0.4 }),
  crane: new MeshStandardMaterial({ color: "#f0a63a", roughness: 0.5 }),
  vest: new MeshStandardMaterial({ color: "#f08a3c" }),
  pants: new MeshStandardMaterial({ color: "#3b4656" }),
  skin: new MeshStandardMaterial({ color: "#d9a882" }),
  hat: new MeshStandardMaterial({ color: "#ffd23f" }),
  crate: new MeshStandardMaterial({ color: "#a77b4f" }),
};
for (const m of Object.values(M)) m.userData["shared"] = true;

const WORKERS = [
  { r: 2.45, speed: 0.35, phase: 0, carry: true },
  { r: 2.45, speed: -0.28, phase: 2.1, carry: false },
  { r: 0, speed: 0, phase: 4, carry: false, at: [-2.2, 2.2] as const },
];

/** Temporary scaffolding, crane, barriers and crew; unmounted when construction completes. */
export function ConstructionSite({ progress, accent, height }: { progress: MutableRefObject<number>; accent: string; height: number }) {
  const root = useRef<Group>(null);
  const slab = useRef<Group>(null);
  const scaffold = useRef<Group>(null);
  const crane = useRef<Group>(null);
  const jib = useRef<Group>(null);
  const crew = useRef<(Group | null)[]>([]);
  const accentMat = useRef(new MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.4 }));
  accentMat.current.color.set(accent);
  useEffect(() => { const m = accentMat.current; return () => m.dispose(); }, []);

  useFrame(({ clock }) => {
    const p = progress.current;
    const t = clock.elapsedTime;
    // Whole site fades away during the final settle.
    const out = 1 - easeOut(windowed(p, 0.94, 1));
    if (root.current) { root.current.visible = out > 0.02; root.current.scale.setScalar(0.9 + out * 0.1); }
    if (slab.current) { const f = easeOut(windowed(p, 0.1, 0.26)); slab.current.scale.set(1, Math.max(0.01, f), 1); slab.current.visible = f > 0.01; }
    if (scaffold.current) { const f = easeOut(windowed(p, 0.22, 0.7)); scaffold.current.scale.set(1, Math.max(0.01, f), 1); scaffold.current.visible = f > 0.01 && p < 0.9; }
    if (crane.current) crane.current.visible = p > 0.18 && p < 0.92;
    if (jib.current) jib.current.rotation.y = Math.sin(t * 0.4) * 0.9;
    WORKERS.forEach((w, i) => {
      const g = crew.current[i];
      if (!g) return;
      if (w.at) { g.position.set(w.at[0], 0, w.at[1]); g.rotation.y = Math.sin(t * 0.8) * 0.6 + 0.8; return; }
      const a = w.phase + t * w.speed;
      g.position.set(Math.cos(a) * w.r, Math.abs(Math.sin(t * 6 + i)) * 0.03, Math.sin(a) * w.r);
      g.rotation.y = -a + (w.speed > 0 ? Math.PI : 0);
    });
  });

  const H = Math.max(2, height);
  return (
    <group ref={root}>
      {/* Perimeter barriers */}
      {([[0, -2.95, 5.9, 0.06], [0, 2.95, 5.9, 0.06], [-2.95, 0, 0.06, 5.9], [2.95, 0, 0.06, 5.9]] as const).map(([x, z, w, d], i) => (
        <mesh key={i} geometry={box} material={M.fence} position={[x, 0.22, z]} scale={[w, 0.08, d]} />
      ))}
      {([[-2.95, -2.95], [2.95, -2.95], [-2.95, 2.95], [2.95, 2.95]] as const).map(([x, z]) => (
        <mesh key={`${x}${z}`} geometry={cyl} material={M.fence} position={[x, 0.15, z]} scale={[0.1, 0.3, 0.1]} />
      ))}
      {/* Foundation slab */}
      <group ref={slab}>
        <mesh geometry={box} material={M.slab} position={[0, 0.08, 0]} scale={[4.8, 0.16, 4.4]} receiveShadow />
      </group>
      {/* Scaffold columns rising with the framework */}
      <group ref={scaffold}>
        {([[-2.35, -2.15], [2.35, -2.15], [-2.35, 2.15], [2.35, 2.15]] as const).map(([x, z]) => (
          <mesh key={`${x}${z}`} geometry={box} material={M.steel} position={[x, H / 2, z]} scale={[0.07, H, 0.07]} />
        ))}
        {Array.from({ length: Math.ceil(H / 1.4) }, (_, i) => (
          <group key={i} position={[0, 0.7 + i * 1.4, 0]}>
            <mesh geometry={box} material={M.steel} position={[0, 0, -2.15]} scale={[4.7, 0.05, 0.05]} />
            <mesh geometry={box} material={M.steel} position={[0, 0, 2.15]} scale={[4.7, 0.05, 0.05]} />
          </group>
        ))}
      </group>
      {/* Tower crane in the corner, clear of the footprint */}
      <group ref={crane} position={[2.6, 0, -2.6]}>
        <mesh geometry={box} material={M.crane} position={[0, (H + 1.5) / 2, 0]} scale={[0.18, H + 1.5, 0.18]} castShadow />
        <group ref={jib} position={[0, H + 1.5, 0]}>
          <mesh geometry={box} material={M.crane} position={[-1.4, 0, 0]} scale={[3.6, 0.14, 0.14]} />
          <mesh geometry={box} material={M.steel} position={[0.6, -0.1, 0]} scale={[0.4, 0.3, 0.3]} />
          <mesh geometry={box} material={M.steel} position={[-2.6, -0.6, 0]} scale={[0.02, 1.1, 0.02]} />
          <mesh geometry={box} material={M.crate} position={[-2.6, -1.25, 0]} scale={[0.3, 0.22, 0.3]} />
        </group>
        <mesh geometry={box} material={accentMat.current} position={[0, H + 1.65, 0]} scale={[0.12, 0.12, 0.12]} />
      </group>
      {/* Material stack */}
      <mesh geometry={box} material={M.crate} position={[-2.5, 0.28, -2.4]} scale={[0.5, 0.18, 0.4]} />
      {/* Crew (separate from the technology employees inside finished buildings) */}
      {WORKERS.map((w, i) => (
        <group key={i} ref={(g) => { crew.current[i] = g; }} scale={0.55}>
          <mesh geometry={box} material={M.pants} position={[0, 0.32, 0]} scale={[0.32, 0.5, 0.2]} />
          <mesh geometry={box} material={M.vest} position={[0, 0.78, 0]} scale={[0.4, 0.45, 0.24]} />
          <mesh geometry={head} material={M.skin} position={[0, 1.14, 0]} scale={0.26} />
          <mesh geometry={cyl} material={M.hat} position={[0, 1.27, 0]} scale={[0.3, 0.08, 0.3]} />
          {w.carry && <mesh geometry={box} material={M.crate} position={[0, 0.8, 0.22]} scale={[0.3, 0.22, 0.2]} />}
        </group>
      ))}
    </group>
  );
}

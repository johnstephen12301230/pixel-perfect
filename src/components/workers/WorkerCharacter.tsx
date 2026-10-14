import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, type Group } from "three";

/**
 * Procedural low-poly employee (~0.32 units tall, in scale with 0.18-high desks).
 * Joint groups are exposed through `rig` so a GLB rig can later fill the same slots.
 */
export interface WorkerRig {
  body: Group | null; hips: Group | null; torso: Group | null; head: Group | null;
  legL: Group | null; legR: Group | null; kneeL: Group | null; kneeR: Group | null;
  armL: Group | null; armR: Group | null;
}
export const emptyRig = (): WorkerRig => ({ body: null, hips: null, torso: null, head: null, legL: null, legR: null, kneeL: null, kneeR: null, armL: null, armR: null });

export const HIP_STAND = 0.13;
export const HIP_SIT = 0.125;
const SEG = 0.065;

const G = {
  thigh: new BoxGeometry(0.032, SEG, 0.036),
  shin: new BoxGeometry(0.03, SEG, 0.034),
  foot: new BoxGeometry(0.032, 0.014, 0.05),
  torso: new BoxGeometry(0.085, 0.11, 0.05),
  collar: new BoxGeometry(0.03, 0.03, 0.006),
  badge: new BoxGeometry(0.018, 0.018, 0.006),
  arm: new BoxGeometry(0.022, 0.085, 0.024),
  hand: new BoxGeometry(0.02, 0.02, 0.02),
  head: new BoxGeometry(0.052, 0.056, 0.05),
  hair: new BoxGeometry(0.056, 0.018, 0.054),
  ring: new CylinderGeometry(0.09, 0.09, 0.006, 20),
};
const cache = new Map<string, MeshStandardMaterial>();
export function mat(color: string, emissive = false) {
  const key = `${color}${emissive}`;
  let m = cache.get(key);
  if (!m) { m = new MeshStandardMaterial({ color, roughness: 0.7, ...(emissive ? { emissive: color, emissiveIntensity: 0.7 } : {}) }); cache.set(key, m); }
  return m;
}
const SKIN = ["#e9c4a2", "#c9966f", "#8d5d3f", "#f1d3b8"];
const HAIR = ["#2b2420", "#5a3d2b", "#1d1d22", "#a07a4f"];
const PANTS = "#2f3a48";
const SHOE = "#1e252e";
const WHITE = "#f4f6f8";

export function WorkerCharacter({ rig, seed, shirt, accent, highlight }: { rig: WorkerRig; seed: number; shirt: string; accent: string; highlight: boolean }) {
  const skin = mat(SKIN[seed % SKIN.length]!), hair = mat(HAIR[(seed >> 2) % HAIR.length]!);
  const leg = (side: 1 | -1) => (
    <group ref={(g) => { rig[side < 0 ? "legL" : "legR"] = g; }} position={[side * 0.022, HIP_STAND, 0]}>
      <mesh geometry={G.thigh} material={mat(PANTS)} position={[0, -SEG / 2, 0]} />
      <group ref={(g) => { rig[side < 0 ? "kneeL" : "kneeR"] = g; }} position={[0, -SEG, 0]}>
        <mesh geometry={G.shin} material={mat(PANTS)} position={[0, -SEG / 2, 0]} />
        <mesh geometry={G.foot} material={mat(SHOE)} position={[0, -SEG + 0.007, 0.01]} />
      </group>
    </group>
  );
  const arm = (side: 1 | -1) => (
    <group ref={(g) => { rig[side < 0 ? "armL" : "armR"] = g; }} position={[side * 0.054, 0.1, 0]}>
      <mesh geometry={G.arm} material={mat(shirt)} position={[0, -0.042, 0]} />
      <mesh geometry={G.hand} material={skin} position={[0, -0.092, 0]} />
    </group>
  );
  return (
    <group ref={(g) => { rig.body = g; }}>
      {highlight && <mesh geometry={G.ring} material={mat(accent, true)} position={[0, 0.004, 0]} />}
      {leg(-1)}{leg(1)}
      <group ref={(g) => { rig.hips = g; }} position={[0, HIP_STAND, 0]}>
        <group ref={(g) => { rig.torso = g; }}>
          <mesh geometry={G.torso} material={mat(shirt)} position={[0, 0.055, 0]} />
          <mesh geometry={G.collar} material={mat(WHITE)} position={[0, 0.098, 0.026]} />
          <mesh geometry={G.badge} material={mat(accent, true)} position={[0.022, 0.07, 0.027]} />
          {arm(-1)}{arm(1)}
          <group ref={(g) => { rig.head = g; }} position={[0, 0.112, 0]}>
            <mesh geometry={G.head} material={skin} position={[0, 0.03, 0]} />
            <mesh geometry={G.hair} material={hair} position={[0, 0.062, -0.002]} />
          </group>
        </group>
      </group>
    </group>
  );
}

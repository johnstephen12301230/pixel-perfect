import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Color, CylinderGeometry, Euler, InstancedMesh, Matrix4, MeshStandardMaterial, Quaternion, Vector3 } from "three";
import type { DevelopmentLot } from "@/types/city";
import { getProjects } from "@/store/useProjectRegistry";
import { useCityStore } from "@/store/useCityStore";
import { AmbientSim, POPULATION, deviceTier, type PedestrianController, type VehicleController } from "@/utils/ambientSim";
import { pose } from "@/components/workers/WorkerAnimationController";
import { HIP_STAND } from "@/components/workers/WorkerCharacter";
import { Bench } from "@/components/city/Props";
import { environmentFrame } from "@/utils/environment";

/**
 * Outdoor ambient life: one simulation, one frame loop, three instanced draw calls.
 * Ambient actors never raycast, so they cannot intercept building clicks.
 */
const SEG = 0.065;
const PED_PARTS = 15;
const CAR_BOXES = 13;
const noRaycast = () => {};

const unitBox = new BoxGeometry(1, 1, 1);
const wheelGeo = new CylinderGeometry(1, 1, 1, 10);
const pedMat = new MeshStandardMaterial({ roughness: 0.75 });
const carMat = new MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 });
const wheelMat = new MeshStandardMaterial({ color: "#20252c", roughness: 0.8 });

const M = Array.from({ length: 8 }, () => new Matrix4());
const tmp = new Matrix4(), out = new Matrix4();
const q = new Quaternion(), e = new Euler(), v = new Vector3(), sc = new Vector3();
const col = new Color();

function local(parent: Matrix4, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, target = out) {
  e.set(rx, ry, rz, "YXZ"); q.setFromEuler(e);
  tmp.compose(v.set(x, y, z), q, sc.set(1, 1, 1));
  return target.multiplyMatrices(parent, tmp);
}
function part(mesh: InstancedMesh, i: number, parent: Matrix4, x: number, y: number, z: number, w: number, h: number, d: number) {
  tmp.compose(v.set(x, y, z), q.identity(), sc.set(w, h, d));
  out.multiplyMatrices(parent, tmp);
  mesh.setMatrixAt(i, out);
}

function writePedestrian(mesh: InstancedMesh, base: number, p: PedestrianController, visibility = 1) {
  const j = pose(p.animState, p.animT, p.seated);
  const s = p.look.scale * visibility;
  e.set(0, p.yaw, 0); q.setFromEuler(e);
  const root = M[0]!.compose(v.set(p.x, p.y + (p.seated ? -0.03 : 0) + j.bob, p.z), q, sc.set(s, s, s));
  const hip = j.hip;
  let k = base;
  for (const side of [-1, 1] as const) {
    const leg = local(root, side * 0.022, hip, 0, side < 0 ? j.legL : j.legR, 0, 0, M[1]!);
    part(mesh, k++, leg, 0, -SEG / 2, 0, 0.032, SEG, 0.036);
    const knee = local(leg, 0, -SEG, 0, side < 0 ? j.kneeL : j.kneeR, 0, 0, M[2]!);
    part(mesh, k++, knee, 0, -SEG / 2, 0, 0.03, SEG, 0.034);
    part(mesh, k++, knee, 0, -SEG + 0.007, 0.01, 0.032, 0.014, 0.05);
  }
  const torso = local(root, 0, hip, 0, j.lean, 0, 0, M[3]!);
  part(mesh, k++, torso, 0, 0.055, 0, 0.085, 0.11, 0.05);
  part(mesh, k++, torso, 0, 0.098, 0.026, 0.03, 0.03, 0.006);
  for (const side of [-1, 1] as const) {
    const arm = local(torso, side * 0.054, 0.1, 0, side < 0 ? j.armLx : j.armRx, 0, side < 0 ? 0 : j.armRz, M[4]!);
    part(mesh, k++, arm, 0, -0.042, 0, 0.022, 0.085, 0.024);
    part(mesh, k++, arm, 0, -0.092, 0, 0.02, 0.02, 0.02);
  }
  const head = local(torso, 0, 0.112, 0, j.headX, j.headY, 0, M[5]!);
  part(mesh, k++, head, 0, 0.03, 0, 0.052, 0.056, 0.05);
  part(mesh, k++, head, 0, 0.062, -0.002, 0.056, 0.018, 0.054);
  if (p.look.bag) part(mesh, k++, torso, 0, 0.06, -0.038, 0.06, 0.07, 0.03);
  else part(mesh, k++, torso, 0, 0, 0, 0, 0, 0);
}

function colorPedestrian(mesh: InstancedMesh, base: number, p: PedestrianController) {
  const L = p.look;
  const order = [L.pants, L.pants, L.shoe, L.pants, L.pants, L.shoe, L.shirt, "#f4f6f8", L.shirt, L.skin, L.shirt, L.skin, L.skin, L.hair, L.bag ?? L.shirt];
  order.forEach((c, i) => mesh.setColorAt(base + i, col.set(c)));
}

type Box = [x: number, y: number, z: number, w: number, h: number, d: number, color: string];
const GLASS = "#3b4a5c", HEAD = "#fff6d8", TAIL = "#d64545";
function carBoxes(c: VehicleController): Box[] {
  const p = c.color;
  const lights = (l: number, y: number, w: number): Box[] => [
    [-w, y, l, 0.08, 0.04, 0.02, HEAD], [w, y, l, 0.08, 0.04, 0.02, HEAD],
    [-w, y, -l, 0.08, 0.04, 0.02, TAIL], [w, y, -l, 0.08, 0.04, 0.02, TAIL],
  ];
  switch (c.kind) {
    case "compact": return [[0, 0.18, 0, 0.5, 0.17, 0.96, p], [0, 0.34, -0.06, 0.44, 0.16, 0.52, GLASS], [0, 0.43, -0.06, 0.46, 0.03, 0.48, p], ...lights(0.48, 0.2, 0.16)];
    case "sedan": return [[0, 0.18, 0, 0.52, 0.16, 1.12, p], [0, 0.33, -0.04, 0.46, 0.15, 0.6, GLASS], [0, 0.415, -0.04, 0.48, 0.03, 0.54, p], ...lights(0.56, 0.2, 0.17)];
    case "van":
    case "service": return [
      [0, 0.3, -0.08, 0.54, 0.4, 0.98, p], [0, 0.22, 0.48, 0.52, 0.24, 0.24, p], [0, 0.4, 0.42, 0.5, 0.15, 0.08, GLASS],
      c.kind === "service" ? [0, 0.3, -0.08, 0.555, 0.06, 0.99, "#e0864a"] : [0, 0.2, -0.08, 0.555, 0.03, 0.99, "#9aa5b1"],
      c.kind === "service" ? [0, 0.53, 0.2, 0.18, 0.05, 0.08, "#f2c230"] : [0, 0.51, -0.08, 0.5, 0.02, 0.9, "#c9d2db"],
      ...lights(0.6, 0.22, 0.17),
    ];
  }
}
const WHEELS: [number, number][] = [[-1, 1], [1, 1], [-1, -1], [1, -1]];
const WHEEL_R = 0.11, WHEEL_W = 0.07;

function writeCar(boxes: InstancedMesh, wheels: InstancedMesh, i: number, c: VehicleController, list: Box[], lamps?: InstancedMesh) {
  e.set(0, c.yaw, 0); q.setFromEuler(e);
  const root = M[0]!.compose(v.set(c.x, 0.012, c.z), q, sc.set(1, 1, 1));
  for (let b = 0; b < CAR_BOXES; b++) {
    const bx = list[b];
    if (bx) part(boxes, i * CAR_BOXES + b, root, bx[0], bx[1], bx[2], bx[3], bx[4], bx[5]);
    else part(boxes, i * CAR_BOXES + b, root, 0, 0, 0, 0, 0, 0);
  }
  if (lamps) list.filter(b => b[6] === HEAD || b[6] === TAIL).forEach((b,k) => { part(lamps,i*4+k,root,b[0],b[1],b[2]+(k<2 ? .012 : -.012),b[3],b[4],b[5]); });
  const l = c.half * 0.62, w = 0.25;
  WHEELS.forEach(([sx, sz], k) => {
    const hub = local(root, sx * w, WHEEL_R, sz * l, 0, sz > 0 ? c.steer : 0, 0, M[1]!);
    const spun = local(hub, 0, 0, 0, c.spin, 0, 0, M[2]!);
    // Tyre: cylinder rotated so its axis is the axle.
    tmp.compose(v.set(0, 0, 0), q.setFromEuler(e.set(0, 0, Math.PI / 2)), sc.set(WHEEL_R, WHEEL_W, WHEEL_R));
    wheels.setMatrixAt(i * 4 + k, out.multiplyMatrices(spun, tmp));
    // A light hub bar on the outer face makes the rotation visible.
    part(boxes, i * CAR_BOXES + 9 + k, spun, sx * (WHEEL_W / 2 + 0.004), 0, 0, 0.008, WHEEL_R * 1.5, 0.03);
  });
}

export function AmbientCity({ lots }: { lots: DevelopmentLot[] }) {
  const sim = useMemo(() => {
    const tier = deviceTier(window.innerWidth, navigator.hardwareConcurrency || 4);
    return new AmbientSim(lots, getProjects(), POPULATION[tier]);
  }, [lots]);
  const reduced = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const peds = useRef<InstancedMesh>(null);
  const boxes = useRef<InstancedMesh>(null);
  const wheels = useRef<InstancedMesh>(null);
  const lamps = useRef<InstancedMesh>(null);
  const lampMat = useMemo(() => new MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: 0, roughness: .4 }), []);
  const visibility = useRef<number[]>([]);
  const carLists = useMemo(() => sim.vehicles.map(carBoxes), [sim]);
  const signals = useMemo(() => sim.graph.crosswalks.map(() => new MeshStandardMaterial({ color: "#e05a4f", emissive: "#e05a4f", emissiveIntensity: 0.8 })), [sim]);
  const signalState = useRef<string[]>([]);
  const acc = useRef(0);
  const primed = useRef(false);

  useEffect(() => {
    const p = peds.current, b = boxes.current;
    if (!p || !b) return;
    sim.pedestrians.forEach((ped, i) => colorPedestrian(p, i * PED_PARTS, ped));
    sim.vehicles.forEach((c, i) => {
      for (let k = 0; k < CAR_BOXES; k++) b.setColorAt(i * CAR_BOXES + k, col.set(carLists[i]![k]?.[6] ?? "#d9dee4"));
      for (let k=0;k<4;k++) lamps.current?.setColorAt(i*4+k,col.set(k<2 ? HEAD : TAIL));
    });
    if (lamps.current?.instanceColor) lamps.current.instanceColor.needsUpdate=true;
    if (p.instanceColor) p.instanceColor.needsUpdate = true;
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    return () => { signals.forEach((m) => m.dispose()); lampMat.dispose(); };
  }, [sim, carLists, signals, lampMat]);

  useFrame((_, raw) => {
    if (typeof document !== "undefined" && document.hidden) return;
    const p = peds.current, b = boxes.current, w = wheels.current;
    if (!p || !b || !w) return;
    lampMat.emissiveIntensity = environmentFrame.darkness * 1.7;
    let dt = Math.min(raw, 0.05);
    if (reduced) dt = primed.current ? 0 : 1 / 30;
    // Inside a building the street is secondary: simulate at half rate.
    if (useCityStore.getState().interaction === "inspecting-building") {
      acc.current += dt;
      if (acc.current < 1 / 30) return;
      dt = Math.min(acc.current, 0.05); acc.current = 0;
    }
    sim.step(dt);
    sim.pedestrians.forEach((ped, i) => {
      const goal = i < Math.ceil(sim.pedestrians.length * (1 - environmentFrame.darkness * .45)) ? 1 : 0;
      visibility.current[i] = (visibility.current[i] ?? 1) + (goal - (visibility.current[i] ?? 1)) * (reduced ? 1 : 1-Math.exp(-dt*2));
      writePedestrian(p, i * PED_PARTS, ped, visibility.current[i]);
    });
    sim.vehicles.forEach((c, i) => writeCar(b, w, i, c, carLists[i] ?? [], lamps.current ?? undefined));
    if (lamps.current) lamps.current.instanceMatrix.needsUpdate = true;
    p.instanceMatrix.needsUpdate = true; b.instanceMatrix.needsUpdate = true; w.instanceMatrix.needsUpdate = true;
    primed.current = true;
    sim.graph.crosswalks.forEach((cw, i) => {
      const st = sim.crossings.get(cw.id)!.state;
      if (signalState.current[i] === st) return;
      signalState.current[i] = st;
      const c = st === "pedestrians" ? "#3fbf6f" : "#e05a4f";
      signals[i]!.color.set(c); signals[i]!.emissive.set(c);
    });
  });

  return (
    <group>
      <instancedMesh ref={peds} args={[unitBox, pedMat, sim.pedestrians.length * PED_PARTS]} frustumCulled={false} raycast={noRaycast} />
      <instancedMesh ref={boxes} args={[unitBox, carMat, Math.max(1, sim.vehicles.length * CAR_BOXES)]} frustumCulled={false} raycast={noRaycast} />
      <instancedMesh ref={wheels} args={[wheelGeo, wheelMat, Math.max(1, sim.vehicles.length * 4)]} frustumCulled={false} raycast={noRaycast} />
      <instancedMesh ref={lamps} args={[unitBox, lampMat, Math.max(1, sim.vehicles.length * 4)]} frustumCulled={false} raycast={noRaycast} />
      {sim.graph.benches.map((bn, i) => (
        <group key={i} position={[bn.p[0], 0.21, bn.p[1]]} scale={0.45}><Bench position={[0, 0, 0]} rotation={bn.yaw} /></group>
      ))}
      {sim.graph.crosswalks.map((cw, i) => {
        // Pedestrian signals stand on the curb strip, one at each end of the crossing.
        const along = cw.axis === "x" ? 0 : 1;
        const toCenter = Math.sign(cw.center[1 - along]!) || 1; // nudge away from the nearest intersection
        return [-1, 1].map((end) => {
          const pos: [number, number, number] = along === 0
            ? [cw.center[0] + end * (cw.halfLength + 0.25), 0.18, cw.center[1] + toCenter * 0.8]
            : [cw.center[0] + toCenter * 0.8, 0.18, cw.center[1] + end * (cw.halfLength + 0.25)];
          return (
            <group key={`${cw.id}${end}`} position={pos}>
              <mesh position={[0, 0.22, 0]} geometry={unitBox} scale={[0.04, 0.44, 0.04]} raycast={noRaycast}><meshStandardMaterial color="#6b7785" /></mesh>
              <mesh position={[0, 0.46, 0]} geometry={unitBox} scale={[0.09, 0.09, 0.09]} material={signals[i]!} raycast={noRaycast} />
            </group>
          );
        });
      })}
    </group>
  );
}

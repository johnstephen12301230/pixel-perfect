import { LOT_PITCH, ROAD_WIDTH } from "@/data/cityLots";
import type { DevelopmentLot } from "@/types/city";
import type { Project } from "@/types/project";
import { seeded } from "./workers";

/**
 * Phase 5 route registry. Everything is derived from the lot data so new lots
 * automatically get sidewalks, crossings and lanes.
 */
export type P2 = [number, number];

/** Half-size of the walking line around each lot (lot edge at LOT_SIZE/2 = 8, lawn at 7.2). */
export const RING_INSET = 7.3;
export const LANE_OFFSET = 1;
export const SIDEWALK_Y = 0.18;
export const LAWN_Y = 0.21;
export const ROAD_Y = 0.012;
/** Footprint half-size (+margin) that ambient actors must never enter. */
export const BUILDING_HALF = 3.25;

export type SpotKind = "bench" | "entrance" | "plaza";
export interface SpotDef { id: string; kind: SpotKind; s: number; depth: number }
export interface PedNode { id: string; p: P2; edges: string[] }
export interface PedEdge {
  id: string; a: string; b: string; kind: "sidewalk" | "crossing"; len: number;
  /** Unit normal; for sidewalks it points into the lot. */
  normal: P2; crosswalkId?: string; spots: SpotDef[];
}
export interface Crosswalk { id: string; center: P2; axis: "x" | "z"; halfLength: number; halfWidth: number; offset: number }
export interface BenchDef { p: P2; yaw: number }
export interface PedestrianGraph { nodes: Map<string, PedNode>; edges: Map<string, PedEdge>; crosswalks: Crosswalk[]; benches: BenchDef[] }

const CORNERS = [["nw", -1, -1], ["ne", 1, -1], ["se", 1, 1], ["sw", -1, 1]] as const;
const SIDES = [
  { a: "nw", b: "ne", normal: [0, 1] as P2 },
  { a: "ne", b: "se", normal: [-1, 0] as P2 },
  { a: "se", b: "sw", normal: [0, -1] as P2 },
  { a: "sw", b: "nw", normal: [1, 0] as P2 },
];

const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const dot = (a: P2, b: P2) => a[0] * b[0] + a[1] * b[1];
const len = (a: P2) => Math.hypot(a[0], a[1]);
const unit = (a: P2): P2 => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };

/** Rectangles (lot-local) occupied by any slot content: buildings, plazas, construction markers. */
function blockedRects(lot: DevelopmentLot) {
  return lot.slots.map((s) => ({ x: s.offset[0], z: s.offset[1], h: BUILDING_HALF }));
}
function freeAt(lot: DevelopmentLot, lx: number, lz: number, r: number) {
  return blockedRects(lot).every((b) => Math.abs(lx - b.x) > b.h + r || Math.abs(lz - b.z) > b.h + r);
}

export function buildPedestrianGraph(lots: DevelopmentLot[], projects: Project[]): PedestrianGraph {
  const nodes = new Map<string, PedNode>();
  const edges = new Map<string, PedEdge>();
  const benches: BenchDef[] = [];
  const addEdge = (e: PedEdge) => { edges.set(e.id, e); nodes.get(e.a)!.edges.push(e.id); nodes.get(e.b)!.edges.push(e.id); };

  for (const lot of lots) {
    const [cx, cz] = lot.position;
    for (const [k, sx, sz] of CORNERS) nodes.set(`${lot.id}-${k}`, { id: `${lot.id}-${k}`, p: [cx + sx * RING_INSET, cz + sz * RING_INSET], edges: [] });
    const rnd = seeded(`bench-${lot.id}`);
    const benchSides = new Set([Math.floor(rnd() * 4), Math.floor(rnd() * 4 + 2) % 4]);
    SIDES.forEach((side, si) => {
      const A = nodes.get(`${lot.id}-${side.a}`)!, B = nodes.get(`${lot.id}-${side.b}`)!;
      const dir = unit(sub(B.p, A.p));
      const L = len(sub(B.p, A.p));
      const spots: SpotDef[] = [];
      const id = `${lot.id}-${side.a}${side.b}`;
      const localAt = (s: number, depth: number): P2 => [A.p[0] + dir[0] * s + side.normal[0] * depth - cx, A.p[1] + dir[1] * s + side.normal[1] * depth - cz];
      const taken = (s: number) => spots.some((p) => Math.abs(p.s - s) < 1.1);
      // Entrances: one stand point in front of every project on this side.
      for (const project of projects.filter((p) => p.lotId === lot.id)) {
        const slot = lot.slots.find((s) => s.id === project.slotId);
        if (!slot) continue;
        const [ox, oz] = slot.offset;
        const zSide = Math.abs(oz) >= Math.abs(ox);
        const facesThis = zSide ? side.normal[0] === 0 && Math.sign(oz) === -side.normal[1] : side.normal[1] === 0 && Math.sign(ox) === -side.normal[0];
        if (!facesThis || (zSide ? oz === 0 : ox === 0)) continue;
        const world: P2 = [cx + ox, cz + oz];
        const s = dot(sub(world, A.p), dir);
        if (s > 1.4 && s < L - 1.4) spots.push({ id: `${id}-entrance-${project.id}`, kind: "entrance", s, depth: 0.32 });
      }
      // Benches on the lawn edge and one small plaza standing spot, only where nothing is built.
      for (const t of [0, 2.2, -2.2, 4.4, -4.4]) {
        const s = L / 2 + t;
        if (taken(s)) continue;
        const [lx, lz] = localAt(s, 0.47);
        if (benchSides.has(si) && !spots.some((p) => p.kind === "bench") && freeAt(lot, lx, lz, 0.35)) {
          spots.push({ id: `${id}-bench`, kind: "bench", s, depth: 0.42 });
          benches.push({ p: [cx + lx, cz + lz], yaw: Math.atan2(-side.normal[0], -side.normal[1]) });
        } else if (!spots.some((p) => p.kind === "plaza") && freeAt(lot, lx, lz, 0.5)) {
          spots.push({ id: `${id}-plaza`, kind: "plaza", s, depth: 0.36 });
        }
      }
      spots.sort((p, q) => p.s - q.s);
      addEdge({ id, a: A.id, b: B.id, kind: "sidewalk", len: L, normal: side.normal, spots });
    });
  }

  // Crosswalks at both ends of every road shared by two neighbouring lots.
  const crosswalks: Crosswalk[] = [];
  const near = (p: P2) => [...nodes.values()].find((n) => len(sub(n.p, p)) < 0.01);
  for (const l1 of lots) for (const l2 of lots) {
    const dx = l2.position[0] - l1.position[0], dz = l2.position[1] - l1.position[1];
    const horiz = Math.abs(dx - LOT_PITCH) < 1e-6 && Math.abs(dz) < 1e-6;
    const vert = Math.abs(dz - LOT_PITCH) < 1e-6 && Math.abs(dx) < 1e-6;
    if (!horiz && !vert) continue;
    for (const end of [-1, 1]) {
      const a: P2 = horiz ? [l1.position[0] + RING_INSET, l1.position[1] + end * RING_INSET] : [l1.position[0] + end * RING_INSET, l1.position[1] + RING_INSET];
      const b: P2 = horiz ? [l2.position[0] - RING_INSET, a[1]] : [a[0], l2.position[1] - RING_INSET];
      const na = near(a), nb = near(b);
      if (!na || !nb) continue;
      const id = `cw-${crosswalks.length}`;
      const d = unit(sub(nb.p, na.p));
      crosswalks.push({ id, center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], axis: horiz ? "x" : "z", halfLength: ROAD_WIDTH / 2, halfWidth: 0.55, offset: crosswalks.length * 6.3 });
      addEdge({ id: `${id}-edge`, a: na.id, b: nb.id, kind: "crossing", len: len(sub(nb.p, na.p)), normal: [-d[1], d[0]], crosswalkId: id, spots: [] });
    }
  }
  return { nodes, edges, crosswalks, benches };
}

/* ------------------------------ Vehicle lanes ----------------------------- */

export interface RouteIntersection { crosswalkId: string; sEnter: number; sExit: number }
export interface VehicleRoute {
  id: string; kind: "block" | "perimeter";
  /** Lane-centerline samples (x, z) and cumulative arc length. */
  xs: Float32Array; zs: Float32Array; s: Float32Array; turn: Uint8Array; length: number;
  direction: "clockwise" | "counter-clockwise"; speedRange: [number, number]; loop: true;
  intersections: RouteIntersection[];
}

function roundedLoop(corners: P2[], r: number, step = 0.2) {
  const pts: { p: P2; turn: boolean }[] = [];
  const n = corners.length;
  const tang = corners.map((c, i) => {
    const p = corners[(i - 1 + n) % n]!, q = corners[(i + 1) % n]!;
    const u1 = unit(sub(p, c)), u2 = unit(sub(q, c));
    return { a: [c[0] + u1[0] * r, c[1] + u1[1] * r] as P2, c, b: [c[0] + u2[0] * r, c[1] + u2[1] * r] as P2 };
  });
  tang.forEach((t, i) => {
    const k = Math.max(4, Math.ceil((r * 1.6) / step));
    for (let j = 0; j < k; j++) {
      const u = j / k, w = 1 - u;
      pts.push({ p: [w * w * t.a[0] + 2 * w * u * t.c[0] + u * u * t.b[0], w * w * t.a[1] + 2 * w * u * t.c[1] + u * u * t.b[1]], turn: true });
    }
    const next = tang[(i + 1) % n]!;
    const L = len(sub(next.a, t.b)), m = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < m; j++) pts.push({ p: [t.b[0] + ((next.a[0] - t.b[0]) * j) / m, t.b[1] + ((next.a[1] - t.b[1]) * j) / m], turn: false });
  });
  return pts;
}

function makeRoute(id: string, kind: VehicleRoute["kind"], corners: P2[], radius: number, speedRange: [number, number], crosswalks: Crosswalk[], direction: VehicleRoute["direction"]): VehicleRoute {
  const pts = roundedLoop(corners, radius);
  const N = pts.length;
  const xs = new Float32Array(N), zs = new Float32Array(N), s = new Float32Array(N + 1), turn = new Uint8Array(N);
  pts.forEach((q, i) => { xs[i] = q.p[0]; zs[i] = q.p[1]; turn[i] = q.turn ? 1 : 0; });
  for (let i = 0; i < N; i++) s[i + 1] = s[i]! + Math.hypot(xs[(i + 1) % N]! - xs[i]!, zs[(i + 1) % N]! - zs[i]!);
  const intersections: RouteIntersection[] = [];
  for (const cw of crosswalks) {
    const hx = cw.axis === "x" ? cw.halfLength : cw.halfWidth, hz = cw.axis === "x" ? cw.halfWidth : cw.halfLength;
    let enter = -1;
    for (let i = 0; i <= N; i++) {
      const inside = i < N && Math.abs(xs[i]! - cw.center[0]) <= hx && Math.abs(zs[i]! - cw.center[1]) <= hz;
      if (inside && enter < 0) enter = i;
      if (!inside && enter >= 0) { intersections.push({ crosswalkId: cw.id, sEnter: s[enter]!, sExit: s[i]! }); enter = -1; }
    }
  }
  return { id, kind, xs, zs, s, turn, length: s[N]!, direction, speedRange, loop: true, intersections };
}

export function buildVehicleRoutes(lots: DevelopmentLot[], crosswalks: Crosswalk[]): VehicleRoute[] {
  const R = LOT_PITCH / 2 - LANE_OFFSET;
  // Right-hand traffic: the block is on the driver's right, so every turn is a tight right turn.
  const routes = lots.map((lot) => {
    const [cx, cz] = lot.position;
    return makeRoute(`block-${lot.id}`, "block", [[cx + R, cz + R], [cx - R, cz + R], [cx - R, cz - R], [cx + R, cz - R]], 1.3, [1.9, 2.5], crosswalks, "clockwise");
  });
  const minX = Math.min(...lots.map((l) => l.position[0])) - LOT_PITCH / 2 - LANE_OFFSET;
  const maxX = Math.max(...lots.map((l) => l.position[0])) + LOT_PITCH / 2 + LANE_OFFSET;
  const minZ = Math.min(...lots.map((l) => l.position[1])) - LOT_PITCH / 2 - LANE_OFFSET;
  const maxZ = Math.max(...lots.map((l) => l.position[1])) + LOT_PITCH / 2 + LANE_OFFSET;
  routes.push(makeRoute("perimeter", "perimeter", [[minX, maxZ], [maxX, maxZ], [maxX, minZ], [minX, minZ]], 2.6, [2.4, 3.1], crosswalks, "counter-clockwise"));
  return routes;
}

/** Height of the ground under a world point. */
export function groundY(lots: DevelopmentLot[], x: number, z: number) {
  for (const lot of lots) {
    const m = Math.max(Math.abs(x - lot.position[0]), Math.abs(z - lot.position[1]));
    if (m <= lot.size[0] / 2) return m < lot.size[0] / 2 - 0.8 ? LAWN_Y : SIDEWALK_Y;
  }
  return ROAD_Y;
}

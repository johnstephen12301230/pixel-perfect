import type { DevelopmentLot } from "@/types/city";
import type { Project } from "@/types/project";
import type { WorkerAnimationState } from "./workers";
import { seeded } from "./workers";
import {
  buildPedestrianGraph, buildVehicleRoutes, groundY,
  type Crosswalk, type P2, type PedEdge, type PedestrianGraph, type SpotDef, type VehicleRoute,
} from "./cityRoutes";

/* ------------------------------- Population ------------------------------- */

export type DeviceTier = "desktop" | "tablet" | "mobile";
export const POPULATION: Record<DeviceTier, { pedestrians: number; vehicles: number }> = {
  desktop: { pedestrians: 16, vehicles: 7 },
  tablet: { pedestrians: 10, vehicles: 4 },
  mobile: { pedestrians: 6, vehicles: 3 },
};
export function deviceTier(width: number, cores = 8): DeviceTier {
  if (width < 640 || cores <= 2) return "mobile";
  if (width < 1024 || cores <= 4) return "tablet";
  return "desktop";
}

/* ------------------------------- Crosswalks ------------------------------- */

export const VEHICLE_PHASE = 10;
export const PED_PHASE = 12;
export const CYCLE = VEHICLE_PHASE + PED_PHASE;
/** Cars stop entering this long before the pedestrian phase. */
export const AMBER = 1.6;
export type CrossingState = "vehicles" | "pedestrians";

/** Simple fixed-cycle priority plus occupancy interlock: cars and pedestrians are never on a crossing together. */
export class CrosswalkController {
  t: number; pedsInside = 0; carsInside = 0;
  constructor(public cw: Crosswalk) { this.t = cw.offset % CYCLE; }
  tick(dt: number) { this.t = (this.t + dt) % CYCLE; this.carsInside = 0; }
  get state(): CrossingState { return this.t < VEHICLE_PHASE ? "vehicles" : "pedestrians"; }
  vehiclesMayEnter() { return this.t < VEHICLE_PHASE - AMBER && this.pedsInside === 0; }
  pedestriansMayStart(duration: number) { return this.t >= VEHICLE_PHASE && CYCLE - this.t >= duration && this.carsInside === 0; }
}

/* -------------------------------- Vehicles -------------------------------- */

export type VehicleKind = "compact" | "sedan" | "van" | "service";
export const VEHICLE_HALF_LEN: Record<VehicleKind, number> = { compact: 0.5, sedan: 0.58, van: 0.6, service: 0.6 };
const ACCEL = 1.4, BRAKE = 2.2, DECEL = 5, TURN_SPEED = 0.95, FOLLOW_GAP = 1.7, STOP_MARGIN = 0.5;
const mod = (a: number, n: number) => ((a % n) + n) % n;

export class VehicleController {
  s: number; v = 0; idx = 0; x = 0; z = 0; yaw = 0; steer = 0; spin = 0;
  pauseT = 0; private nextPause: number;
  readonly half: number;
  constructor(public id: string, public route: VehicleRoute, s0: number, public vmax: number, public kind: VehicleKind, public color: string, private rnd: () => number) {
    this.s = mod(s0, route.length);
    this.half = VEHICLE_HALF_LEN[kind];
    this.nextPause = kind === "van" || kind === "service" ? 12 + rnd() * 20 : Infinity;
    this.sync(0);
    this.yaw = this.heading();
  }

  private heading() {
    const r = this.route, n = r.xs.length, j = (this.idx + 1) % n;
    return Math.atan2(r.xs[j]! - r.xs[this.idx]!, r.zs[j]! - r.zs[this.idx]!);
  }

  private sync(dt: number) {
    const r = this.route, n = r.xs.length;
    while (r.s[this.idx + 1]! <= this.s) this.idx = (this.idx + 1) % n;
    while (r.s[this.idx]! > this.s) this.idx = (this.idx - 1 + n) % n;
    const j = (this.idx + 1) % n;
    const u = (this.s - r.s[this.idx]!) / Math.max(1e-6, r.s[this.idx + 1]! - r.s[this.idx]!);
    this.x = r.xs[this.idx]! + (r.xs[j]! - r.xs[this.idx]!) * u;
    this.z = r.zs[this.idx]! + (r.zs[j]! - r.zs[this.idx]!) * u;
    if (dt > 0) {
      let d = this.heading() - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * (1 - Math.exp(-10 * dt));
      this.steer += (Math.max(-0.5, Math.min(0.5, d * 3)) - this.steer) * (1 - Math.exp(-8 * dt));
    }
  }

  /** Distance along the route to the next turn sample, scanning at most `max` units. */
  private distToTurn(max: number) {
    const r = this.route, n = r.xs.length;
    if (r.turn[this.idx]) return 0;
    for (let k = 1, i = (this.idx + 1) % n; k < n; k++, i = (i + 1) % n) {
      const d = mod(r.s[i]! - this.s, r.length);
      if (d > max) return Infinity;
      if (r.turn[i]) return d;
    }
    return Infinity;
  }

  update(dt: number, sameRoute: VehicleController[], crossings: Map<string, CrosswalkController>) {
    const L = this.route.length;
    let target = this.vmax;
    const dTurn = this.distToTurn(5);
    if (dTurn < Infinity) target = Math.min(target, Math.sqrt(TURN_SPEED * TURN_SPEED + 2 * BRAKE * dTurn));
    for (const o of sameRoute) {
      if (o === this) continue;
      const gap = mod(o.s - this.s, L);
      if (gap > 0 && gap < 5) target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, gap - FOLLOW_GAP)));
    }
    for (const it of this.route.intersections) {
      const cc = crossings.get(it.crosswalkId);
      if (!cc) continue;
      const rel = mod(it.sEnter - this.s + L / 2, L) - L / 2;
      const occupying = rel <= this.half + 0.4 && rel + (it.sExit - it.sEnter) >= -this.half;
      if (occupying) { cc.carsInside++; continue; }
      if (rel > 0 && rel < 7 && !cc.vehiclesMayEnter()) target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, rel - this.half - STOP_MARGIN)));
    }
    if (this.pauseT > 0) { this.pauseT -= dt; target = 0; }
    else if ((this.nextPause -= dt) <= 0 && dTurn > 4 && this.route.intersections.every((it) => Math.abs(mod(it.sEnter - this.s + L / 2, L) - L / 2) > 4)) {
      this.pauseT = 2 + this.rnd() * 2.5; this.nextPause = 18 + this.rnd() * 25;
    }
    this.v = this.v < target ? Math.min(target, this.v + ACCEL * dt) : Math.max(target, this.v - DECEL * dt);
    this.s = mod(this.s + this.v * dt, L);
    this.spin += (this.v * dt) / 0.11;
    this.sync(dt);
  }
}

/* ------------------------------ Pedestrians ------------------------------- */

export const WALK_LAT = 0.14;
export interface PedLook { scale: number; shirt: string; pants: string; skin: string; hair: string; shoe: string; bag: string | null }
type Stage = "in" | "stay" | "out";
interface Dwell { kind: SpotDef["kind"] | "pause"; spot: SpotDef | null; uAt: number; stage: Stage; t: number; dur: number }

const SHIRTS = ["#3d6fa8", "#c76b4a", "#e6e1d6", "#5d8a6a", "#8a5a9a", "#d9a441", "#4a5568", "#b84a62", "#6aa6c8", "#2f3a48"];
const PANTS = ["#2f3a48", "#4b3f35", "#1f2937", "#6b7280", "#334155"];
const SKIN = ["#e9c4a2", "#c9966f", "#8d5d3f", "#f1d3b8", "#b07a55"];
const HAIR = ["#2b2420", "#5a3d2b", "#1d1d22", "#a07a4f", "#c9c1b5"];
const BAGS = ["#2b2f36", "#8a5a3c", "#d9d4cc"];

export class PedestrianController {
  edge!: PedEdge; dir: 1 | -1 = 1; u = 0;
  mode: "walk" | "wait" | "dwell" = "walk";
  dwell: Dwell | null = null;
  lat = WALK_LAT;
  x = 0; z = 0; y = 0.18; yaw = 0; moveSpeed = 0;
  animT: number; animState: WorkerAnimationState = "WALKING"; seated = false;
  leader: PedestrianController | null = null; hasFollower = false;
  private pendingEdge: PedEdge | null = null;
  private facing = 0;
  private placed = false;

  constructor(public id: string, public look: PedLook, public vBase: number, private sim: AmbientSim, private rnd: () => number) {
    this.animT = rnd() * 10;
  }

  start(edge: PedEdge, dir: 1 | -1, u: number) { this.edge = edge; this.dir = dir; this.u = u; this.lat = this.walkLat(); this.planDwell(u + 0.2); }

  get dirVec(): P2 {
    const g = this.sim.graph, A = g.nodes.get(this.edge.a)!.p, B = g.nodes.get(this.edge.b)!.p;
    return [((B[0] - A[0]) / this.edge.len) * this.dir, ((B[1] - A[1]) / this.edge.len) * this.dir];
  }
  private origin(): P2 { return this.sim.graph.nodes.get(this.dir > 0 ? this.edge.a : this.edge.b)!.p; }
  private walkLat() { const d = this.dirVec, n = this.edge.normal; return WALK_LAT * Math.sign(-d[1] * n[0] + d[0] * n[1] || 1); }
  /** Lateral offset on the actor's own right, used by followers. */
  rightVec(): P2 { const d = this.dirVec; return [-d[1], d[0]]; }

  /** Reserve at most one activity along the edge just entered. */
  private planDwell(fromU: number) {
    this.dwell = null;
    if (this.edge.kind !== "sidewalk" || this.leader) return;
    const r = this.rnd;
    for (const spot of this.edge.spots) {
      const uAt = this.dir > 0 ? spot.s : this.edge.len - spot.s;
      if (uAt < fromU || this.sim.reserved.has(spot.id)) continue;
      const p = spot.kind === "bench" ? (this.hasFollower ? 0 : 0.35) : spot.kind === "entrance" ? 0.22 : this.hasFollower ? 0.6 : 0.18;
      if (r() >= p) continue;
      this.sim.reserved.add(spot.id);
      const dur = spot.kind === "bench" ? 7 + r() * 9 : spot.kind === "entrance" ? 4 + r() * 6 : 8 + r() * 10;
      this.dwell = { kind: spot.kind, spot, uAt, stage: "in", t: 0, dur };
      return;
    }
    if (r() < 0.18) {
      const uAt = fromU + r() * Math.max(0, this.edge.len - fromU - 1);
      this.dwell = { kind: "pause", spot: null, uAt, stage: "stay", t: 0, dur: 2 + r() * 2.5 };
    }
  }

  /** Begin the simulation already dwelling at a plaza spot (used for initial chatting groups). */
  startDwelling(edge: PedEdge, spot: SpotDef) {
    this.edge = edge; this.dir = 1; this.u = spot.s; this.lat = spot.depth;
    this.sim.reserved.add(spot.id);
    this.dwell = { kind: spot.kind, spot, uAt: spot.s, stage: "stay", t: 0, dur: 6 + this.rnd() * 10 };
    this.mode = "dwell";
  }

  private chooseNext(): PedEdge {
    const nodeId = this.dir > 0 ? this.edge.b : this.edge.a;
    const node = this.sim.graph.nodes.get(nodeId)!;
    const opts = node.edges.filter((e) => e !== this.edge.id).map((e) => this.sim.graph.edges.get(e)!);
    if (!opts.length) return this.edge;
    const w = opts.map((e) => (e.kind === "crossing" ? 0.45 : 1));
    let pick = this.rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < opts.length; i++) if ((pick -= w[i]!) <= 0) return opts[i]!;
    return opts[opts.length - 1]!;
  }

  private enter(edge: PedEdge, nodeId: string) {
    if (this.edge.kind === "crossing") this.sim.crossings.get(this.edge.crosswalkId!)!.pedsInside--;
    this.edge = edge; this.dir = edge.a === nodeId ? 1 : -1; this.u = 0;
    if (edge.kind === "crossing") this.sim.crossings.get(edge.crosswalkId!)!.pedsInside++;
    this.planDwell(0.6);
  }

  private speedCap() {
    let cap = this.edge.kind === "crossing" ? this.vBase * 1.3 : this.vBase;
    for (const o of this.sim.pedestrians) {
      if (o === this || o.leader || o.edge !== this.edge || o.dir !== this.dir) continue;
      const gap = o.u - this.u;
      if (gap > 0 && gap < 0.45) cap = Math.min(cap, o.mode === "walk" ? o.moveSpeed * 0.9 : Math.max(0, (gap - 0.3) * 2));
    }
    return cap;
  }

  update(dt: number) {
    if (this.leader) return this.follow(dt);
    const d = this.dwell;
    let latTarget = this.walkLat();
    if (this.mode === "walk") {
      const v = this.speedCap();
      this.u += v * dt;
      if (d && this.u >= d.uAt) { this.u = d.uAt; this.mode = "dwell"; d.stage = d.spot ? "in" : "stay"; }
      else if (this.u >= this.edge.len) {
        this.u = this.edge.len;
        this.pendingEdge = this.chooseNext();
        this.mode = this.pendingEdge.kind === "crossing" ? "wait" : "walk";
        if (this.mode === "walk") this.enter(this.pendingEdge, this.dir > 0 ? this.edge.b : this.edge.a);
      }
    } else if (this.mode === "wait") {
      const next = this.pendingEdge!;
      const cc = this.sim.crossings.get(next.crosswalkId!)!;
      const nodeId = this.dir > 0 ? this.edge.b : this.edge.a;
      if (cc.pedestriansMayStart(next.len / (this.vBase * 1.3) + 0.6)) this.enter(next, nodeId);
      else { const g = this.sim.graph, n = g.nodes.get(nodeId)!.p, o = g.nodes.get(next.a === nodeId ? next.b : next.a)!.p; this.facing = Math.atan2(o[0] - n[0], o[1] - n[1]); }
    } else if (d) {
      if (d.stage === "in") { latTarget = d.spot!.depth; if (Math.abs(this.lat - latTarget) < 0.01) { d.stage = "stay"; d.t = 0; } }
      else if (d.stage === "stay") {
        latTarget = d.spot ? d.spot.depth : this.lat;
        if ((d.t += dt) >= d.dur) {
          if (d.spot) this.sim.reserved.delete(d.spot.id);
          if (d.spot) d.stage = "out"; else { this.dwell = null; this.mode = "walk"; }
        }
      } else if (Math.abs(this.lat - latTarget) < 0.01) { this.dwell = null; this.mode = "walk"; }
    }
    const step = 0.4 * dt;
    this.lat += Math.max(-step, Math.min(step, latTarget - this.lat));

    const o = this.origin(), dv = this.dirVec, n = this.edge.normal;
    this.place(o[0] + dv[0] * this.u + n[0] * this.lat, o[1] + dv[1] * this.u + n[1] * this.lat, dt);

    const staying = this.mode === "dwell" && this.dwell?.stage === "stay";
    const k = staying ? this.dwell!.kind : null;
    if (k === "bench") this.facing = Math.atan2(-n[0], -n[1]);
    else if (k === "entrance") this.facing = Math.atan2(n[0], n[1]);
    else if (k === "plaza") this.facing = Math.atan2(dv[0], dv[1]);
    this.seated = k === "bench" && Math.abs(this.lat - this.dwell!.spot!.depth) < 0.02;
    this.animState = this.moveSpeed > 0.05 ? "WALKING" : k === "bench" ? "SITTING" : k === "plaza" ? (this.hasFollower ? "CONVERSING" : "IDLE") : k === "pause" ? "IDLE" : "STANDING";
  }

  private follow(dt: number) {
    const L = this.leader!;
    const chatting = L.mode === "dwell" && L.dwell?.stage === "stay" && L.dwell.kind === "plaza";
    let tx: number, tz: number;
    if (chatting) {
      const f: P2 = [Math.sin(L.yaw), Math.cos(L.yaw)];
      tx = L.x + f[0] * 0.24; tz = L.z + f[1] * 0.24; this.facing = L.yaw + Math.PI;
    } else {
      const r = L.rightVec(); tx = L.x - r[0] * 0.17; tz = L.z - r[1] * 0.17; this.facing = L.facing;
    }
    this.place(tx, tz, dt);
    this.seated = false;
    this.animState = this.moveSpeed > 0.05 ? "WALKING" : chatting ? "CONVERSING" : "STANDING";
  }

  private place(tx: number, tz: number, dt: number) {
    if (!this.placed) { this.x = tx; this.z = tz; this.placed = true; this.yaw = this.facing; }
    const k = 1 - Math.exp(-10 * dt);
    const nx = this.x + (tx - this.x) * k, nz = this.z + (tz - this.z) * k;
    const vx = nx - this.x, vz = nz - this.z;
    const sp = dt > 0 ? Math.hypot(vx, vz) / dt : 0;
    this.moveSpeed += (sp - this.moveSpeed) * (1 - Math.exp(-8 * dt));
    this.x = nx; this.z = nz;
    if (sp > 0.06) this.facing = Math.atan2(vx, vz);
    let dy = this.facing - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * (1 - Math.exp(-9 * dt));
    const gy = groundY(this.sim.lots, this.x, this.z);
    this.y += (gy - this.y) * (1 - Math.exp(-14 * dt));
    if (this.animState === "WALKING") this.animT += dt * (this.moveSpeed / 0.4);
    else this.animT += dt;
  }
}

/* --------------------------------- World ---------------------------------- */

const CAR_COLORS = ["#f4f6f8", "#2f7cf6", "#c0392b", "#1f2937", "#9aa5b1", "#e0b341", "#4f9a7a", "#5b6bd6"];
const KINDS: VehicleKind[] = ["compact", "sedan", "compact", "van", "sedan", "service", "compact", "sedan"];

export class AmbientSim {
  graph: PedestrianGraph;
  routes: VehicleRoute[];
  crossings = new Map<string, CrosswalkController>();
  vehicles: VehicleController[] = [];
  pedestrians: PedestrianController[] = [];
  reserved = new Set<string>();
  private byRoute = new Map<string, VehicleController[]>();

  constructor(public lots: DevelopmentLot[], projects: Project[], counts: { pedestrians: number; vehicles: number }, seed = "devcity") {
    this.graph = buildPedestrianGraph(lots, projects);
    this.routes = buildVehicleRoutes(lots, this.graph.crosswalks);
    for (const cw of this.graph.crosswalks) this.crossings.set(cw.id, new CrosswalkController(cw));
    const rnd = seeded(`${seed}-world`);

    // Vehicles: round-robin over routes, evenly spaced along each loop.
    const perRoute = new Map<string, number>();
    const order = [...this.routes].sort((a, b) => (a.kind === "perimeter" ? -1 : b.kind === "perimeter" ? 1 : 0));
    const assignments = Array.from({ length: counts.vehicles }, (_, i) => order[i % order.length]!);
    assignments.forEach((r) => perRoute.set(r.id, (perRoute.get(r.id) ?? 0) + 1));
    const placed = new Map<string, number>();
    assignments.forEach((route, i) => {
      const k = placed.get(route.id) ?? 0; placed.set(route.id, k + 1);
      const total = perRoute.get(route.id)!;
      const vr = seeded(`${seed}-car-${i}`);
      const vmax = route.speedRange[0] + vr() * (route.speedRange[1] - route.speedRange[0]);
      const v = new VehicleController(`car-${i}`, route, (route.length * (k + vr() * 0.3)) / total, vmax, KINDS[i % KINDS.length]!, KINDS[i % KINDS.length] === "service" ? "#f4f6f8" : CAR_COLORS[(i * 3) % CAR_COLORS.length]!, vr);
      this.vehicles.push(v);
      (this.byRoute.get(route.id) ?? this.byRoute.set(route.id, []).get(route.id)!).push(v);
    });

    // Pedestrians: spread across distinct sidewalk edges; every fourth one walks with the previous as a pair.
    const sidewalks = [...this.graph.edges.values()].filter((e) => e.kind === "sidewalk");
    const plazaEdges = sidewalks.filter((e) => e.spots.some((s) => s.kind === "plaza"));
    let plazaUsed = 0;
    for (let i = 0; i < counts.pedestrians; i++) {
      const pr = seeded(`${seed}-ped-${i}`);
      const pick = <T,>(a: T[]) => a[Math.floor(pr() * a.length)]!;
      const look: PedLook = { scale: 1.18 + pr() * 0.16, shirt: pick(SHIRTS), pants: pick(PANTS), skin: pick(SKIN), hair: pick(HAIR), shoe: "#1e252e", bag: pr() < 0.4 ? pick(BAGS) : null };
      const p = new PedestrianController(`ped-${i}`, look, 0.36 + pr() * 0.16, this, pr);
      const prev = this.pedestrians[i - 1];
      if (i % 4 === 3 && prev && !prev.leader && !prev.hasFollower) {
        p.leader = prev; prev.hasFollower = true; p.vBase = prev.vBase;
        p.edge = prev.edge;
      } else if (i % 4 === 2 && plazaUsed < plazaEdges.length && i + 1 < counts.pedestrians) {
        const e = plazaEdges[(plazaUsed++ * 3) % plazaEdges.length]!;
        p.hasFollower = true;
        p.startDwelling(e, e.spots.find((s) => s.kind === "plaza")!);
        p.hasFollower = false; // re-set when the follower attaches
      } else {
        const e = sidewalks[(i * 5) % sidewalks.length]!;
        p.start(e, pr() < 0.5 ? 1 : -1, pr() * e.len * 0.8);
      }
      this.pedestrians.push(p);
    }
  }

  step(dt: number) {
    for (const c of this.crossings.values()) c.tick(dt);
    for (const v of this.vehicles) v.update(dt, this.byRoute.get(v.route.id)!, this.crossings);
    for (const p of this.pedestrians) p.update(dt);
  }
}

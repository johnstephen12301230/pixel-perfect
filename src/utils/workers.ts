import type { Project } from "@/types/project";
import { getDepartments, type BlockPlan, type Department, type Pt, type ZonePlan } from "./interiorLayout";

export type WorkerAnimationState = "IDLE" | "WALKING" | "TYPING" | "SITTING" | "STANDING" | "PRESENTING" | "MEETING" | "CONVERSING";
export type StationKind = "desk" | "meeting" | "present" | "talk";

/** A place a worker can occupy. `approach` leads from the zone's main aisle to `pos` along clear floor. */
export interface WorkerStation { id: string; kind: StationKind; pos: Pt; facing: number; seated: boolean; approach: Pt[] }

export interface TechnologyEmployee {
  id: string;
  technology: string;
  department: Department;
  responsibility: string;
  projectId: string;
  projectName: string;
  blockIndex: number;
  floorLevel: number;
  floorY: number;
  zoneKey: string;
  /** Building-wide order; drives staggered starting activities. */
  order: number;
  homeStationId: string;
  spawn: Pt;
}

const RESPONSIBILITY: Record<string, string> = {
  react: "Building interactive user interface components",
  typescript: "Keeping application code type-safe",
  javascript: "Writing application logic for the browser",
  "tailwind css": "Styling the interface with utility classes",
  vue: "Building interactive user interface components",
  angular: "Building structured front-end applications",
  "next.js": "Rendering and routing the web application",
  "node.js": "Running server-side services",
  express: "Serving HTTP APIs",
  laravel: "Running server-side application logic",
  django: "Running server-side application logic",
  postgresql: "Managing structured relational data",
  mysql: "Managing structured relational data",
  mongodb: "Managing document data",
  redis: "Caching fast-access data",
  docker: "Packaging services into containers for deployment",
  aws: "Operating cloud infrastructure",
  vercel: "Deploying and hosting the application",
};
export const GENERIC_RESPONSIBILITY = "General engineering support for this project";

export function getResponsibility(technology: string) {
  return RESPONSIBILITY[technology.trim().toLowerCase()] ?? GENERIC_RESPONSIBILITY;
}

/** Stations of one zone, derived from the Phase 3 layout. */
export function getZoneStations(zone: ZonePlan, key: string): WorkerStation[] {
  const { layout, rect } = zone;
  const aisleZ = layout.waypoints[0]![1];
  const corrX = rect.x0 + 0.12;
  const out: WorkerStation[] = layout.workstations.map((ws, i) => {
    const walkZ = ws.seat[1] + 0.17;
    return { id: `${key}:desk${i}`, kind: "desk", pos: ws.seat, facing: Math.PI, seated: true,
      approach: [[corrX, aisleZ], [corrX, walkZ], [ws.seat[0], walkZ], ws.seat] };
  });
  const m = layout.meeting;
  const doorX = m ? m.rect.x1 - 0.16 : 0;
  m?.seats.forEach((seat, i) => out.push({ id: `${key}:meet${i}`, kind: "meeting", pos: seat, seated: true,
    facing: seat[1] < m.table[1] ? 0 : Math.PI, approach: [[doorX, aisleZ], [doorX, seat[1]], seat] }));
  const p = layout.presentation;
  if (p) {
    const approach: Pt[] = m ? [[doorX, aisleZ], [doorX, p.stand[1]], p.stand] : [[p.stand[0], aisleZ], p.stand];
    out.push({ id: `${key}:present`, kind: "present", pos: p.stand, facing: 0, seated: false, approach });
  }
  const cx = (rect.x0 + rect.x1) / 2;
  out.push(
    { id: `${key}:talkA`, kind: "talk", pos: [cx - 0.11, aisleZ], facing: Math.PI / 2, seated: false, approach: [[cx - 0.11, aisleZ]] },
    { id: `${key}:talkB`, kind: "talk", pos: [cx + 0.11, aisleZ], facing: -Math.PI / 2, seated: false, approach: [[cx + 0.11, aisleZ]] },
  );
  return out;
}

/** Path along clear floor: back out of the current station, along the aisle, into the next. */
export function pathBetween(from: WorkerStation | null, fromPos: Pt, to: WorkerStation): Pt[] {
  const out = from ? [...from.approach].reverse().slice(1) : [];
  if (!from) out.push([fromPos[0], to.approach[0]![1]]);
  return [...out, ...to.approach];
}

/** One employee per technology, placed on its department's entry floor. */
export function getEmployees(project: Pick<Project, "id" | "name" | "technologies">, plans: BlockPlan[]): TechnologyEmployee[] {
  const out: TechnologyEmployee[] = [];
  const usedDesks = new Map<string, number>();
  for (const dept of getDepartments(project.technologies)) {
    let found: { b: number; level: number; y: number; zone: ZonePlan; key: string } | null = null;
    plans.forEach((plan, b) => plan.floors.forEach((floor) => floor.zones.forEach((zone, z) => {
      if (!found && zone.entry && zone.department?.id === dept.id) found = { b, level: floor.level, y: floor.y, zone, key: `${b}-${floor.level}-${z}` };
    })));
    if (!found) continue;
    const f = found as { b: number; level: number; y: number; zone: ZonePlan; key: string };
    const stations = getZoneStations(f.zone, f.key);
    const desks = stations.filter((s) => s.kind === "desk");
    for (const technology of dept.technologies) {
      const n = usedDesks.get(f.key) ?? 0;
      usedDesks.set(f.key, n + 1);
      const home = desks[n] ?? stations.find((s) => s.kind === "talk")!;
      out.push({
        id: `${project.id}:${technology.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        technology, department: dept, responsibility: getResponsibility(technology),
        projectId: project.id, projectName: project.name, blockIndex: f.b, floorLevel: f.level, floorY: f.y,
        zoneKey: f.key, order: out.length, homeStationId: home.id, spawn: f.zone.layout.spawnPoints[0]!,
      });
    }
  }
  return out;
}

/** Deterministic PRNG so schedules are stable between visits. */
export function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Exclusive station reservations within a zone. */
export class StationRegistry {
  private owner = new Map<string, string>();
  reserve(stationId: string, employeeId: string) {
    const current = this.owner.get(stationId);
    if (current && current !== employeeId) return false;
    this.release(employeeId);
    this.owner.set(stationId, employeeId);
    return true;
  }
  release(employeeId: string) { for (const [k, v] of this.owner) if (v === employeeId) this.owner.delete(k); }
  occupant(stationId: string) { return this.owner.get(stationId); }
}

export interface Activity { stationId: string; state: WorkerAnimationState; duration: number; walkFirst: boolean }

function stateAt(station: WorkerStation, stations: WorkerStation[], reg: StationRegistry, rnd: () => number): WorkerAnimationState {
  if (station.kind === "desk") return rnd() < 0.2 ? "SITTING" : "TYPING";
  if (station.kind === "meeting") return "MEETING";
  if (station.kind === "present") return "PRESENTING";
  const partner = stations.find((s) => s.kind === "talk" && s.id !== station.id);
  if (partner && reg.occupant(partner.id)) return "CONVERSING";
  return rnd() < 0.5 ? "IDLE" : "STANDING";
}

/** Staggered first activity so the office is already busy when the cutaway opens. */
export function initialActivity(emp: TechnologyEmployee, stations: WorkerStation[], reg: StationRegistry, rnd: () => number, reducedMotion = false): Activity {
  const slot = emp.order % 4;
  const prefs: StationKind[][] = [["desk"], ["desk"], ["meeting", "present", "talk"], ["talk", "present"]];
  const kinds = reducedMotion && slot === 1 ? ["talk", "desk"] as StationKind[] : prefs[slot]!;
  for (const kind of kinds) {
    const candidates = kind === "desk" ? stations.filter((s) => s.id === emp.homeStationId) : stations.filter((s) => s.kind === kind);
    const st = candidates.find((s) => reg.reserve(s.id, emp.id));
    if (st) return { stationId: st.id, state: stateAt(st, stations, reg, rnd), duration: 3 + rnd() * 6, walkFirst: slot === 1 && !reducedMotion };
  }
  reg.reserve(emp.homeStationId, emp.id);
  const home = stations.find((s) => s.id === emp.homeStationId)!;
  return { stationId: home.id, state: stateAt(home, stations, reg, rnd), duration: 4 + rnd() * 5, walkFirst: false };
}

const WEIGHTS: [StationKind, number][] = [["desk", 0.4], ["talk", 0.25], ["meeting", 0.2], ["present", 0.15]];

export function nextActivity(emp: TechnologyEmployee, stations: WorkerStation[], reg: StationRegistry, rnd: () => number, currentId: string): Activity {
  const order = [...WEIGHTS].sort((a, b) => b[1] * rnd() - a[1] * rnd());
  for (const [kind] of order) {
    const pool = (kind === "desk" ? stations.filter((s) => s.id === emp.homeStationId) : stations.filter((s) => s.kind === kind))
      .filter((s) => s.id !== currentId && !reg.occupant(s.id));
    const st = pool[Math.floor(rnd() * pool.length)];
    if (st && reg.reserve(st.id, emp.id)) {
      const desk = st.kind === "desk";
      return { stationId: st.id, state: stateAt(st, stations, reg, rnd), duration: (desk ? 8 : 5) + rnd() * 6, walkFirst: true };
    }
  }
  return { stationId: currentId, state: "IDLE", duration: 3 + rnd() * 3, walkFirst: false };
}

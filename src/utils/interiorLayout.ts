import type { Project } from "@/types/project";

/** Shared storey height for exteriors and interiors. */
export const FLOOR_H = 0.7;
/** Floor slab top relative to a storey base. */
export const SLAB_TOP = 0.04;
const WALL_INSET = 0.2;

export type Pt = [number, number];
export interface Rect { x0: number; z0: number; x1: number; z1: number }

export type DepartmentId = "frontend" | "backend" | "database" | "infrastructure" | "general";
export interface Department { id: DepartmentId; name: string; color: string; technologies: string[] }

const CATALOG: { id: DepartmentId; name: string; color: string; match: string[] }[] = [
  { id: "frontend", name: "Frontend Engineering", color: "#3b82c4", match: ["react", "typescript", "javascript", "vue", "angular", "tailwind css", "next.js", "svelte"] },
  { id: "backend", name: "Backend Services", color: "#4f9a7a", match: ["node.js", "express", "laravel", "django", "nestjs", "fastapi", "go", "php", "python"] },
  { id: "database", name: "Database Operations", color: "#c08a3e", match: ["postgresql", "mysql", "mongodb", "redis", "sqlite", "supabase"] },
  { id: "infrastructure", name: "Infrastructure", color: "#7a6fc4", match: ["docker", "aws", "vercel", "kubernetes", "cloudflare", "terraform"] },
];
const GENERAL = { id: "general" as const, name: "General Engineering", color: "#7d8a96" };

/** Departments derived only from the project's own technology list, in first-seen order. */
export function getDepartments(technologies: string[]): Department[] {
  const out = new Map<DepartmentId, Department>();
  for (const tech of technologies) {
    const hit = CATALOG.find((c) => c.match.includes(tech.trim().toLowerCase())) ?? GENERAL;
    const dept = out.get(hit.id) ?? { id: hit.id, name: hit.name, color: hit.color, technologies: [] };
    dept.technologies.push(tech);
    out.set(hit.id, dept);
  }
  return [...out.values()];
}

/** Spread departments over floors; when there are more departments than floors, share floors. */
export function assignDepartmentsToFloors(departments: Department[], floorCount: number): Department[][] {
  if (floorCount <= 0) return [];
  if (departments.length === 0) return Array.from({ length: floorCount }, () => []);
  if (departments.length <= floorCount)
    return Array.from({ length: floorCount }, (_, i) => [departments[Math.floor((i * departments.length) / floorCount)]!]);
  const per = Math.ceil(departments.length / floorCount);
  return Array.from({ length: floorCount }, (_, i) => departments.slice(i * per, i * per + per));
}

export interface Workstation { desk: Pt; seat: Pt; facing: number }
export interface MeetingRoom { rect: Rect; table: Pt; tableSize: Pt; seats: Pt[] }
export interface PresentationSpot { screen: Pt; width: number; stand: Pt }
export interface ZoneLayout {
  workstations: Workstation[];
  meeting: MeetingRoom | null;
  presentation: PresentationSpot | null;
  /** Phase 4: walkable path nodes and entry points for employees. */
  waypoints: Pt[];
  spawnPoints: Pt[];
  safeAreas: Rect[];
  plant: Pt;
}

const PITCH = 0.62;

export function layoutZone(r: Rect, withMeeting: boolean): ZoneLayout {
  const W = r.x1 - r.x0, D = r.z1 - r.z0;
  let meeting: MeetingRoom | null = null;
  let presentation: PresentationSpot | null = null;
  let back = 0.3;
  if (withMeeting && W >= 1.4 && D >= 1.6) {
    const mw = Math.min(1.5, W * 0.55), md = Math.min(1, D * 0.38);
    const table: Pt = [r.x0 + mw / 2, r.z0 + md / 2 + 0.05];
    const tableSize: Pt = [mw * 0.5, md * 0.3];
    const n = Math.max(1, Math.floor(tableSize[0] / 0.28));
    const seats: Pt[] = [];
    for (let j = 0; j < n; j++) {
      const x = table[0] + (j - (n - 1) / 2) * 0.28;
      seats.push([x, table[1] - tableSize[1] / 2 - 0.1], [x, table[1] + tableSize[1] / 2 + 0.1]);
    }
    meeting = { rect: { x0: r.x0, z0: r.z0, x1: r.x0 + mw, z1: r.z0 + md }, table, tableSize, seats };
    presentation = { screen: [table[0], r.z0 + 0.03], width: Math.min(0.7, mw * 0.5), stand: [table[0] + mw * 0.3, r.z0 + 0.2] };
    back = md;
  } else if (W >= 1.2) {
    const cx = r.x0 + W / 2;
    presentation = { screen: [cx, r.z0 + 0.03], width: Math.min(0.8, W * 0.4), stand: [cx + 0.3, r.z0 + 0.22] };
    back = 0.42;
  }
  const aisleZ = r.z0 + back + 0.17;
  const deskStart = aisleZ + 0.17;
  const cols = Math.min(4, Math.max(0, Math.floor((W - 0.1) / PITCH)));
  const rows = Math.min(3, Math.max(0, Math.floor((r.z1 - deskStart - 0.42) / PITCH) + 1));
  const workstations: Workstation[] = [];
  const waypoints: Pt[] = [[r.x0 + 0.15, aisleZ], [r.x0 + W / 2, aisleZ], [r.x1 - 0.15, aisleZ]];
  const x0 = r.x0 + (W - (cols - 1) * PITCH) / 2;
  for (let row = 0; row < rows; row++) {
    const z = deskStart + 0.11 + row * PITCH;
    for (let c = 0; c < cols; c++) workstations.push({ desk: [x0 + c * PITCH, z], seat: [x0 + c * PITCH, z + 0.17], facing: Math.PI });
    const walk = z + 0.4;
    if (walk < r.z1 - 0.05) waypoints.push([r.x0 + 0.15, walk], [r.x1 - 0.15, walk]);
  }
  return {
    workstations, meeting, presentation, waypoints,
    spawnPoints: [[r.x1 - 0.15, aisleZ]],
    safeAreas: [{ x0: r.x0, z0: aisleZ - 0.1, x1: r.x1, z1: aisleZ + 0.1 }],
    plant: [r.x1 - 0.12, r.z0 + 0.12],
  };
}

export interface BuildingBlock { offset: [number, number, number]; w: number; d: number; floors: number }

/** Exterior massing per style; interiors follow the same footprints. */
export function getBuildingBlocks(project: Pick<Project, "buildingStyle" | "floors">): BuildingBlock[] {
  const f = project.floors;
  if (project.buildingStyle === "corporate-skyscraper") {
    const lower = Math.ceil(f * 0.6);
    return [{ offset: [0, 0, 0], w: 3.6, d: 3.6, floors: lower }, { offset: [0, lower * FLOOR_H, 0], w: 2.6, d: 2.6, floors: f - lower }];
  }
  if (project.buildingStyle === "technology-campus")
    return [{ offset: [-1.1, 0, -0.9], w: 2.6, d: 3, floors: f }, { offset: [1.4, 0, 1], w: 2.4, d: 2.6, floors: Math.max(1, f - 1) }];
  return [{ offset: [0, 0.6, 0], w: 4.2, d: 3.6, floors: f }];
}

export interface ZonePlan { department: Department | null; rect: Rect; layout: ZoneLayout; entry: boolean }
export interface FloorPlan { level: number; y: number; zones: ZonePlan[] }
export interface BlockPlan { block: BuildingBlock; floors: FloorPlan[] }

/** Full interior plan in block-local coordinates (floor surface y). */
export function getInteriorPlan(project: Pick<Project, "buildingStyle" | "floors" | "technologies">): BlockPlan[] {
  const blocks = getBuildingBlocks(project);
  const total = blocks.reduce((n, b) => n + b.floors, 0);
  const assigned = assignDepartmentsToFloors(getDepartments(project.technologies), total);
  let k = 0;
  let prev = "";
  return blocks.map((block) => {
    const hx = block.w / 2 - WALL_INSET, hz = block.d / 2 - WALL_INSET;
    const floors = Array.from({ length: block.floors }, (_, level) => {
      const depts = assigned[k++] ?? [];
      const n = Math.max(1, depts.length);
      const key = depts.map((d) => d.id).join("+");
      const entry = key !== prev;
      prev = key;
      const zones = Array.from({ length: n }, (_, i) => {
        const rect = { x0: -hx + (2 * hx * i) / n, x1: -hx + (2 * hx * (i + 1)) / n, z0: -hz, z1: hz };
        return { department: depts[i] ?? null, rect, layout: layoutZone(rect, entry), entry: entry && !!depts[i] };
      });
      return { level, y: level * FLOOR_H + SLAB_TOP, zones };
    });
    return { block, floors };
  });
}

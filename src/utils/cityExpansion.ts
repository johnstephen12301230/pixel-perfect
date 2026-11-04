import { CITY_LOTS, LOT_PITCH, makeLot } from "@/data/cityLots";
import type { DevelopmentLot } from "@/types/city";

export const EXPANSION_PREFIX = "lot-x";
const DISTRICTS = ["Innovation District", "Technology Quarter", "Enterprise District"];
/** Capacities cycle deterministically; always within 2–4. */
const CAPACITIES: (2 | 3 | 4)[] = [4, 3, 4, 2];

interface Cell { gx: number; gz: number; ring: number }

/** Grid cells (half-index coordinates, like the base 2×2 district) ordered ring by ring, opposite sides alternating for balance. */
function ringCells(ring: number): Cell[] {
  const h = ring + 0.5;
  const cells: Cell[] = [];
  for (let gx = -h; gx <= h; gx++) for (let gz = -h; gz <= h; gz++) if (Math.max(Math.abs(gx), Math.abs(gz)) === h) cells.push({ gx, gz, ring });
  const ang = (c: Cell) => (Math.atan2(c.gz, c.gx) + 2 * Math.PI) % (2 * Math.PI);
  return cells.sort((a, b) => {
    const d = Math.hypot(a.gx, a.gz) - Math.hypot(b.gx, b.gz);
    if (Math.abs(d) > 1e-6) return d;
    const pa = ang(a) % Math.PI, pb = ang(b) % Math.PI;
    return Math.abs(pa - pb) > 1e-6 ? pa - pb : ang(a) - ang(b);
  });
}

/** The n-th expansion cell (0-based), spiralling outward. */
export function expansionCell(n: number): Cell {
  let ring = 1;
  let idx = n;
  for (;;) {
    const cells = ringCells(ring);
    if (idx < cells.length) return cells[idx]!;
    idx -= cells.length;
    ring++;
  }
}

const letter = (i: number) => (i < 22 ? String.fromCharCode(69 + i) : `X${i + 1}`); // E, F, G…

export function makeExpansionLot(n: number): DevelopmentLot {
  const c = expansionCell(n);
  const district = DISTRICTS[(c.ring - 1) % DISTRICTS.length]!;
  return makeLot(`${EXPANSION_PREFIX}${n + 1}`, `Lot ${letter(n)}`, c.gx, c.gz, CAPACITIES[n % CAPACITIES.length]!, district);
}

/** Deterministic lot registry: the base district plus the first `count` expansion lots. */
export function buildCityLots(count: number): DevelopmentLot[] {
  return [...CITY_LOTS, ...Array.from({ length: Math.max(0, count) }, (_, i) => makeExpansionLot(i))];
}

/** Expansion count implied by lot ids referenced in saved projects. */
export function expansionCountFor(lotIds: string[]): number {
  return lotIds.reduce((m, id) => (id.startsWith(EXPANSION_PREFIX) ? Math.max(m, Number(id.slice(EXPANSION_PREFIX.length)) || 0) : m), 0);
}

/** Road grid derived from lot extents: road centerlines between and around all lots, plus overall extent. */
export function roadGrid(lots: DevelopmentLot[]) {
  const h = Math.max(...lots.map((l) => Math.max(Math.abs(l.position[0]), Math.abs(l.position[1])) / LOT_PITCH));
  const r = h + 0.5;
  const lines: number[] = [];
  for (let k = -r; k <= r + 1e-6; k++) lines.push(Math.round(k * LOT_PITCH * 1000) / 1000);
  return { lines, extent: 2 * r * LOT_PITCH + 16 };
}

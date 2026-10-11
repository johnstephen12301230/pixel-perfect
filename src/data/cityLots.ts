import type { BuildingSlot, DevelopmentLot, Vec2 } from "@/types/city";

export const LOT_SIZE = 16;
export const ROAD_WIDTH = 4;
export const LOT_PITCH = LOT_SIZE + ROAD_WIDTH;

/** Balanced slot arrangements per capacity (offsets relative to lot center). */
const LAYOUTS: Record<1 | 2 | 3 | 4, Vec2[]> = {
  1: [[0, 0]],
  2: [
    [-3.8, 0],
    [3.8, 0],
  ],
  3: [
    [-3.8, -3.6],
    [3.8, -3.6],
    [0, 3.8],
  ],
  4: [
    [-3.8, -3.8],
    [3.8, -3.8],
    [-3.8, 3.8],
    [3.8, 3.8],
  ],
};

function makeLot(id: string, name: string, gx: number, gz: number, capacity: 1 | 2 | 3 | 4): DevelopmentLot {
  const slots: BuildingSlot[] = LAYOUTS[capacity].map((offset, i) => ({
    id: `${id}-s${i + 1}`,
    lotId: id,
    offset,
    footprint: [6, 6],
  }));
  return {
    id,
    name,
    position: [gx * LOT_PITCH, gz * LOT_PITCH],
    size: [LOT_SIZE, LOT_SIZE],
    capacity,
    slots,
  };
}

/** Deterministic initial district: a 2×2 grid of lots. */
export const CITY_LOTS: DevelopmentLot[] = [
  makeLot("lot-a", "Lot A", -0.5, -0.5, 2),
  makeLot("lot-b", "Lot B", 0.5, -0.5, 3),
  makeLot("lot-c", "Lot C", -0.5, 0.5, 2),
  makeLot("lot-d", "Lot D", 0.5, 0.5, 4),
];

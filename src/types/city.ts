export type Vec2 = [number, number];

export interface BuildingSlot {
  id: string;
  lotId: string;
  /** Position relative to lot center (x, z). */
  offset: Vec2;
  /** Max footprint (width, depth). */
  footprint: Vec2;
}

export interface DevelopmentLot {
  id: string;
  name: string;
  /** World center (x, z). */
  position: Vec2;
  size: Vec2;
  capacity: 1 | 2 | 3 | 4;
  slots: BuildingSlot[];
}

export interface SlotOccupancy {
  slot: BuildingSlot;
  lot: DevelopmentLot;
  projectId: string | null;
}

import type { DevelopmentLot, SlotOccupancy } from "@/types/city";
import type { Project } from "@/types/project";

export function getSlotOccupancy(lots: DevelopmentLot[], projects: Project[]): SlotOccupancy[] {
  const bySlot = new Map(projects.map((p) => [p.slotId, p.id]));
  return lots.flatMap((lot) =>
    lot.slots.map((slot) => ({ lot, slot, projectId: bySlot.get(slot.id) ?? null })),
  );
}

/** First vacant slot in deterministic lot/slot order, or null when the district is full. */
export function getNextAvailableSlot(lots: DevelopmentLot[], projects: Project[]): SlotOccupancy | null {
  return getSlotOccupancy(lots, projects).find((o) => o.projectId === null) ?? null;
}

export function slotWorldPosition(o: Pick<SlotOccupancy, "lot" | "slot">): [number, number, number] {
  return [o.lot.position[0] + o.slot.offset[0], 0, o.lot.position[1] + o.slot.offset[1]];
}

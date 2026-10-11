import { describe, expect, it } from "vitest";
import { CITY_LOTS } from "@/data/cityLots";
import { PROJECTS } from "@/data/projects";
import { getNextAvailableSlot } from "./cityLayout";

describe("city lots", () => {
  it("initial lot capacities are 2, 3, 2, 4", () => {
    expect(CITY_LOTS.map((l) => l.slots.length)).toEqual([2, 3, 2, 4]);
  });
  it("no lot exceeds four buildings", () => {
    expect(CITY_LOTS.every((l) => l.slots.length <= 4)).toBe(true);
  });
  it("next vacant slot skips occupied slots", () => {
    expect(getNextAvailableSlot(CITY_LOTS, PROJECTS)?.slot.id).toBe("lot-a-s2");
  });
});

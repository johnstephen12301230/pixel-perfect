import { describe, expect, it } from "vitest";
import { buildCityLots, expansionCountFor, makeExpansionLot } from "./cityExpansion";
import { LOT_SIZE } from "@/data/cityLots";

describe("Phase 7 city expansion", () => {
  it("keeps base lots unchanged and ids deterministic", () => {
    const lots = buildCityLots(3);
    expect(lots.slice(0, 4).map((l) => l.id)).toEqual(["lot-a", "lot-b", "lot-c", "lot-d"]);
    expect(makeExpansionLot(0).id).toBe("lot-x1");
    expect(buildCityLots(3)[5]).toEqual(lots[5]);
  });
  it("never overlaps lots across many expansions", () => {
    const lots = buildCityLots(40);
    for (let i = 0; i < lots.length; i++) for (let j = i + 1; j < lots.length; j++) {
      const [a, b] = [lots[i]!.position, lots[j]!.position];
      expect(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))).toBeGreaterThanOrEqual(LOT_SIZE);
    }
  });
  it("keeps every expansion lot within 2–4 buildings", () => {
    for (const l of buildCityLots(20).slice(4)) { expect(l.capacity).toBeGreaterThanOrEqual(2); expect(l.capacity).toBeLessThanOrEqual(4); expect(l.slots.length).toBe(l.capacity); }
  });
  it("derives the expansion count from saved lot ids", () => {
    expect(expansionCountFor(["lot-a", "lot-x3", "lot-x1"])).toBe(3);
  });
});

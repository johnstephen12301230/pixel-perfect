import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/data/projects";
import { cameraBlend, getBuildingCenter, getFocusFraming } from "./cameraFocus";

describe("orthographic focus", () => {
  it("focuses the building slot, not the lot center", () => {
    const project = PROJECTS.find((p) => p.id === "cloud-operations");
    if (!project) throw new Error("Missing test project");
    expect(getBuildingCenter(project)).toEqual([13.8, 1.8599999999999999, 13.8]);
  });
  it("keeps tall buildings in the free viewport above the phone panel", () => {
    const framing = getFocusFraming(390, 844, 11);
    expect(framing.zoom * (11 * 0.7 + 5)).toBeLessThanOrEqual(844 * 0.48 - 110);
    expect(framing.shiftX).toBe(0);
  });
  it("has equivalent damping across frame rates and clamps paused frames", () => {
    expect(1 - (1 - cameraBlend(1 / 60)) ** 2).toBeCloseTo(cameraBlend(1 / 30), 8);
    expect(cameraBlend(5)).toBe(cameraBlend(0.05));
  });
});
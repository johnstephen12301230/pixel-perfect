import { describe, expect, it } from "vitest";
import { CONSTRUCTION_MS, parseSites, progressAt, stageFor, storeyBuild } from "./construction";

describe("Phase 7 construction", () => {
  it("walks stages in order and completes", () => {
    const order = [0, 0.15, 0.4, 0.7, 0.9, 1].map(stageFor);
    expect(order).toEqual(["preparing", "foundation", "framework", "exterior", "finishing", "completed"]);
  });
  it("resumes from the saved start time after a refresh", () => {
    expect(progressAt(1000, 1000 + CONSTRUCTION_MS / 2)).toBeCloseTo(0.5);
  });
  it("does not replay finished construction", () => {
    expect(parseSites(JSON.stringify({ a: 0 }), new Set(["a"]), CONSTRUCTION_MS * 2)).toEqual({});
  });
  it("drops sites for unknown projects", () => {
    expect(parseSites(JSON.stringify({ ghost: 5 }), new Set(["a"]), 10)).toEqual({});
  });
  it("assembles lower floors before upper floors", () => {
    expect(storeyBuild(0.4, 0)).toBeGreaterThan(storeyBuild(0.4, 0.9));
    expect(storeyBuild(1, 1)).toBe(1);
  });
});

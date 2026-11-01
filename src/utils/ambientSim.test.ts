import { describe, expect, it } from "vitest";
import { CITY_LOTS } from "@/data/cityLots";
import { PROJECTS } from "@/data/projects";
import { AmbientSim, POPULATION, deviceTier } from "./ambientSim";
import { BUILDING_HALF } from "./cityRoutes";

const insideLot = (x: number, z: number, pad = 0) =>
  CITY_LOTS.some((l) => Math.abs(x - l.position[0]) < l.size[0] / 2 + pad && Math.abs(z - l.position[1]) < l.size[1] / 2 + pad);
const inFootprint = (x: number, z: number) =>
  CITY_LOTS.some((l) => l.slots.some((s) => Math.abs(x - l.position[0] - s.offset[0]) < BUILDING_HALF && Math.abs(z - l.position[1] - s.offset[1]) < BUILDING_HALF));

describe("Phase 5 living city", () => {
  it("population follows device tiers", () => {
    expect(deviceTier(1440)).toBe("desktop");
    expect(deviceTier(800)).toBe("tablet");
    expect(deviceTier(390)).toBe("mobile");
    expect(new AmbientSim(CITY_LOTS, PROJECTS, POPULATION.desktop).pedestrians).toHaveLength(16);
    expect(new AmbientSim(CITY_LOTS, PROJECTS, POPULATION.mobile).vehicles).toHaveLength(3);
  });

  it("vehicle lanes never touch lots or sidewalks", () => {
    const sim = new AmbientSim(CITY_LOTS, PROJECTS, POPULATION.desktop);
    for (const r of sim.routes) for (let i = 0; i < r.xs.length; i++) expect(insideLot(r.xs[i]!, r.zs[i]!, 0.3)).toBe(false);
  });

  it("cars and pedestrians never share a crossing and never meet, and walkers avoid buildings", () => {
    const sim = new AmbientSim(CITY_LOTS, PROJECTS, POPULATION.desktop);
    let crossings = 0;
    for (let f = 0; f < 30 * 240; f++) {
      sim.step(1 / 30);
      for (const c of sim.crossings.values()) expect(c.pedsInside > 0 && c.carsInside > 0).toBe(false);
      for (const p of sim.pedestrians) {
        expect(inFootprint(p.x, p.z)).toBe(false);
        if (!insideLot(p.x, p.z)) crossings++;
        for (const v of sim.vehicles) expect(Math.hypot(p.x - v.x, p.z - v.z)).toBeGreaterThan(0.45);
      }
    }
    expect(crossings).toBeGreaterThan(0);
    expect(sim.vehicles.every((v) => v.s > 0)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/data/projects";
import { assignDepartmentsToFloors, getDepartments, getInteriorPlan } from "./interiorLayout";

describe("interior departments", () => {
  it("maps technologies to departments and unknowns to General Engineering", () => {
    expect(getDepartments(["React", "Node.js", "PostgreSQL", "Docker", "Rust"]).map((d) => d.name)).toEqual([
      "Frontend Engineering", "Backend Services", "Database Operations", "Infrastructure", "General Engineering",
    ]);
  });
  it("creates no departments that the stack doesn't need", () => {
    expect(getDepartments(["React", "TypeScript", "Tailwind CSS"]).map((d) => d.id)).toEqual(["frontend"]);
  });
  it("shares floors when departments outnumber floors", () => {
    const floors = assignDepartmentsToFloors(getDepartments(["React", "Node.js", "MySQL", "AWS"]), 2);
    expect(floors.map((f) => f.length)).toEqual([2, 2]);
  });
  it("keeps all furniture and walk paths inside every building footprint", () => {
    for (const project of PROJECTS) for (const { block, floors } of getInteriorPlan(project)) {
      const hx = block.w / 2 - 0.05, hz = block.d / 2 - 0.05;
      for (const floor of floors) for (const zone of floor.zones) {
        const pts = [...zone.layout.workstations.flatMap((w) => [w.desk, w.seat]), ...zone.layout.waypoints, ...(zone.layout.meeting?.seats ?? [])];
        for (const [x, z] of pts) { expect(Math.abs(x)).toBeLessThan(hx); expect(Math.abs(z)).toBeLessThan(hz); }
        expect(zone.layout.spawnPoints.length).toBeGreaterThan(0);
      }
    }
  });
});

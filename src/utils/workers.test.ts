import { describe, expect, it } from "vitest";
import { PROJECTS } from "@/data/projects";
import { getInteriorPlan } from "./interiorLayout";
import { GENERIC_RESPONSIBILITY, StationRegistry, getEmployees, getZoneStations, initialActivity, nextActivity, seeded } from "./workers";

const commerce = PROJECTS.find((p) => p.id === "commerce-hq")!;

function setup(project = commerce) {
  const plans = getInteriorPlan(project);
  const employees = getEmployees(project, plans);
  const regs = new Map<string, StationRegistry>();
  const stationsFor = (key: string) => {
    const [b, f, z] = key.split("-").map(Number);
    return getZoneStations(plans[b!]!.floors[f!]!.zones[z!]!, key);
  };
  return { employees, stationsFor, reg: (k: string) => regs.get(k) ?? regs.set(k, new StationRegistry()).get(k)! };
}

describe("technology employees", () => {
  it("creates exactly one employee per project technology, with stable ids", () => {
    for (const p of PROJECTS) {
      const a = getEmployees(p, getInteriorPlan(p));
      expect(a.map((e) => e.technology)).toEqual(p.technologies);
      expect(getEmployees(p, getInteriorPlan(p)).map((e) => e.id)).toEqual(a.map((e) => e.id));
    }
  });
  it("uses a generic responsibility for unknown technologies", () => {
    const p = { ...commerce, technologies: ["Rust"] };
    expect(getEmployees(p, getInteriorPlan(p))[0]!.responsibility).toBe(GENERIC_RESPONSIBILITY);
  });
  it("starts Commerce HQ with typing, walking/standing, and meeting/presenting at once", () => {
    const { employees, stationsFor, reg } = setup();
    const acts = employees.map((e) => initialActivity(e, stationsFor(e.zoneKey), reg(e.zoneKey), seeded(e.id)));
    expect(acts.some((a) => a.state === "TYPING" || a.state === "SITTING")).toBe(true);
    expect(acts.some((a) => a.walkFirst || ["STANDING", "IDLE", "CONVERSING"].includes(a.state))).toBe(true);
    expect(acts.some((a) => a.state === "MEETING" || a.state === "PRESENTING")).toBe(true);
  });
  it("never lets two employees reserve the same station", () => {
    const { employees, stationsFor, reg } = setup({ ...commerce, technologies: ["React", "TypeScript", "Vue", "Angular", "JavaScript"] });
    const taken = new Set<string>();
    const cur = employees.map((e) => initialActivity(e, stationsFor(e.zoneKey), reg(e.zoneKey), seeded(e.id)).stationId);
    cur.forEach((s) => { expect(taken.has(s)).toBe(false); taken.add(s); });
    const rnd = seeded("x");
    for (let step = 0; step < 50; step++) {
      const i = step % employees.length, e = employees[i]!;
      cur[i] = nextActivity(e, stationsFor(e.zoneKey), reg(e.zoneKey), rnd, cur[i]!).stationId;
      expect(new Set(cur).size).toBe(cur.length);
    }
  });
});

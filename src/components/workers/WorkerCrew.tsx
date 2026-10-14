import { useMemo } from "react";
import type { BlockPlan } from "@/utils/interiorLayout";
import { StationRegistry, getZoneStations, initialActivity, seeded, type TechnologyEmployee } from "@/utils/workers";
import { TechWorker } from "./TechWorker";

/** Workers for one building block. Mounted only while the selected building is inspected. */
export function WorkerCrew({ plan, blockIndex, employees }: { plan: BlockPlan; blockIndex: number; employees: TechnologyEmployee[] }) {
  const crew = useMemo(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const zones = new Map<string, { stations: ReturnType<typeof getZoneStations>; registry: StationRegistry }>();
    return employees.filter((e) => e.blockIndex === blockIndex).map((emp) => {
      let z = zones.get(emp.zoneKey);
      if (!z) {
        const [, f, zi] = emp.zoneKey.split("-").map(Number);
        z = { stations: getZoneStations(plan.floors[f!]!.zones[zi!]!, emp.zoneKey), registry: new StationRegistry() };
        zones.set(emp.zoneKey, z);
      }
      const rnd = seeded(emp.id);
      return { emp, ...z, rnd, reduced, first: initialActivity(emp, z.stations, z.registry, rnd, reduced) };
    });
  }, [plan, blockIndex, employees]);
  return <>{crew.map((c) => (
    <TechWorker key={c.emp.id} employee={c.emp} stations={c.stations} registry={c.registry} rnd={c.rnd} first={c.first} reduced={c.reduced} index={c.emp.order} />
  ))}</>;
}

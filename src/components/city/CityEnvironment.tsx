import { useMemo } from "react";
import { CITY_LOTS } from "@/data/cityLots";
import { PROJECTS } from "@/data/projects";
import { getNextAvailableSlot } from "@/utils/cityLayout";
import { CityRoads } from "./CityRoads";
import { DevelopmentLot } from "./DevelopmentLot";

export function CityEnvironment() {
  const nextSlotId = useMemo(() => getNextAvailableSlot(CITY_LOTS, PROJECTS)?.slot.id ?? null, []);
  return (
    <group>
      {/* Diorama base */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <boxGeometry args={[58, 1, 58]} />
        <meshStandardMaterial color="#e9eef3" roughness={0.9} />
      </mesh>
      <mesh position={[0, -1.4, 0]}>
        <boxGeometry args={[57, 0.8, 57]} />
        <meshStandardMaterial color="#9fb2c3" roughness={0.6} />
      </mesh>
      <CityRoads />
      {CITY_LOTS.map((lot) => (
        <DevelopmentLot key={lot.id} lot={lot} projects={PROJECTS} nextSlotId={nextSlotId} />
      ))}
    </group>
  );
}

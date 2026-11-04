import { roadGrid } from "@/utils/cityExpansion";
import { useMemo } from "react";
import { useProjectRegistry } from "@/store/useProjectRegistry";
import { CityRoads } from "./CityRoads";
import { AmbientCity } from "@/components/ambient/AmbientCity";
import { DevelopmentLot } from "./DevelopmentLot";

export function CityEnvironment() {
  const projects = useProjectRegistry((s) => s.projects);
  const lots = useProjectRegistry((s) => s.lots);
  const base = useMemo(() => roadGrid(lots).extent + 2, [lots]);
  return (
    <group>
      {/* Diorama base */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <boxGeometry args={[base, 1, base]} />
        <meshStandardMaterial color="#e9eef3" roughness={0.9} />
      </mesh>
      <mesh position={[0, -1.4, 0]}>
        <boxGeometry args={[base - 1, 0.8, base - 1]} />
        <meshStandardMaterial color="#9fb2c3" roughness={0.6} />
      </mesh>
      <CityRoads lots={lots} />
      <AmbientCity key={lots.length} lots={lots} />
      {lots.map((lot) => (
        <DevelopmentLot key={lot.id} lot={lot} projects={projects} />
      ))}
    </group>
  );
}

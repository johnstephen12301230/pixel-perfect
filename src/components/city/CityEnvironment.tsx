import { CITY_LOTS } from "@/data/cityLots";
import { useProjectRegistry } from "@/store/useProjectRegistry";
import { CityRoads } from "./CityRoads";
import { AmbientCity } from "@/components/ambient/AmbientCity";
import { DevelopmentLot } from "./DevelopmentLot";

export function CityEnvironment() {
  const projects = useProjectRegistry((s) => s.projects);
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
      <AmbientCity />
      {CITY_LOTS.map((lot) => (
        <DevelopmentLot key={lot.id} lot={lot} projects={projects} />
      ))}
    </group>
  );
}

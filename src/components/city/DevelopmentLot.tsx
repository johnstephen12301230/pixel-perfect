import type { DevelopmentLot as Lot } from "@/types/city";
import type { Project } from "@/types/project";
import { ProjectBuilding } from "@/components/buildings/ProjectBuilding";
import { VacantBuildMarker } from "./VacantBuildMarker";
import { Tree } from "./Props";

interface Props {
  lot: Lot;
  projects: Project[];
}

export function DevelopmentLot({ lot, projects }: Props) {
  const [w, d] = lot.size;
  return (
    <group position={[lot.position[0], 0, lot.position[1]]}>
      {/* Sidewalk curb */}
      <mesh position={[0, 0.09, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, 0.18, d]} />
        <meshStandardMaterial color="#d7dee5" roughness={0.8} />
      </mesh>
      {/* Lawn */}
      <mesh position={[0, 0.19, 0]} receiveShadow>
        <boxGeometry args={[w - 1.6, 0.04, d - 1.6]} />
        <meshStandardMaterial color="#a9cfa0" roughness={0.95} />
      </mesh>
      {/* Corner trees */}
      {([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([sx, sz]) => (
        <Tree key={`${sx}${sz}`} position={[sx * (w / 2 - 1.3), 0.2, sz * (d / 2 - 1.3)]} scale={0.9} />
      ))}

      {lot.slots.map((slot) => {
        const project = projects.find((p) => p.slotId === slot.id);
        const pos: [number, number, number] = [slot.offset[0], 0.21, slot.offset[1]];
        if (project) return <ProjectBuilding key={slot.id} project={project} position={pos} />;
        return <VacantBuildMarker key={slot.id} slotId={slot.id} position={pos} />;
      })}
    </group>
  );
}


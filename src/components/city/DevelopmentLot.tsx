import type { DevelopmentLot as Lot } from "@/types/city";
import type { Project } from "@/types/project";
import { ProjectBuilding } from "@/components/buildings/ProjectBuilding";
import { VacantBuildMarker } from "./VacantBuildMarker";
import { Bench, Tree } from "./Props";

interface Props {
  lot: Lot;
  projects: Project[];
  nextSlotId: string | null;
}

export function DevelopmentLot({ lot, projects, nextSlotId }: Props) {
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
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <Tree key={`${sx}${sz}`} position={[sx * (w / 2 - 1.3), 0.2, sz * (d / 2 - 1.3)]} scale={0.9} />
      ))}

      {lot.slots.map((slot) => {
        const project = projects.find((p) => p.slotId === slot.id);
        const pos: [number, number, number] = [slot.offset[0], 0.21, slot.offset[1]];
        if (project) return <ProjectBuilding key={slot.id} project={project} position={pos} />;
        if (slot.id === nextSlotId) return <VacantBuildMarker key={slot.id} slotId={slot.id} position={pos} />;
        return <Plaza key={slot.id} position={pos} />;
      })}
    </group>
  );
}

/** Landscaped placeholder for unoccupied (non-highlighted) slots. */
function Plaza({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.05, 5.4]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[1.1, 1.2, 0.2, 24]} />
        <meshStandardMaterial color="#cfd8df" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.04, 24]} />
        <meshStandardMaterial color="#7cc4e4" metalness={0.2} roughness={0.1} />
      </mesh>
      <Tree position={[-1.9, 0, -1.9]} scale={0.8} />
      <Tree position={[1.9, 0, 1.9]} scale={0.8} />
      <Bench position={[0, 0, -2]} />
      <Bench position={[0, 0, 2]} rotation={Math.PI} />
    </group>
  );
}

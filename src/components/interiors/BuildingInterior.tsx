import { useMemo } from "react";
import { CityLabel } from "@/components/city/CityLabel";
import { WorkerCrew } from "@/components/workers/WorkerCrew";
import type { BlockPlan, Department, FloorPlan, MeetingRoom, PresentationSpot, Rect } from "@/utils/interiorLayout";
import type { TechnologyEmployee } from "@/utils/workers";
import { Glass, OfficeChair, OfficeComputer, OfficeDesk, OfficePlant, Solid, type Placed } from "./OfficeFurniture";

const PART_H = 0.4;

export function MeetingRoomArea({ room, y }: { room: MeetingRoom; y: number }) {
  const { rect, table, tableSize } = room;
  const w = rect.x1 - rect.x0, d = rect.z1 - rect.z0;
  const door = 0.32;
  return (
    <group>
      <Solid position={[table[0], y + 0.17, table[1]]} size={[tableSize[0], 0.03, tableSize[1]]} color="#efe8dc" />
      <Solid position={[table[0], y + 0.08, table[1]]} size={[0.06, 0.16, 0.06]} color="#9aa5b1" />
      {/* Glass partitions: front edge with a door gap, side edge full */}
      <Glass position={[rect.x0 + (w - door) / 2, y + PART_H / 2, rect.z1]} size={[w - door, PART_H, 0.015]} />
      <Glass position={[rect.x1, y + PART_H / 2, rect.z0 + d / 2]} size={[0.015, PART_H, d]} />
    </group>
  );
}

export function PresentationArea({ spot, y, caption }: { spot: PresentationSpot; y: number; caption?: string | undefined }) {
  return (
    <group>
      <Solid position={[spot.screen[0], y + 0.32, spot.screen[1]]} size={[spot.width, 0.24, 0.02]} color="#1f2a37" />
      <mesh position={[spot.screen[0], y + 0.32, spot.screen[1] + 0.012]}>
        <planeGeometry args={[spot.width * 0.9, 0.2]} />
        <meshBasicMaterial color="#9ec9ea" toneMapped={false} transparent />
      </mesh>
      {caption && [0, 1, 2].map((i) => (
        <mesh key={i} position={[spot.screen[0] - spot.width * 0.25 + i * spot.width * 0.25, y + 0.29 + i * 0.02, spot.screen[1] + 0.014]}>
          <planeGeometry args={[spot.width * 0.12, 0.04 + i * 0.04]} />
          <meshBasicMaterial color={caption} toneMapped={false} transparent />
        </mesh>
      ))}
    </group>
  );
}

export function DepartmentLabel({ department, position }: { department: Department; position: [number, number, number] }) {
  return (
    <CityLabel position={position}>
      <div className="glass pointer-events-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: department.color }} />
        {department.name}
      </div>
    </CityLabel>
  );
}

function ZoneCarpet({ rect, y, color }: { rect: Rect; y: number; color: string }) {
  return (
    <mesh position={[(rect.x0 + rect.x1) / 2, y + 0.003, (rect.z0 + rect.z1) / 2]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[rect.x1 - rect.x0 - 0.04, rect.z1 - rect.z0 - 0.04]} />
      <meshStandardMaterial color={color} roughness={0.95} transparent opacity={0.18} depthWrite={false} />
    </mesh>
  );
}

export function OfficeFloor({ floor }: { floor: FloorPlan }) {
  const kits = useMemo(() => {
    const desks: Placed[] = [], chairs: Placed[] = [], plants: Placed[] = [];
    for (const zone of floor.zones) {
      for (const ws of zone.layout.workstations) { desks.push({ p: ws.desk, y: floor.y }); chairs.push({ p: ws.seat, y: floor.y }); }
      for (const seat of zone.layout.meeting?.seats ?? []) chairs.push({ p: seat, y: floor.y });
      plants.push({ p: zone.layout.plant, y: floor.y });
    }
    return { desks, chairs, plants };
  }, [floor]);
  return (
    <group>
      {floor.zones.map((zone, i) => (
        <group key={i}>
          {zone.department && <ZoneCarpet rect={zone.rect} y={floor.y} color={zone.department.color} />}
          {zone.layout.meeting && <MeetingRoomArea room={zone.layout.meeting} y={floor.y} />}
          {zone.layout.presentation && <PresentationArea spot={zone.layout.presentation} y={floor.y} caption={zone.department?.color} />}
          {i > 0 && <Glass position={[zone.rect.x0, floor.y + PART_H / 2, (zone.rect.z0 + zone.rect.z1) / 2]} size={[0.015, PART_H, zone.rect.z1 - zone.rect.z0]} />}
        </group>
      ))}
      <OfficeDesk items={kits.desks} />
      <OfficeComputer items={kits.desks} />
      <OfficeChair items={kits.chairs} />
      <OfficePlant items={kits.plants} />
    </group>
  );
}

/** Detailed interior of one storey (block-local coordinates); mounted only for the selected building. */
export function StoreyInterior({ plan, level, blockIndex, employees, live }: { plan: BlockPlan; level: number; blockIndex: number; employees: TechnologyEmployee[]; live: boolean }) {
  const floor = plan.floors[level];
  if (!floor) return null;
  const hz = plan.block.d / 2;
  return (
    <group>
      <OfficeFloor floor={floor} />
      {live && <WorkerCrew plan={plan} blockIndex={blockIndex} level={level} employees={employees} />}
      {live && floor.zones.filter((z) => z.entry && z.department).map((zone, i) => (
        <DepartmentLabel key={i} department={zone.department!} position={[(zone.rect.x0 + zone.rect.x1) / 2, floor.y + 0.5, hz]} />
      ))}
    </group>
  );
}

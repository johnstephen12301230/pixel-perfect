import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { CityLabel } from "@/components/city/CityLabel";
import { useCityStore } from "@/store/useCityStore";
import type { Activity, StationRegistry, TechnologyEmployee, WorkerStation } from "@/utils/workers";
import { WorkerAnimationController } from "./WorkerAnimationController";
import { WorkerCharacter, emptyRig } from "./WorkerCharacter";
import { WorkerInteractionPopover } from "./WorkerInteractionPopover";
import { environmentFrame, hashEnvironment } from "@/utils/environment";

const TECH_COLORS = ["#2f7cf6", "#14b8c4", "#e0864a", "#5b6bd6", "#d4577b", "#4f9a7a", "#c9a227"];

export function TechWorker({ employee, stations, registry, rnd, first, reduced, index }: {
  employee: TechnologyEmployee; stations: WorkerStation[]; registry: StationRegistry; rnd: () => number; first: Activity; reduced: boolean; index: number;
}) {
  const root = useRef<Group>(null);
  const rig = useMemo(emptyRig, []);
  const ctrl = useMemo(() => new WorkerAnimationController(employee, stations, registry, rnd, first, reduced), [employee, stations, registry, rnd, first, reduced]);
  const [hover, setHover] = useState(false);
  const selected = useCityStore((s) => s.selectedWorkerId === employee.id);
  useEffect(() => () => { registry.release(employee.id); document.body.style.cursor = ""; }, [registry, employee.id]);

  useFrame((_, dt) => {
    const shift = hashEnvironment(employee.department.id) > .45 ? 1 - environmentFrame.darkness * .35 : 1;
    const step = Math.min(dt, 0.05) * shift;
    ctrl.update(step);
    ctrl.apply(rig, step);
    const g = root.current;
    if (g) { g.position.set(ctrl.pos[0], employee.floorY, ctrl.pos[1]); g.rotation.y = ctrl.yaw; }
  });

  const accent = TECH_COLORS[index % TECH_COLORS.length]!;
  return (
    <group ref={root}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={(e) => { e.stopPropagation(); setHover(false); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); if (e.delta <= 4) useCityStore.getState().selectWorker(employee.id); }}>
      {/* Generous invisible hit target: the figure itself is tiny on screen. */}
      <mesh position={[0, 0.16, 0]} visible={false}><boxGeometry args={[0.14, 0.34, 0.14]} /></mesh>
      <WorkerCharacter rig={rig} seed={index * 7 + employee.technology.length} shirt={employee.department.color} accent={accent} highlight={hover || selected} />
      {selected ? (
        <CityLabel position={[0, 0.5, 0]}><WorkerInteractionPopover employee={employee} accent={accent} /></CityLabel>
      ) : hover ? (
        <CityLabel position={[0, 0.42, 0]}>
          <div className="glass pointer-events-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-semibold">{employee.technology}</div>
        </CityLabel>
      ) : null}
    </group>
  );
}

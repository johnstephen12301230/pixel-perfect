import { useEffect, useState } from "react";
import { Html } from "@react-three/drei";
import type { Project } from "@/types/project";
import { useCityStore } from "@/store/useCityStore";

const FLOOR_H = 0.7;
const GLASS = { color: "#b9d8ee", metalness: 0.55, roughness: 0.08, envMapIntensity: 1.4 } as const;
const FRAME = "#f3f6f9";

/** Stacked glass block with floor bands and accent stripe. */
function GlassBlock({ w, d, floors, y = 0, accent, highlight }: { w: number; d: number; floors: number; y?: number; accent: string; highlight: boolean }) {
  const h = floors * FLOOR_H;
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...GLASS} emissive={accent} emissiveIntensity={highlight ? 0.18 : 0} />
      </mesh>
      {Array.from({ length: floors + 1 }, (_, i) => (
        <mesh key={i} position={[0, i * FLOOR_H, 0]}>
          <boxGeometry args={[w + 0.06, 0.08, d + 0.06]} />
          <meshStandardMaterial color={FRAME} roughness={0.5} />
        </mesh>
      ))}
      {/* Mullions */}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[(sx * w) / 2, h / 2, (sz * d) / 2]}>
          <boxGeometry args={[0.12, h, 0.12]} />
          <meshStandardMaterial color={FRAME} />
        </mesh>
      )))}
      <mesh position={[0, h / 2, d / 2 + 0.04]}>
        <boxGeometry args={[0.16, h, 0.04]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}

export function ProjectBuilding({ project, position }: { project: Project; position: [number, number, number] }) {
  const [hover, setHover] = useState(false);
  const selected = useCityStore((s) => s.selectedProjectId === project.id);
  const selectProject = useCityStore((s) => s.selectProject);
  const hl = hover || selected;
  useEffect(() => () => { document.body.style.cursor = ""; }, []);
  const { accentColor: a, floors } = project;

  let body: React.ReactNode;
  let top = 0;
  if (project.buildingStyle === "corporate-skyscraper") {
    const lower = Math.ceil(floors * 0.6);
    const upper = floors - lower;
    top = floors * FLOOR_H + 1.2;
    body = (
      <>
        <GlassBlock w={3.6} d={3.6} floors={lower} accent={a} highlight={hl} />
        <GlassBlock w={2.6} d={2.6} floors={upper} y={lower * FLOOR_H} accent={a} highlight={hl} />
        <mesh position={[0, floors * FLOOR_H + 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.08, 1.2, 6]} />
          <meshStandardMaterial color={FRAME} metalness={0.7} />
        </mesh>
      </>
    );
  } else if (project.buildingStyle === "technology-campus") {
    top = floors * FLOOR_H + 0.6;
    body = (
      <>
        <group position={[-1.1, 0, -0.9]}><GlassBlock w={2.6} d={3} floors={floors} accent={a} highlight={hl} /></group>
        <group position={[1.4, 0, 1]}><GlassBlock w={2.4} d={2.6} floors={floors - 1} accent={a} highlight={hl} /></group>
        <mesh position={[0.15, FLOOR_H * 1.5, 0.05]} castShadow>
          <boxGeometry args={[1.4, 0.5, 0.9]} />
          <meshStandardMaterial color={FRAME} />
        </mesh>
        {/* Roof solar */}
        <mesh position={[-1.1, floors * FLOOR_H + 0.1, -0.9]} rotation-x={-0.2}>
          <boxGeometry args={[2, 0.06, 2.2]} />
          <meshStandardMaterial color="#2d3e5a" metalness={0.6} roughness={0.3} />
        </mesh>
      </>
    );
  } else {
    top = floors * FLOOR_H + 1.2;
    body = (
      <>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 0.6, 4.6]} />
          <meshStandardMaterial color={FRAME} roughness={0.6} />
        </mesh>
        <GlassBlock w={4.2} d={3.6} floors={floors} y={0.6} accent={a} highlight={hl} />
        <mesh position={[0, floors * FLOOR_H + 0.75, 0]} castShadow>
          <boxGeometry args={[4.5, 0.3, 3.9]} />
          <meshStandardMaterial color={FRAME} />
        </mesh>
        <mesh position={[0, floors * FLOOR_H + 1.05, 0]}>
          <boxGeometry args={[1.6, 0.3, 1.2]} />
          <meshStandardMaterial color={a} />
        </mesh>
      </>
    );
  }

  return (
    <group
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); if (e.delta <= 4) selectProject(project.id); }}
    >
      {/* Entry plaza */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[5.8, 0.05, 5.8]} />
        <meshStandardMaterial color={hl ? "#dbe8f6" : "#e6e9ec"} />
      </mesh>
      {body}
      {hl && [[0, -2.9, 5.9, 0.09], [0, 2.9, 5.9, 0.09], [-2.9, 0, 0.09, 5.9], [2.9, 0, 0.09, 5.9]].map(([x, z, w, d], i) => (
        <mesh key={`outline-${i}`} position={[x, 0.07, z]}>
          <boxGeometry args={[w, 0.055, d]} />
          <meshStandardMaterial color={a} emissive={a} emissiveIntensity={selected ? 0.65 : 0.3} />
        </mesh>
      ))}
      {hl && (
        <Html position={[0, top + 0.8, 0]} center zIndexRange={[20, 0]}>
          <div className="glass pointer-events-none whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: a }} />
            {project.name}
          </div>
        </Html>
      )}
    </group>
  );
}

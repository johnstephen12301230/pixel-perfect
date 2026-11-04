import { useMemo } from "react";
import { ROAD_WIDTH } from "@/data/cityLots";
import type { DevelopmentLot } from "@/types/city";
import { getProjects } from "@/store/useProjectRegistry";
import { buildPedestrianGraph } from "@/utils/cityRoutes";
import { roadGrid } from "@/utils/cityExpansion";
import { Streetlight } from "./Props";

/** Road grid, dashes and crosswalks derived from the current lots, so expansion districts connect seamlessly. */
export function CityRoads({ lots }: { lots: DevelopmentLot[] }) {
  const { lines: ROAD_LINES, extent: EXTENT } = useMemo(() => roadGrid(lots), [lots]);
  const CROSSWALKS = useMemo(() => buildPedestrianGraph(lots, getProjects()).crosswalks, [lots]);
  const dashes = useMemo(() => { const n = Math.floor(EXTENT / 4); return Array.from({ length: n }, (_, i) => -((n - 1) * 4) / 2 + i * 4); }, [EXTENT]);
  return (
    <group>
      {ROAD_LINES.map((c) => (
        <group key={c}>
          {/* N-S and E-W roads */}
          <mesh position={[c, 0.01, 0]} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[ROAD_WIDTH, EXTENT]} />
            <meshStandardMaterial color="#5d6a78" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.012, c]} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[EXTENT, ROAD_WIDTH]} />
            <meshStandardMaterial color="#5d6a78" roughness={0.85} />
          </mesh>
          {/* Lane dashes */}
          {dashes.map((t) =>
            ROAD_LINES.some((r) => Math.abs(r - t) < 2.5) ? null : (
              <group key={t}>
                <mesh position={[c, 0.02, t]} rotation-x={-Math.PI / 2}>
                  <planeGeometry args={[0.18, 1.4]} />
                  <meshStandardMaterial color="#f4f6f8" />
                </mesh>
                <mesh position={[t, 0.02, c]} rotation-x={-Math.PI / 2}>
                  <planeGeometry args={[1.4, 0.18]} />
                  <meshStandardMaterial color="#f4f6f8" />
                </mesh>
              </group>
            ),
          )}
        </group>
      ))}
      {/* Crosswalks come from the shared route registry so walkers and drawings always match. */}
      {CROSSWALKS.flatMap((cw) =>
        Array.from({ length: 5 }, (_, i) => {
          const t = -1.6 + i * 0.8;
          const x = cw.axis === "x" ? cw.center[0] + t : cw.center[0];
          const z = cw.axis === "x" ? cw.center[1] : cw.center[1] + t;
          return (
            <mesh key={`${cw.id}-${i}`} position={[x, 0.025, z]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={cw.axis === "x" ? [0.45, 1.1] : [1.1, 0.45]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          );
        }),
      )}
      {/* Streetlights on intersection corners */}
      {ROAD_LINES.flatMap((x) =>
        ROAD_LINES.map((z) => <Streetlight key={`${x}-${z}`} position={[x + 2.4, 0, z + 2.4]} />),
      )}
    </group>
  );
}

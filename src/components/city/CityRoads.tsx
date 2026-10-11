import { LOT_PITCH, ROAD_WIDTH } from "@/data/cityLots";
import { Streetlight } from "./Props";

const EXTENT = 56;
const ROAD_LINES = [-LOT_PITCH, 0, LOT_PITCH];

export function CityRoads() {
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
          {Array.from({ length: 14 }, (_, i) => -26 + i * 4).map((t) =>
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
      {/* Crosswalks at central intersection */}
      {[-1, 1].flatMap((s) =>
        Array.from({ length: 5 }, (_, i) => (
          <group key={`${s}-${i}`}>
            <mesh position={[-1.6 + i * 0.8, 0.025, s * 2.6]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[0.45, 1.1]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            <mesh position={[s * 2.6, 0.025, -1.6 + i * 0.8]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[1.1, 0.45]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        )),
      )}
      {/* Streetlights on intersection corners */}
      {ROAD_LINES.flatMap((x) =>
        ROAD_LINES.map((z) => <Streetlight key={`${x}-${z}`} position={[x + 2.4, 0, z + 2.4]} />),
      )}
    </group>
  );
}

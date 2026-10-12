import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type * as THREE from "three";
import { useCityStore } from "@/store/useCityStore";

export function VacantBuildMarker({ slotId, position }: { slotId: string; position: [number, number, number] }) {
  const plus = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const selected = useCityStore((s) => s.selectedSlotId === slotId);
  const { selectSlot, notify } = useCityStore();

  useFrame((state) => {
    if (!plus.current) return;
    const t = state.clock.elapsedTime;
    plus.current.position.y = 2 + Math.sin(t * 2) * 0.18;
    plus.current.rotation.y = t * 0.8;
  });

  const active = hover || selected;
  return (
    <group
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
      onClick={(e) => {
        e.stopPropagation();
        selectSlot(slotId);
        notify("Construction slot selected. The Build form arrives in a later phase.");
      }}
    >
      {/* Foundation */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[5.4, 0.12, 5.4]} />
        <meshStandardMaterial color="#cbbfa8" roughness={1} />
      </mesh>
      {/* Border markers */}
      {([[0, -2.7, 5.6, 0.14], [0, 2.7, 5.6, 0.14], [-2.7, 0, 0.14, 5.6], [2.7, 0, 0.14, 5.6]] as const).map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.16, z]}>
          <boxGeometry args={[w, 0.08, d]} />
          <meshStandardMaterial color={active ? "#2f7cf6" : "#f2b33d"} emissive={active ? "#2f7cf6" : "#000"} emissiveIntensity={0.4} />
        </mesh>
      ))}
      {/* Corner cones */}
      {([[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]] as const).map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.4, z]} castShadow>
          <coneGeometry args={[0.16, 0.5, 10]} />
          <meshStandardMaterial color="#f08a3c" />
        </mesh>
      ))}
      {/* Floating plus */}
      <group ref={plus} scale={active ? 1.15 : 1}>
        <mesh castShadow>
          <boxGeometry args={[1.3, 0.34, 0.34]} />
          <meshStandardMaterial color="#2f7cf6" metalness={0.3} roughness={0.2} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.34, 1.3, 0.34]} />
          <meshStandardMaterial color="#2f7cf6" metalness={0.3} roughness={0.2} />
        </mesh>
      </group>
      <Html position={[0, 3.4, 0]} center zIndexRange={[20, 0]}>
        <div className="glass pointer-events-none whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold">
          Build New Project
        </div>
      </Html>
    </group>
  );
}

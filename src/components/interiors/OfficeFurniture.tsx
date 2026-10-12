import { Instance, Instances } from "@react-three/drei";
import type { ReactNode } from "react";
import type { Pt } from "@/utils/interiorLayout";

/** Instanced furniture kits: one draw call per part for the whole building. */
export interface Placed { p: Pt; y: number; rot?: number }

function Kit({ items, size, offsetY, offsetZ = 0, color, metal = 0 }: { items: Placed[]; size: [number, number, number]; offsetY: number; offsetZ?: number; color: string; metal?: number }) {
  if (items.length === 0) return null;
  return (
    <Instances limit={items.length} frustumCulled={false}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={metal} />
      {items.map((it, i) => <Instance key={i} position={[it.p[0], it.y + offsetY, it.p[1] + offsetZ]} />)}
    </Instances>
  );
}

export function OfficeDesk({ items }: { items: Placed[] }) {
  return <><Kit items={items} size={[0.44, 0.03, 0.22]} offsetY={0.18} color="#f4efe7" /><Kit items={items} size={[0.4, 0.17, 0.02]} offsetY={0.085} offsetZ={-0.09} color="#c9ced4" /></>;
}
export function OfficeComputer({ items }: { items: Placed[] }) {
  return <><Kit items={items} size={[0.2, 0.12, 0.015]} offsetY={0.27} offsetZ={-0.06} color="#1f2a37" metal={0.4} /><Kit items={items} size={[0.14, 0.008, 0.05]} offsetY={0.2} offsetZ={0.02} color="#dfe3e8" /></>;
}
export function OfficeChair({ items }: { items: Placed[] }) {
  return <><Kit items={items} size={[0.13, 0.025, 0.13]} offsetY={0.11} color="#4a5866" /><Kit items={items} size={[0.13, 0.13, 0.02]} offsetY={0.19} offsetZ={0.065} color="#4a5866" /><Kit items={items} size={[0.025, 0.1, 0.025]} offsetY={0.05} color="#9aa5b1" metal={0.6} /></>;
}
export function OfficePlant({ items }: { items: Placed[] }) {
  return <><Kit items={items} size={[0.08, 0.1, 0.08]} offsetY={0.05} color="#e8e2d8" /><Kit items={items} size={[0.12, 0.16, 0.12]} offsetY={0.18} color="#6f9a6a" /></>;
}

export function Glass({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#cfe6f4" transparent opacity={0.35} roughness={0.05} depthWrite={false} />
    </mesh>
  );
}

export function Solid({ position, size, color, children }: { position: [number, number, number]; size: [number, number, number]; color: string; children?: ReactNode }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.5} />
      {children}
    </mesh>
  );
}

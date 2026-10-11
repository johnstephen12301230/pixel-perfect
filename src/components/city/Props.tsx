type P = { position: [number, number, number]; scale?: number; rotation?: number };

export function Tree({ position, scale = 1 }: P) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 0.9, 6]} />
        <meshStandardMaterial color="#8a6a4f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <icosahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial color="#6fae7a" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0.15, 1.7, 0.1]} castShadow>
        <icosahedronGeometry args={[0.38, 0]} />
        <meshStandardMaterial color="#86c290" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

export function Bench({ position, rotation = 0 }: P) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[1, 0.08, 0.32]} />
        <meshStandardMaterial color="#b98a5e" />
      </mesh>
      <mesh position={[0, 0.48, -0.14]} castShadow>
        <boxGeometry args={[1, 0.3, 0.06]} />
        <meshStandardMaterial color="#b98a5e" />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.14, 0]}>
          <boxGeometry args={[0.06, 0.28, 0.3]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
      ))}
    </group>
  );
}

export function Streetlight({ position }: P) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 2.2, 6]} />
        <meshStandardMaterial color="#6b7785" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.25, 2.2, -0.25]}>
        <boxGeometry args={[0.5, 0.08, 0.2]} />
        <meshStandardMaterial color="#6b7785" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[-0.4, 2.14, -0.4]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#fff6d8" emissive="#ffe7a8" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

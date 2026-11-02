import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, OrthographicCamera } from "@react-three/drei";
import { ProjectBuilding } from "@/components/buildings/ProjectBuilding";
import type { Project } from "@/types/project";

/** Live preview using the same reusable building as the city. Lives in its own canvas, so it never touches a city slot; R3F disposes its resources on unmount. */
export default function BuildingPreview({ project }: { project: Project }) {
  const h = project.floors * 0.7 + 1.2;
  return (
    <Canvas shadows dpr={[1, 2]} className="h-full w-full">
      <OrthographicCamera makeDefault position={[20, 18, 20]} zoom={Math.max(18, 34 - project.floors * 1.4)} />
      <OrbitControls target={[0, h / 2, 0]} enablePan={false} minZoom={10} maxZoom={60} />
      <hemisphereLight args={["#ffffff", "#c9d8e4", 0.9]} />
      <directionalLight position={[10, 20, 8]} intensity={2} castShadow />
      <Environment resolution={64}>
        <Lightformer intensity={2.5} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer intensity={1.2} color="#bfe3ff" position={[-10, 3, 0]} rotation-y={Math.PI / 2} scale={[20, 4, 1]} />
      </Environment>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[7, 0.1, 7]} />
        <meshStandardMaterial color="#dfe6ec" />
      </mesh>
      <ProjectBuilding project={project} position={[0, 0, 0]} interactive={false} />
    </Canvas>
  );
}

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Lightformer } from "@react-three/drei";
import { useCityStore } from "@/store/useCityStore";
import { CityEnvironment } from "./CityEnvironment";
import { CityCameraRig } from "./CityCameraRig";

export function CityCanvas() {
  return (
    <Canvas shadows dpr={[1, 2]} className="!fixed inset-0" onPointerMissed={(event) => {
      const s = useCityStore.getState();
      if (event.type !== "click") return;
      if (s.selectedWorkerId) s.selectWorker(null); else if (s.selectedProjectId) s.selectProject(null);
    }}>
      <CityCameraRig />
      <AdaptiveDpr pixelated={false} />
      <fog attach="fog" args={["#dfeaf3", 90, 180]} />
      <hemisphereLight args={["#ffffff", "#c9d8e4", 0.9]} />
      <directionalLight
        position={[25, 40, 15]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.0005}
      />
      <Environment resolution={128}>
        <Lightformer intensity={2.5} position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
        <Lightformer intensity={1.2} color="#bfe3ff" position={[-12, 3, 0]} rotation-y={Math.PI / 2} scale={[30, 4, 1]} />
        <Lightformer intensity={1} position={[12, 3, 6]} rotation-y={-Math.PI / 2} scale={[30, 3, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <CityEnvironment />
      </Suspense>
    </Canvas>
  );
}

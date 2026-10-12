import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { OrthographicCamera as ThreeCamera, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { PROJECTS } from "@/data/projects";
import { useCityStore } from "@/store/useCityStore";
import { cameraBlend, getBuildingCenter, getFocusFraming } from "@/utils/cameraFocus";

interface Pose { position: Vector3; target: Vector3; zoom: number }

export function CityCameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const overview = useRef<Pose | null>(null);
  const destination = useRef<Pose | null>(null);
  const activeToken = useRef(-1);
  const lastSize = useRef("");
  const { size } = useThree();
  const interaction = useCityStore((s) => s.interaction);
  const sidebarOpen = useCityStore((s) => s.sidebarOpen);
  const moving = interaction === "focusing-building" || interaction === "returning-to-city";

  useEffect(() => () => { document.body.style.cursor = ""; }, []);

  useFrame(({ camera }, rawDelta) => {
    const orbit = controls.current;
    if (!orbit || !(camera instanceof ThreeCamera)) return;
    const state = useCityStore.getState();
    const sizeKey = `${size.width}:${size.height}`;
    if (activeToken.current !== state.cameraResetToken || lastSize.current !== sizeKey) {
      const resized = lastSize.current !== "" && lastSize.current !== sizeKey;
      lastSize.current = sizeKey;
      activeToken.current = state.cameraResetToken;
      // Drain orbit inertia exactly once before taking ownership of the camera.
      orbit.enabled = false;
      orbit.enableDamping = false;
      orbit.update();
      const project = PROJECTS.find((p) => p.id === state.selectedProjectId);
      const center = project ? getBuildingCenter(project) : null;
      if (project && center) {
        if (!overview.current) overview.current = { position: camera.position.clone(), target: orbit.target.clone(), zoom: camera.zoom };
        const framing = getFocusFraming(size.width, size.height, project.floors);
        const target = new Vector3(...center);
        const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        target.addScaledVector(right, framing.shiftX).addScaledVector(up, framing.shiftY);
        destination.current = { target, position: target.clone().add(new Vector3(40, 38, 40)), zoom: framing.zoom };
        if (resized) useCityStore.setState({ interaction: "focusing-building" });
      } else {
        const initial = { position: new Vector3(40, 38, 40), target: new Vector3(), zoom: size.width < 640 ? 11 : 19 };
        destination.current = overview.current ?? initial;
      }
    }
    const goal = destination.current;
    if (!goal) return;
    // OrbitControls' automatic update is disabled; this rig is the sole writer.
    orbit.enabled = false;
    orbit.enableDamping = false;
    const blend = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : cameraBlend(rawDelta);
    camera.position.lerp(goal.position, blend);
    orbit.target.lerp(goal.target, blend);
    camera.zoom += (goal.zoom - camera.zoom) * blend;
    camera.updateProjectionMatrix();
    orbit.update();
    if (camera.position.distanceTo(goal.position) < 0.025 && orbit.target.distanceTo(goal.target) < 0.025 && Math.abs(camera.zoom - goal.zoom) < 0.025) {
      camera.position.copy(goal.position);
      orbit.target.copy(goal.target);
      camera.zoom = goal.zoom;
      camera.updateProjectionMatrix();
      orbit.update();
      destination.current = null;
      if (!state.selectedProjectId) overview.current = null;
      orbit.enableDamping = true;
      orbit.enabled = !state.sidebarOpen;
      state.completeCameraTransition(activeToken.current);
    }
  });

  return <>
    <OrthographicCamera makeDefault position={[40, 38, 40]} zoom={size.width < 640 ? 11 : 19} near={-200} far={400} />
    <OrbitControls ref={controls} makeDefault enabled={!moving && !sidebarOpen} enableDamping minZoom={6} maxZoom={60}
      minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.6} screenSpacePanning={false} />
  </>;
}
import { useEffect, useRef, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";

/** Deferred DOM-root cleanup avoids synchronous unmount inside the scene renderer. */
export function CityLabel({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  const group = useRef<Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const point = useRef(new Vector3());
  const { gl, size } = useThree();
  const root = useRef<Root | null>(null);
  useEffect(() => {
    const host = gl.domElement.parentElement;
    if (!host) return;
    const element = document.createElement("div");
    element.className = "pointer-events-none absolute left-0 top-0 z-20";
    label.current = element;
    host.appendChild(element);
    const domRoot = createRoot(element);
    root.current = domRoot;
    return () => {
      element.remove();
      label.current = null;
      root.current = null;
      queueMicrotask(() => domRoot.unmount());
    };
  }, [gl]);
  useEffect(() => { root.current?.render(children); }, [children]);
  useFrame(({ camera }) => {
    if (!group.current || !label.current) return;
    group.current.getWorldPosition(point.current);
    point.current.project(camera);
    label.current.style.transform = `translate(${(point.current.x + 1) * size.width / 2}px,${(1 - point.current.y) * size.height / 2}px) translate(-50%,-50%)`;
    label.current.style.visibility = Math.abs(point.current.z) <= 1 ? "visible" : "hidden";
  });
  return <group ref={group} position={position} />;
}
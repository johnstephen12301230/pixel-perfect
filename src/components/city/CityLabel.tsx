import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";

/** A label in the existing React root, avoiding nested Html roots on cleanup. */
export function CityLabel({ position, children }: { position: [number, number, number]; children: ReactNode }) {
  const group = useRef<Group>(null);
  const label = useRef<HTMLDivElement>(null);
  const point = useRef(new Vector3());
  const { gl, size } = useThree();
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(gl.domElement.parentElement); }, [gl]);
  useFrame(({ camera }) => {
    if (!group.current || !label.current) return;
    group.current.getWorldPosition(point.current);
    point.current.project(camera);
    label.current.style.transform = `translate(${(point.current.x + 1) * size.width / 2}px,${(1 - point.current.y) * size.height / 2}px) translate(-50%,-50%)`;
    label.current.style.visibility = Math.abs(point.current.z) <= 1 ? "visible" : "hidden";
  });
  return <>
    <group ref={group} position={position} />
    {host && createPortal(<div ref={label} className="pointer-events-none absolute left-0 top-0 z-20">{children}</div>, host)}
  </>;
}
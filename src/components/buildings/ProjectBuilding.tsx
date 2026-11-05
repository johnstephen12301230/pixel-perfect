import { createContext, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { CityLabel } from "@/components/city/CityLabel";
import { StoreyInterior } from "@/components/interiors/BuildingInterior";
import type { Project } from "@/types/project";
import { useCityStore } from "@/store/useCityStore";
import { constructionProgress, useConstruction } from "@/store/useConstruction";
import { easeOut, storeyBuild, windowed } from "@/utils/construction";
import { ConstructionSite } from "@/components/construction/ConstructionSite";
import { defaultFocusDepartment, getEmployees } from "@/utils/workers";
import type { TechnologyEmployee } from "@/utils/workers";
import { FLOOR_H, getBuildingBlocks, getInteriorPlan, type BlockPlan } from "@/utils/interiorLayout";

const GLASS = { color: "#b9d8ee", metalness: 0.55, roughness: 0.08, envMapIntensity: 1.4 } as const;
const FRAME = "#f3f6f9";
const WALL_FADED = 0.08;

/** Cutaway progress 0 (closed) → 1 (open), written per frame without React state. */
const RevealCtx = createContext<MutableRefObject<number>>({ current: 0 });
const tmp = new Vector3();

function setOpacity(mat: MeshStandardMaterial, opacity: number) {
  mat.opacity = opacity;
  mat.depthWrite = opacity > 0.98;
}

/** Facade wall that fades only while it faces the camera, so any inspection angle stays readable. */
function FadeWall({ position, size, normal, accent, highlight }: { position: [number, number, number]; size: [number, number, number]; normal: [number, number, number]; accent?: string; highlight: { color: string; on: boolean } }) {
  const reveal = useContext(RevealCtx);
  const storey = useContext(StoreyCtx);
  const fade = useRef(0);
  const n = useMemo(() => new Vector3(...normal), [normal]);
  const glass = useMemo(() => { const m = new MeshStandardMaterial({ ...GLASS, transparent: true }); m.userData["facade"] = true; return m; }, []);
  const stripe = useMemo(() => { if (!accent) return null; const m = new MeshStandardMaterial({ color: accent, transparent: true }); m.userData["facade"] = true; return m; }, [accent]);
  useEffect(() => { glass.emissive.set(highlight.color); glass.emissiveIntensity = highlight.on ? 0.18 : 0; }, [glass, highlight.color, highlight.on]);
  useEffect(() => () => { glass.dispose(); stripe?.dispose(); }, [glass, stripe]);
  useFrame(({ camera }, dt) => {
    camera.getWorldDirection(tmp).negate();
    tmp.y = 0;
    const facing = tmp.normalize().dot(n) > 0.15 ? 1 : 0;
    const goal = reveal.current * facing;
    fade.current += (goal - fade.current) * (1 - Math.exp(-8 * Math.min(dt, 0.05)));
    if (Math.abs(goal - fade.current) < 0.002) fade.current = goal;
    const keep = 1 - storey.current;
    setOpacity(glass, (1 - fade.current * (1 - WALL_FADED)) * keep);
    if (stripe) setOpacity(stripe, (1 - fade.current) * keep);
  });
  return (
    <group position={position}>
      <mesh material={glass} castShadow receiveShadow><boxGeometry args={size} /></mesh>
      {stripe && <mesh material={stripe} position={[0, 0, 0.03]}><boxGeometry args={[0.16, size[1], 0.04]} /></mesh>}
    </group>
  );
}

/** Roof elements lift and fade with the cutaway. Materials inside must be unshared. */
function RoofReveal({ children, lift = 0.5 }: { children: ReactNode; lift?: number }) {
  const reveal = useContext(RevealCtx);
  const group = useRef<Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const r = reveal.current;
    g.position.y = r * lift;
    g.visible = r < 0.995;
    g.traverse((o) => {
      if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
        o.material.transparent = true;
        setOpacity(o.material, 1 - r);
      }
    });
  });
  return <group ref={group}>{children}</group>;
}

/** Hide progress (0 visible → 1 lifted away) of the storey a mesh belongs to. */
const StoreyCtx = createContext<MutableRefObject<number>>({ current: 0 });
/** Construction progress 0..1 for this building (1 = complete); written per frame, never React state. */
const BuildCtx = createContext<MutableRefObject<number>>({ current: 1 });

/** One storey: slab, facade segment, posts, and its interior. Storeys above the focused floor lift and fade. */
function Storey({ level, hidden, buildH, children }: { level: number; hidden: boolean; buildH: number; children: ReactNode }) {
  const hide = useRef(0);
  const shown = useRef(0);
  const build = useContext(BuildCtx);
  const group = useRef<Group>(null);
  useFrame((_, dt) => {
    const goal = hidden ? 1 : 0;
    const g = group.current;
    const b = build.current >= 1 ? 1 : storeyBuild(build.current, buildH);
    if (!g || (goal === hide.current && g.userData["settled"] && b >= 1)) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    hide.current = reduced ? goal : hide.current + (goal - hide.current) * (1 - Math.exp(-6 * Math.min(dt, 0.05)));
    if (Math.abs(goal - hide.current) < 0.003) hide.current = goal;
    g.userData["settled"] = hide.current === goal;
    // Under construction, storeys drop into place bottom-to-top and fade in.
    const h = Math.max(hide.current, 1 - b);
    shown.current = h;
    g.position.y = level * FLOOR_H + h * 1.2;
    g.visible = h < 0.99;
    g.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const m = o.material as MeshStandardMaterial;
      if (!m || m.userData["shared"] || m.userData["facade"]) return;
      if (m.userData["baseOpacity"] === undefined) m.userData["baseOpacity"] = m.opacity;
      m.transparent = true;
      setOpacity(m, m.userData["baseOpacity"] * (1 - h));
    });
  });
  return <StoreyCtx.Provider value={shown}><group ref={group} position={[0, level * FLOOR_H, 0]}>{children}</group></StoreyCtx.Provider>;
}

function GlassBlock({ w, d, floors, baseY, totalH, cutY, live, accent, highlight, plan, blockIndex, employees }: { w: number; d: number; floors: number; baseY: number; totalH: number; cutY: number; live: boolean; accent: string; highlight: boolean; plan: BlockPlan | null; blockIndex: number; employees: TechnologyEmployee[] }) {
  const H = FLOOR_H;
  const hl = { color: accent, on: highlight };
  return (
    <group>
      {Array.from({ length: floors }, (_, level) => {
        const hidden = baseY + level * H >= cutY - 0.01;
        return (
          <Storey key={level} level={level} hidden={hidden} buildH={Math.min(1, (baseY + level * H) / totalH)}>
            <mesh receiveShadow>
              <boxGeometry args={[w + 0.06, 0.08, d + 0.06]} />
              <meshStandardMaterial color={FRAME} roughness={0.5} />
            </mesh>
            <FadeWall position={[0, H / 2, d / 2]} size={[w, H, 0.04]} normal={[0, 0, 1]} accent={accent} highlight={hl} />
            <FadeWall position={[0, H / 2, -d / 2]} size={[w, H, 0.04]} normal={[0, 0, -1]} highlight={hl} />
            <FadeWall position={[w / 2, H / 2, 0]} size={[0.04, H, d]} normal={[1, 0, 0]} highlight={hl} />
            <FadeWall position={[-w / 2, H / 2, 0]} size={[0.04, H, d]} normal={[-1, 0, 0]} highlight={hl} />
            {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} position={[(sx * w) / 2, H / 2, (sz * d) / 2]}>
                <boxGeometry args={[0.12, H, 0.12]} />
                <meshStandardMaterial color={FRAME} />
              </mesh>
            )))}
            {level === floors - 1 && (
              <RoofReveal lift={0.4}>
                <mesh position={[0, H, 0]} castShadow>
                  <boxGeometry args={[w + 0.06, 0.08, d + 0.06]} />
                  <meshStandardMaterial color={FRAME} roughness={0.5} />
                </mesh>
              </RoofReveal>
            )}
            {plan && (
              <group position={[0, -level * H, 0]}>
                <StoreyInterior plan={plan} level={level} blockIndex={blockIndex} employees={employees} live={live && !hidden} />
              </group>
            )}
          </Storey>
        );
      })}
    </group>
  );
}

/** Child group that grows in during a construction window. */
function BuildStage({ from, to, children }: { from: number; to: number; children: ReactNode }) {
  const build = useContext(BuildCtx);
  const g = useRef<Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const t = easeOut(windowed(build.current, from, to));
    g.current.visible = t > 0.01;
    g.current.scale.set(1, Math.max(0.001, t), 1);
  });
  return <group ref={g}>{children}</group>;
}

export function ProjectBuilding({ project, position, interactive: interactiveProp = true }: { project: Project; position: [number, number, number]; interactive?: boolean }) {
  const constructing = useConstruction((s) => interactiveProp && project.id in s.sites);
  const interactive = interactiveProp && !constructing;
  const build = useRef(constructing ? constructionProgress(project.id) : 1);
  useFrame(() => {
    if (!constructing) { build.current = 1; return; }
    build.current = constructionProgress(project.id);
    if (build.current >= 1) {
      useConstruction.getState().complete(project.id);
      useCityStore.getState().notify("Headquarters Completed");
    }
  });
  const [hover, setHover] = useState(false);
  const selected = useCityStore((s) => s.selectedProjectId === project.id);
  const selectProject = useCityStore((s) => s.selectProject);
  const hl = hover || selected;
  const reveal = useRef(0);
  const [interior, setInterior] = useState(false);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);
  // Interior mounts on selection and unmounts after the facade has closed again.
  useEffect(() => {
    if (selected) { setInterior(true); return; }
    const t = window.setTimeout(() => setInterior(false), 900);
    return () => window.clearTimeout(t);
  }, [selected]);
  useFrame((_, dt) => {
    const s = useCityStore.getState();
    const goal = s.selectedProjectId === project.id && s.interaction === "inspecting-building" ? 1 : 0;
    if (goal === reveal.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reveal.current = reduced ? goal : reveal.current + (goal - reveal.current) * (1 - Math.exp(-(goal ? 4 : 7) * Math.min(dt, 0.05)));
    if (Math.abs(goal - reveal.current) < 0.002) reveal.current = goal;
  });

  const blocks = useMemo(() => getBuildingBlocks(project), [project]);
  const plans = useMemo(() => (interior ? getInteriorPlan(project) : null), [interior, project]);
  const employees = useMemo(() => (plans ? getEmployees(project, plans) : []), [plans, project]);
  const inspecting = useCityStore((s) => s.selectedProjectId === project.id && s.interaction === "inspecting-building");
  const focusId = useCityStore((s) => s.focusedDepartmentId) ?? defaultFocusDepartment(employees);
  const focusEmp = employees.find((e) => e.department.id === focusId);
  const cutY = inspecting && focusEmp ? blocks[focusEmp.blockIndex]!.offset[1] + (focusEmp.floorLevel + 1) * FLOOR_H : Infinity;
  const { accentColor: a, floors } = project;

  let extras: ReactNode = null;
  let top = floors * FLOOR_H + 1.2;
  if (project.buildingStyle === "corporate-skyscraper") {
    extras = (
      <RoofReveal lift={0.6}>
        <mesh position={[0, floors * FLOOR_H + 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.08, 1.2, 6]} />
          <meshStandardMaterial color={FRAME} metalness={0.7} />
        </mesh>
      </RoofReveal>
    );
  } else if (project.buildingStyle === "technology-campus") {
    top = floors * FLOOR_H + 0.6;
    extras = (
      <>
        <mesh position={[0.15, FLOOR_H * 1.5, 0.05]} castShadow>
          <boxGeometry args={[1.4, 0.5, 0.9]} />
          <meshStandardMaterial color={FRAME} />
        </mesh>
        <RoofReveal lift={0.5}>
          <mesh position={[-1.1, floors * FLOOR_H + 0.1, -0.9]} rotation-x={-0.2}>
            <boxGeometry args={[2, 0.06, 2.2]} />
            <meshStandardMaterial color="#2d3e5a" metalness={0.6} roughness={0.3} />
          </mesh>
        </RoofReveal>
      </>
    );
  } else {
    extras = (
      <>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.2, 0.6, 4.6]} />
          <meshStandardMaterial color={FRAME} roughness={0.6} />
        </mesh>
        <RoofReveal lift={0.6}>
          <mesh position={[0, floors * FLOOR_H + 0.75, 0]} castShadow>
            <boxGeometry args={[4.5, 0.3, 3.9]} />
            <meshStandardMaterial color={FRAME} />
          </mesh>
          <mesh position={[0, floors * FLOOR_H + 1.05, 0]}>
            <boxGeometry args={[1.6, 0.3, 1.2]} />
            <meshStandardMaterial color={a} />
          </mesh>
        </RoofReveal>
      </>
    );
  }

  return (
    <BuildCtx.Provider value={build}>
    <RevealCtx.Provider value={reveal}>
      <group
        position={position}
        onPointerOver={(e) => { if (!interactive) return; e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { if (!interactive) return; setHover(false); document.body.style.cursor = ""; }}
        onClick={(e) => { if (!interactive) return; e.stopPropagation(); if (e.delta > 4) return; useCityStore.getState().selectWorker(null); selectProject(project.id); }}
      >
        {constructing && <ConstructionSite progress={build} accent={a} height={top} />}
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <boxGeometry args={[5.8, 0.05, 5.8]} />
          <meshStandardMaterial color={hl ? "#dbe8f6" : "#e6e9ec"} />
        </mesh>
        {blocks.map((b, i) => (
          <group key={i} position={b.offset}>
            <GlassBlock w={b.w} d={b.d} floors={b.floors} baseY={b.offset[1]} totalH={floors * FLOOR_H + 0.6} cutY={cutY} live={inspecting} accent={a} highlight={hl} plan={plans?.[i] ?? null} blockIndex={i} employees={employees} />
          </group>
        ))}
        <BuildStage from={0.84} to={1}>{extras}</BuildStage>
        {hl && ([[0, -2.9, 5.9, 0.09], [0, 2.9, 5.9, 0.09], [-2.9, 0, 0.09, 5.9], [2.9, 0, 0.09, 5.9]] as const).map(([x, z, w, d], i) => (
          <mesh key={`outline-${i}`} position={[x, 0.07, z]}>
            <boxGeometry args={[w, 0.055, d]} />
            <meshStandardMaterial color={a} emissive={a} emissiveIntensity={selected ? 0.65 : 0.3} />
          </mesh>
        ))}
        {hl && !selected && (
          <CityLabel position={[0, top + 0.8, 0]}>
            <div className="glass pointer-events-none whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: a }} />
              {project.name}
            </div>
          </CityLabel>
        )}
      </group>
    </RevealCtx.Provider>
    </BuildCtx.Provider>
  );
}

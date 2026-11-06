import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Fog, DirectionalLight, HemisphereLight, LineBasicMaterial, BufferAttribute, MeshStandardMaterial } from 'three';
import { useEnvironmentStore } from '@/store/useEnvironmentStore';
import { useProjectRegistry } from '@/store/useProjectRegistry';
import { roadGrid } from '@/utils/cityExpansion';
import { advanceTime, darknessAt, environmentFrame as env, hashEnvironment, weatherAt } from '@/utils/environment';
const noop = () => {};
export function CityAtmosphere() {
  const { scene, gl } = useThree();
  const sun = useRef<DirectionalLight>(null), hemi = useRef<HemisphereLight>(null);
  const rainMat = useRef<LineBasicMaterial>(null);
  const revision = useRef(-1), publication = useRef(0);
  const lots = useProjectRegistry(s => s.lots);
  const extent = useMemo(() => roadGrid(lots).extent, [lots]);
  const palette = useRef<Color[]>([]);
  const target = useMemo(() => new Color(), []);
  const positions = useMemo(() => { const a = new Float32Array(180 * 6); for (let i = 0; i < 180; i++) { const x = (hashEnvironment(`rain-x${i}`) - .5) * extent, z = (hashEnvironment(`rain-z${i}`) - .5) * extent, y = hashEnvironment(`rain-y${i}`) * 18; a.set([x,y,z,x-.06,y+.45,z],i*6); } return a; }, [extent]);
  const attribute = useMemo(() => new BufferAttribute(positions, 3), [positions]);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    palette.current = ['morning','afternoon','evening','night','overcast','sun','moon','rain'].map(k => new Color(css.getPropertyValue(`--city-${k}`).trim()));
    scene.background = new Color(); scene.fog = new Fog(new Color(), 90, 180);
    env.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const listener = () => { env.reduced = media.matches; }; media.addEventListener('change', listener);
    const save = () => { useEnvironmentStore.getState().publish(env.minutes, useEnvironmentStore.getState().weather); }; window.addEventListener('pagehide', save);
    return () => { save(); media.removeEventListener('change', listener); window.removeEventListener('pagehide', save); scene.background = null; scene.fog = null; gl.toneMappingExposure = 1; };
  }, [scene, gl]);
  useFrame((_, raw) => {
    const s = useEnvironmentStore.getState(); if (!s.loaded || document.hidden || palette.current.length < 8) return;
    if (revision.current !== s.revision) { env.minutes = s.minutes; revision.current = s.revision; }
    const dt = Math.min(raw, .05), blend = 1 - Math.exp(-dt * 1.8);
    env.minutes = advanceTime(env.minutes, dt, s.speed, s.automatic); env.elapsed += env.reduced ? 0 : dt;
    const weather = s.autoWeather ? weatherAt(env.minutes) : s.weather;
    env.darkness += (darknessAt(env.minutes) - env.darkness) * blend;
    env.rain += ((weather === 'Rainy' ? 1 : 0) - env.rain) * blend;
    env.cloud += ((weather === 'Clear' ? 0 : weather === 'Foggy' ? .45 : .8) - env.cloud) * blend;
    env.fog += ((weather === 'Foggy' ? 1 : 0) - env.fog) * blend;
    const h = env.minutes / 60; const keys = [{h:0,i:3},{h:5,i:3},{h:8,i:0},{h:13,i:1},{h:17,i:1},{h:18.5,i:2},{h:21,i:3},{h:24,i:3}];
    const idx = keys.findIndex(k => k.h > h); const a = keys[Math.max(0, idx-1)], b = keys[idx];
    const colors = palette.current;
    const morning = colors[0], overcast = colors[4], sunlight = colors[5], moonlight = colors[6], rainColor = colors[7];
    const from = a ? colors[a.i] : undefined, to = b ? colors[b.i] : undefined;
    if (!a || !b || !from || !to || !morning || !overcast || !sunlight || !moonlight || !rainColor) return;
    target.copy(from).lerp(to, (h-a.h)/(b.h-a.h)).lerp(overcast, env.cloud * .5);
    if (scene.background instanceof Color) scene.background.lerp(target, blend);
    if (scene.fog instanceof Fog) { scene.fog.color.copy(scene.background instanceof Color ? scene.background : target); scene.fog.near = extent * (1.4 - env.fog * 1.15); scene.fog.far = extent * (3.5 - env.fog * 2.4); }
    if (sun.current) { sun.current.intensity = (2.2 - env.darkness * 1.9) * (1-env.cloud*.65); sun.current.color.copy(sunlight).lerp(moonlight, env.darkness); sun.current.position.set(25*Math.cos(h/24*Math.PI*2), 15+25*(1-env.darkness), 15); }
    if (hemi.current) { hemi.current.intensity = .9 - env.darkness * .42; hemi.current.color.copy(morning).lerp(moonlight, env.darkness); }
    gl.toneMappingExposure = 1 - env.darkness*.12 - env.rain*.08;
    if (rainMat.current) { rainMat.current.opacity = env.rain*.48; rainMat.current.color.copy(rainColor); }
    if (!env.reduced && env.rain > .01) { for (let i=0;i<180;i++) { const k=i*6; const y = (positions[k+1] ?? 18) - dt*12; positions[k+1] = y < 0 ? 18 : y; positions[k+4]=(positions[k+1] ?? 0)+.45; } attribute.needsUpdate=true; }
    publication.current += dt; if (publication.current >= 1) { publication.current=0; s.publish(env.minutes,weather); }
    gl.domElement.dataset['sceneReady'] = '1';
    if (import.meta.env.DEV) { gl.domElement.dataset['darkness'] = env.darkness.toFixed(3); gl.domElement.dataset['rain'] = env.rain.toFixed(3); }
  }, -2);
  return <>
    <hemisphereLight ref={hemi} intensity={.9} />
    <directionalLight ref={sun} position={[25,40,15]} intensity={2.2} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-bias={-.0005} />
    <lineSegments raycast={noop} frustumCulled={false}><bufferGeometry><primitive attach="attributes-position" object={attribute}/></bufferGeometry><lineBasicMaterial ref={rainMat} transparent opacity={0} depthWrite={false}/></lineSegments>
  </>;
}
/** Applies to tagged existing materials, including roads and streetlights; no new lights. */
export function EnvironmentalMaterials() {
  const { scene } = useThree(); const materials = useRef<MeshStandardMaterial[]>([]);
  useEffect(() => { const update = () => { const found = new Set<MeshStandardMaterial>(); scene.traverse(o => { const mat = (o as unknown as { material?: MeshStandardMaterial | MeshStandardMaterial[] }).material; for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) if (m.userData['streetlamp'] || m.userData['wetRoad']) found.add(m); }); materials.current = [...found]; }; update(); const id = window.setInterval(update, 1000); return () => window.clearInterval(id); }, [scene]);
  useFrame(() => { for (const m of materials.current) { if (m.userData['streetlamp']) m.emissiveIntensity = env.darkness*1.8; if (m.userData['wetRoad']) { m.roughness=.85-env.rain*.6; m.metalness=env.rain*.25; } } });
  return null;
}

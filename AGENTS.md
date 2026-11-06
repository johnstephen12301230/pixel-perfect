<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## DevCity architecture
- City layout is data-driven: lots/slots in src/data/cityLots.ts, projects in src/data/projects.ts; buildings are generated from typed data, never one component per project. Why: the city must expand as projects are added.
- UI/scene state lives in a Zustand store (src/store/useCityStore.ts) with explicit interaction states. Why: prevents conflicting camera/selection transitions.
- The 3D route (/projects) uses ssr:false; Portfolio has no WebGL. Why: Canvas can't server-render and Portfolio shouldn't pay for 3D.
- Frontend-only: no backend, auth or database. Why: owner requirement.
- Camera motion is owned by CityCameraRig; disable orbit updates and drain damping during tokenized transitions, then restore controls only on completion. Why: focus, return, and rapid re-selection must never fight user orbit input or finish stale transitions.
- ProjectDetailsPanel is a DOM overlay on /projects backed by the existing project registry. Why: details stay accessible and Portfolio remains free of WebGL.
- In-world labels use CityLabel DOM roots with deferred cleanup. Why: avoid synchronous DOM-root unmount inside the 3D renderer during selection and route cleanup.
- Interiors are generated from project data by src/utils/interiorLayout.ts (blocks, departments, per-zone workstations/waypoints/spawn points) and mounted only for the selected building. Why: one source of truth for exteriors, interiors, and future employees.
- The cutaway is driven by a per-building reveal ref (no React state per frame); facade walls fade only while facing the camera, roofs lift and fade. Why: readable from any orbit angle without re-renders.
- Employees come from src/utils/workers.ts (one per technology, stations from the Phase 3 zone layout, seeded scheduler with exclusive station reservations); each TechWorker owns a WorkerAnimationController in a ref and never writes store state per frame. Why: deterministic, collision-free activity without React re-renders.
- Storeys are separate groups; storeys above the focused department floor lift and fade during inspection. Why: lower floors are otherwise covered by the slabs above in the isometric view.
- Outdoor life (Phase 5) is one AmbientSim (src/utils/ambientSim.ts) over routes derived from lot data in src/utils/cityRoutes.ts, rendered by AmbientCity with instanced, non-raycasting meshes and a single frame loop. Why: scales with new lots, stays cheap, never steals building clicks.
- The live project list is src/store/useProjectRegistry.ts (bundled projects + validated localStorage drafts, versioned key); read projects from it, never import PROJECTS directly in UI/scene code. Why: owner-built projects must appear everywhere without duplicate registries.
- Project creation is one BuildProjectDialog opened via useCityStore.openBuilder(slotId) from both the header and vacant slot markers; its preview reuses ProjectBuilding (interactive=false) in a separate canvas. Why: one workflow, and the preview matches the city building without occupying a slot.
- Construction is time-based: src/store/useConstruction.ts persists projectId→start time separately from the project; progress = elapsed/duration, so refresh resumes and completed sites never replay. ProjectBuilding reads it via a BuildCtx ref (storeys drop in bottom-up, extras grow in) and mounts ConstructionSite only while active. Why: one building component, no per-frame React state.
- Lots come from the registry (`lots`): base CITY_LOTS plus deterministic expansion lots from src/utils/cityExpansion.ts (ring-ordered grid cells, ids lot-xN, count derived from saved lot ids); roads/ground size derive from lots via roadGrid. Why: the city grows symmetrically without moving existing lots.
- Phase 8 uses one CityAtmosphere frame stepper (priority -2), pure environment rules and a separate versioned useEnvironmentStore; environmentFrame is the shared mutable render snapshot and UI/persistence publishes once per simulated second. Why: smooth centralized transitions without per-frame React renders or offline time jumps.
- Environment material colors are CSS city tokens; windows use deterministic project/block/floor/facade identifiers and street/road materials are tagged for shared updates. Why: existing and expanded buildings/districts inherit environment effects without changing designs or adding real-time lights.
- Environment browser probes use canvas data-scene-ready, data-darkness and data-rain (latter two dev-only). Why: browser checks can wait for rendered transitions rather than arbitrary delays.

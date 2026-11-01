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

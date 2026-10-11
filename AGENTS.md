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

import { create } from "zustand";
import { CONSTRUCTION_KEY, parseSites, progressAt } from "@/utils/construction";

function storage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}
function persist(sites: Record<string, number>) {
  try { storage()?.setItem(CONSTRUCTION_KEY, JSON.stringify(sites)); } catch { /* construction still finishes visually; project itself is already saved */ }
}

interface ConstructionStore {
  /** projectId → construction start time (ms epoch). Absent = completed. */
  sites: Record<string, number>;
  /** Project whose progress panel is shown. */
  watchingId: string | null;
  hydrate: (projectIds: string[]) => void;
  start: (projectId: string) => void;
  complete: (projectId: string) => void;
  dismiss: () => void;
}

export const useConstruction = create<ConstructionStore>((set, get) => ({
  sites: {},
  watchingId: null,
  hydrate: (ids) => {
    let raw: string | null = null;
    try { raw = storage()?.getItem(CONSTRUCTION_KEY) ?? null; } catch { raw = null; }
    const sites = parseSites(raw, new Set(ids), Date.now());
    persist(sites);
    const first = Object.keys(sites)[0] ?? null;
    set({ sites, watchingId: first });
  },
  start: (id) => {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { set({ watchingId: id }); return; }
    const sites = { ...get().sites, [id]: Date.now() };
    persist(sites);
    set({ sites, watchingId: id });
  },
  complete: (id) => {
    if (!(id in get().sites)) return;
    const { [id]: _done, ...rest } = get().sites;
    persist(rest);
    set({ sites: rest });
  },
  dismiss: () => set({ watchingId: null }),
}));

export const constructionProgress = (id: string, now = Date.now()) => {
  const t = useConstruction.getState().sites[id];
  return t === undefined ? 1 : progressAt(t, now);
};

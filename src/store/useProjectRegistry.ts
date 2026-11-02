import { create } from "zustand";
import { CITY_LOTS } from "@/data/cityLots";
import { PROJECTS } from "@/data/projects";
import type { Project } from "@/types/project";
import { checkSlot, loadLocalProjects, serializeLocalProjects, STORAGE_KEY } from "@/utils/projectDraft";

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    const k = "__devcity_probe__";
    s.setItem(k, "1");
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

interface RegistryState {
  /** Built-in projects first, then local drafts. Existing entries keep object identity. */
  projects: Project[];
  localIds: string[];
  storageAvailable: boolean;
  loaded: boolean;
  rejectedOnLoad: number;
  hydrate: () => void;
  /** Validates the slot, persists, then registers. Returns an error message on failure. */
  addProject: (project: Project) => { ok: true; persisted: boolean } | { ok: false; reason: string };
}

export const useProjectRegistry = create<RegistryState>((set, get) => ({
  projects: PROJECTS,
  localIds: [],
  storageAvailable: true,
  loaded: false,
  rejectedOnLoad: 0,
  hydrate: () => {
    if (get().loaded) return;
    const storage = getStorage();
    const res = loadLocalProjects(storage, CITY_LOTS, PROJECTS);
    set({ projects: [...PROJECTS, ...res.projects], localIds: res.projects.map((p) => p.id), storageAvailable: res.available, loaded: true, rejectedOnLoad: res.rejected });
  },
  addProject: (project) => {
    const { projects, localIds } = get();
    if (projects.some((p) => p.id === project.id)) return { ok: false, reason: "A project with this ID already exists. Try again." };
    const slot = checkSlot(CITY_LOTS, projects, project.lotId, project.slotId);
    if (!slot.ok) return slot;
    const local = [...projects.filter((p) => localIds.includes(p.id)), project];
    let persisted = false;
    const storage = getStorage();
    if (storage) {
      try { storage.setItem(STORAGE_KEY, serializeLocalProjects(local)); persisted = true; } catch { persisted = false; }
    }
    set({ projects: [...projects, project], localIds: [...localIds, project.id], storageAvailable: !!storage && persisted });
    return { ok: true, persisted };
  },
}));

export const getProjects = () => useProjectRegistry.getState().projects;
export const findProject = (id: string | null) => (id ? getProjects().find((p) => p.id === id) : undefined);

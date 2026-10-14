import { create } from "zustand";
import { PROJECTS } from "@/data/projects";

export type InteractionState =
  | "city-overview"
  | "focusing-building"
  | "inspecting-building"
  | "returning-to-city"
  | "focusing-construction-slot";

interface CityState {
  interaction: InteractionState;
  selectedProjectId: string | null;
  selectedSlotId: string | null;
  selectedWorkerId: string | null;
  selectWorker: (id: string | null) => void;
  sidebarOpen: boolean;
  cameraResetToken: number;
  notice: string | null;
  setSidebarOpen: (open: boolean) => void;
  selectProject: (id: string | null) => void;
  selectSlot: (id: string | null) => void;
  resetCity: () => void;
  notify: (msg: string) => void;
  clearNotice: () => void;
  completeCameraTransition: (token: number) => void;
}

export const useCityStore = create<CityState>((set) => ({
  interaction: "city-overview",
  selectedProjectId: null,
  selectedSlotId: null,
  selectedWorkerId: null,
  selectWorker: (selectedWorkerId) => set({ selectedWorkerId }),
  sidebarOpen: false,
  cameraResetToken: 0,
  notice: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  selectProject: (id) => {
    if (id && !PROJECTS.some((project) => project.id === id)) return;
    set((s) => {
      if (id === s.selectedProjectId) return s;
      return { selectedProjectId: id, selectedSlotId: null, selectedWorkerId: null, notice: null,
        cameraResetToken: s.cameraResetToken + 1,
        interaction: id ? "focusing-building" : "returning-to-city" };
    });
  },
  selectSlot: (id) =>
    set((s) => ({ selectedSlotId: id, selectedProjectId: null, selectedWorkerId: null,
      cameraResetToken: s.cameraResetToken + 1,
      interaction: id ? "focusing-construction-slot" : "returning-to-city" })),
  resetCity: () =>
    set((s) => ({
      selectedProjectId: null,
      selectedSlotId: null,
      selectedWorkerId: null,
      interaction: "returning-to-city",
      cameraResetToken: s.cameraResetToken + 1,
    })),
  notify: (notice) => set({ notice }),
  clearNotice: () => set({ notice: null }),
  completeCameraTransition: (token) => set((s) => {
    if (token !== s.cameraResetToken) return s;
    return { interaction: s.selectedProjectId ? "inspecting-building" : s.selectedSlotId ? "focusing-construction-slot" : "city-overview" };
  }),
}));

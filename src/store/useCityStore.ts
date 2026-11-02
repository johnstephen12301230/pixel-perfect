import { create } from "zustand";
import { getProjects } from "./useProjectRegistry";

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
  focusedDepartmentId: string | null;
  focusDepartment: (id: string | null) => void;
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
  builderOpen: boolean;
  openBuilder: (slotId: string) => void;
  closeBuilder: () => void;
}

export const useCityStore = create<CityState>((set) => ({
  interaction: "city-overview",
  selectedProjectId: null,
  selectedSlotId: null,
  selectedWorkerId: null,
  focusedDepartmentId: null,
  focusDepartment: (focusedDepartmentId) => set({ focusedDepartmentId, selectedWorkerId: null }),
  selectWorker: (selectedWorkerId) => set({ selectedWorkerId }),
  sidebarOpen: false,
  cameraResetToken: 0,
  notice: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  selectProject: (id) => {
    if (id && !getProjects().some((project) => project.id === id)) return;
    set((s) => {
      if (id === s.selectedProjectId) return s;
      return { selectedProjectId: id, selectedSlotId: null, selectedWorkerId: null, notice: null,
        cameraResetToken: s.cameraResetToken + 1,
        interaction: id ? "focusing-building" : "returning-to-city" };
    });
  },
  selectSlot: (id) =>
    set((s) => ({ selectedSlotId: id, selectedProjectId: null, selectedWorkerId: null, focusedDepartmentId: null,
      cameraResetToken: s.cameraResetToken + 1,
      interaction: id ? "focusing-construction-slot" : "returning-to-city" })),
  resetCity: () =>
    set((s) => ({
      selectedProjectId: null,
      selectedSlotId: null,
      selectedWorkerId: null,
      focusedDepartmentId: null,
      interaction: "returning-to-city",
      cameraResetToken: s.cameraResetToken + 1,
    })),
  notify: (notice) => set({ notice }),
  clearNotice: () => set({ notice: null }),
  builderOpen: false,
  openBuilder: (slotId) => set((s) => ({ builderOpen: true, sidebarOpen: false, notice: null, selectedSlotId: slotId, selectedProjectId: null, selectedWorkerId: null, focusedDepartmentId: null,
    cameraResetToken: s.selectedSlotId === slotId ? s.cameraResetToken : s.cameraResetToken + 1,
    interaction: "focusing-construction-slot" })),
  closeBuilder: () => set((s) => ({ builderOpen: false, selectedSlotId: null, cameraResetToken: s.cameraResetToken + 1, interaction: s.selectedProjectId ? s.interaction : "returning-to-city" })),
  completeCameraTransition: (token) => set((s) => {
    if (token !== s.cameraResetToken) return s;
    return { interaction: s.selectedProjectId ? "inspecting-building" : s.selectedSlotId ? "focusing-construction-slot" : "city-overview" };
  }),
}));

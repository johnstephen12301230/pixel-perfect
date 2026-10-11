import { create } from "zustand";

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
  sidebarOpen: boolean;
  cameraResetToken: number;
  notice: string | null;
  setSidebarOpen: (open: boolean) => void;
  selectProject: (id: string | null) => void;
  selectSlot: (id: string | null) => void;
  resetCity: () => void;
  notify: (msg: string) => void;
  clearNotice: () => void;
}

export const useCityStore = create<CityState>((set) => ({
  interaction: "city-overview",
  selectedProjectId: null,
  selectedSlotId: null,
  sidebarOpen: false,
  cameraResetToken: 0,
  notice: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  selectProject: (id) =>
    set({ selectedProjectId: id, selectedSlotId: null, interaction: id ? "inspecting-building" : "city-overview" }),
  selectSlot: (id) =>
    set({ selectedSlotId: id, selectedProjectId: null, interaction: id ? "focusing-construction-slot" : "city-overview" }),
  resetCity: () =>
    set((s) => ({
      selectedProjectId: null,
      selectedSlotId: null,
      interaction: "city-overview",
      cameraResetToken: s.cameraResetToken + 1,
    })),
  notify: (notice) => set({ notice }),
  clearNotice: () => set({ notice: null }),
}));

import { getLots } from "@/store/useProjectRegistry";
import type { Project } from "@/types/project";
import { slotWorldPosition } from "./cityLayout";

export function getBuildingCenter(project: Project): [number, number, number] | null {
  const lot = getLots().find((item) => item.id === project.lotId);
  const slot = lot?.slots.find((item) => item.id === project.slotId);
  if (!lot || !slot) return null;
  const [x, , z] = slotWorldPosition({ lot, slot });
  return [x, 0.21 + (project.floors * 0.7 + 1.2) / 2, z];
}

export function getFocusFraming(width: number, height: number, floors: number) {
  const mobile = width < 640;
  const availableWidth = mobile ? width - 40 : width - 440;
  const availableHeight = mobile ? height * 0.48 - 110 : height - 160;
  const zoom = Math.max(6, Math.min(60, availableWidth / 13, availableHeight / (floors * 0.7 + 5)));
  return { zoom, shiftX: mobile ? 0 : 204 / zoom, shiftY: mobile ? -height * 0.22 / zoom : -25 / zoom };
}

export function cameraBlend(delta: number) {
  return 1 - Math.exp(-6 * Math.min(Math.max(delta, 0), 0.05));
}
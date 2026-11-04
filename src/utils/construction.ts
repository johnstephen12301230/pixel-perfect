export type ConstructionState = "queued" | "preparing" | "foundation" | "framework" | "exterior" | "finishing" | "completed";

export const CONSTRUCTION_MS = 16000;
export const CONSTRUCTION_KEY = "devcity.construction.v1";

/** Stage windows over overall progress 0..1. */
export const STAGES: { state: Exclude<ConstructionState, "queued" | "completed">; label: string; message: string; from: number; to: number }[] = [
  { state: "preparing", label: "Site preparation", message: "Marking out the site…", from: 0, to: 0.12 },
  { state: "foundation", label: "Foundation", message: "Pouring the foundation slab…", from: 0.12, to: 0.26 },
  { state: "framework", label: "Structural framework", message: "Raising floors from the ground up…", from: 0.26, to: 0.62 },
  { state: "exterior", label: "Exterior development", message: "Fitting facade panels and glass…", from: 0.62, to: 0.84 },
  { state: "finishing", label: "Finishing", message: "Adding the roof, signage and lighting…", from: 0.84, to: 1 },
];

export function progressAt(startedAt: number, now: number, duration = CONSTRUCTION_MS) {
  if (!Number.isFinite(startedAt)) return 1;
  return Math.min(1, Math.max(0, (now - startedAt) / duration));
}

export function stageFor(progress: number): ConstructionState {
  if (progress >= 1) return "completed";
  return STAGES.find((s) => progress < s.to)!.state;
}

export const stageInfo = (state: ConstructionState) => STAGES.find((s) => s.state === state);

/** 0..1 local progress inside a window. */
export const windowed = (p: number, from: number, to: number) => Math.min(1, Math.max(0, (p - from) / (to - from)));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Build amount for a storey whose base sits at fraction `h` (0 bottom → 1 top) of the building: floors assemble bottom to top over framework+exterior. */
export function storeyBuild(p: number, h: number) {
  const start = 0.26 + h * 0.42;
  return easeOut(windowed(p, start, start + 0.16));
}

/** Parse persisted site start times; drop invalid entries. */
export function parseSites(raw: string | null, knownIds: Set<string>, now: number): Record<string, number> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [id, t] of Object.entries(obj ?? {}))
      if (knownIds.has(id) && typeof t === "number" && Number.isFinite(t) && t <= now && progressAt(t, now) < 1) out[id] = t;
    return out;
  } catch {
    return {};
  }
}

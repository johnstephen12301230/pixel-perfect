import type { DevelopmentLot } from "@/types/city";
import type { BuildingStyle, Project, TechnologyCategory, TechnologyEntry } from "@/types/project";
import { getDepartments } from "./interiorLayout";

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = "devcity.localProjects.v1";
export const MAX_SLOTS_PER_LOT = 4;

export const PROJECT_CATEGORIES = [
  "Full Stack Application", "Frontend Application", "Backend System", "Mobile Application", "E-commerce",
  "Dashboard", "SaaS Platform", "API Service", "Developer Tool", "Other",
] as const;

export const TECH_CATALOG: Record<Exclude<TechnologyCategory, "Other">, string[]> = {
  Frontend: ["React", "Vue", "Angular", "Next.js", "TypeScript", "JavaScript", "Tailwind CSS"],
  Backend: ["Node.js", "Express", "Laravel", "Django", "Python", "Java", "PHP"],
  Database: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Firebase"],
  Infrastructure: ["Docker", "AWS", "Vercel", "GitHub Actions"],
};

export const BUILDING_STYLES: { id: BuildingStyle; name: string; blurb: string; baseFloors: number }[] = [
  { id: "glass-headquarters", name: "Modern Glass Headquarters", blurb: "Single wide glass volume", baseFloors: 4 },
  { id: "corporate-skyscraper", name: "Corporate Skyscraper", blurb: "Tall stepped tower with spire", baseFloors: 8 },
  { id: "technology-campus", name: "Technology Campus", blurb: "Low linked twin buildings", baseFloors: 2 },
];

export const ACCENT_PALETTE = [
  { name: "Corporate Blue", value: "#2f7cf6" },
  { name: "Sky Blue", value: "#38b6f0" },
  { name: "Emerald", value: "#14a37f" },
  { name: "Violet", value: "#7c5cf0" },
  { name: "Graphite", value: "#4a5361" },
  { name: "Silver", value: "#a7b2bf" },
];

export interface ProjectForm {
  name: string;
  tagline: string;
  description: string;
  category: string;
  logoUrl: string;
  features: string[];
  technologies: TechnologyEntry[];
  buildingStyle: BuildingStyle | "";
  accentColor: string;
  liveUrl: string;
  repositoryUrl: string;
  documentationUrl: string;
  demoUrl: string;
}

export const emptyForm = (): ProjectForm => ({
  name: "", tagline: "", description: "", category: "", logoUrl: "", features: [], technologies: [],
  buildingStyle: "glass-headquarters", accentColor: ACCENT_PALETTE[0]!.value,
  liveUrl: "", repositoryUrl: "", documentationUrl: "", demoUrl: "",
});

export type FormErrors = { [K in keyof ProjectForm]?: string | undefined };

/** Only http(s) URLs with a host are accepted; empty means "omit". */
export function isSafeUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return (u.protocol === "http:" || u.protocol === "https:") && !!u.hostname;
  } catch {
    return false;
  }
}

export const isHexColor = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

export function techKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hasTechnology(list: TechnologyEntry[], name: string) {
  return list.some((t) => techKey(t.name) === techKey(name));
}

const URL_FIELDS = ["logoUrl", "liveUrl", "repositoryUrl", "documentationUrl", "demoUrl"] as const;

export function validateIdentity(f: ProjectForm): FormErrors {
  const e: FormErrors = {};
  if (!f.name.trim()) e.name = "Enter a project name.";
  else if (f.name.trim().length > 60) e.name = "Keep the name under 60 characters.";
  if (!f.description.trim()) e.description = "Describe what the project does.";
  if (!f.category) e.category = "Choose a category.";
  if (f.logoUrl.trim() && !isSafeUrl(f.logoUrl)) e.logoUrl = "Use a full http:// or https:// address.";
  return e;
}

export function validateStack(f: ProjectForm): FormErrors {
  if (f.technologies.length === 0) return { technologies: "Add at least one technology." };
  const keys = f.technologies.map((t) => techKey(t.name));
  if (new Set(keys).size !== keys.length) return { technologies: "Each technology can only be added once." };
  if (f.technologies.some((t) => !t.name.trim())) return { technologies: "Every technology needs a name." };
  return {};
}

export function validateAppearance(f: ProjectForm): FormErrors {
  const e: FormErrors = {};
  if (!f.buildingStyle) e.buildingStyle = "Choose a building style.";
  if (!isHexColor(f.accentColor)) e.accentColor = "Use a color like #2f7cf6.";
  return e;
}

export function validateLinks(f: ProjectForm): FormErrors {
  const e: FormErrors = {};
  for (const k of URL_FIELDS) if (k !== "logoUrl" && f[k].trim() && !isSafeUrl(f[k])) e[k] = "Use a full http:// or https:// address.";
  return e;
}

export function validateForm(f: ProjectForm): FormErrors {
  return { ...validateIdentity(f), ...validateStack(f), ...validateAppearance(f), ...validateLinks(f) };
}

export function floorsFor(style: BuildingStyle, techCount: number) {
  const base = BUILDING_STYLES.find((s) => s.id === style)?.baseFloors ?? 4;
  return base + Math.min(3, Math.floor(techCount / 3));
}

export function slugify(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";
}

export function makeProjectId(name: string, taken: Set<string>) {
  const base = slugify(name);
  for (let i = 0; i < 50; i++) {
    const rand = Math.random().toString(36).slice(2, 7);
    const id = `${base}-${rand}`;
    if (!taken.has(id)) return id;
  }
  throw new Error("Could not generate a unique project ID.");
}

const opt = (v: string) => (v.trim() ? v.trim() : null);

export function formToProject(f: ProjectForm, location: { lotId: string; slotId: string }, id: string, now = new Date()): Project {
  const style = (f.buildingStyle || "glass-headquarters") as BuildingStyle;
  const technologies = f.technologies.map((t) => t.name.trim());
  return {
    id,
    name: f.name.trim(),
    tagline: f.tagline.trim(),
    description: f.description.trim(),
    category: f.category,
    logoUrl: opt(f.logoUrl),
    buildingStyle: style,
    accentColor: f.accentColor.toLowerCase(),
    floors: floorsFor(style, technologies.length),
    lotId: location.lotId,
    slotId: location.slotId,
    technologies,
    technologyDetails: f.technologies.map((t) => ({ name: t.name.trim(), category: t.category, responsibility: t.responsibility.trim() })),
    departments: getDepartments(technologies).map((d) => d.name),
    features: f.features.map((x) => x.trim()).filter(Boolean),
    liveUrl: opt(f.liveUrl),
    repositoryUrl: opt(f.repositoryUrl),
    documentationUrl: opt(f.documentationUrl),
    demoUrl: opt(f.demoUrl),
    screenshots: [],
    publicationStatus: "local-draft",
    createdAt: now.toISOString(),
    schemaVersion: SCHEMA_VERSION,
  };
}

export type SlotCheck = { ok: true } | { ok: false; reason: string };

/** Validates that a slot exists, is empty, and the lot stays within capacity. */
export function checkSlot(lots: DevelopmentLot[], projects: Project[], lotId: string, slotId: string): SlotCheck {
  const lot = lots.find((l) => l.id === lotId);
  if (!lot) return { ok: false, reason: "That development lot no longer exists." };
  if (!lot.slots.some((s) => s.id === slotId)) return { ok: false, reason: "That building slot is not part of this lot." };
  if (projects.some((p) => p.slotId === slotId)) return { ok: false, reason: "That slot is already occupied. Choose another slot." };
  const used = projects.filter((p) => p.lotId === lotId).length;
  if (used >= Math.min(lot.capacity, MAX_SLOTS_PER_LOT)) return { ok: false, reason: `${lot.name} is full.` };
  return { ok: true };
}

export function locationLabel(lots: DevelopmentLot[], slotId: string) {
  const lot = lots.find((l) => l.slots.some((s) => s.id === slotId));
  if (!lot) return "Unknown location";
  const n = lot.slots.findIndex((s) => s.id === slotId) + 1;
  return `${lot.district ?? "Central District"} / ${lot.name} / Slot ${String(n).padStart(2, "0")}`;
}

/** Strict shape check for stored or imported project data. */
export function isValidStoredProject(x: unknown): x is Project {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  const str = (k: string) => typeof p[k] === "string";
  const strArr = (k: string) => Array.isArray(p[k]) && (p[k] as unknown[]).every((v) => typeof v === "string");
  const urlOk = (k: string) => p[k] == null || (typeof p[k] === "string" && isSafeUrl(p[k] as string));
  return str("id") && str("name") && (p["name"] as string).trim() !== "" && str("description") && str("category") && str("tagline")
    && BUILDING_STYLES.some((s) => s.id === p["buildingStyle"]) && typeof p["accentColor"] === "string" && isHexColor(p["accentColor"])
    && typeof p["floors"] === "number" && p["floors"] >= 1 && p["floors"] <= 20 && str("lotId") && str("slotId")
    && strArr("technologies") && (p["technologies"] as string[]).length > 0 && strArr("departments") && strArr("features")
    && ["liveUrl", "repositoryUrl", "documentationUrl", "demoUrl", "logoUrl"].every(urlOk);
}

export interface StorageResult { projects: Project[]; rejected: number; available: boolean }

/** Loads local drafts, dropping invalid entries, duplicate IDs and slot conflicts with existing projects. */
export function loadLocalProjects(storage: Storage | null, lots: DevelopmentLot[], builtIn: Project[]): StorageResult {
  if (!storage) return { projects: [], rejected: 0, available: false };
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); } catch { return { projects: [], rejected: 0, available: false }; }
  if (!raw) return { projects: [], rejected: 0, available: true };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { projects: [], rejected: 1, available: true }; }
  const list = parsed && typeof parsed === "object" && (parsed as { version?: number }).version === SCHEMA_VERSION
    ? (parsed as { projects?: unknown }).projects : null;
  if (!Array.isArray(list)) return { projects: [], rejected: 1, available: true };
  const accepted: Project[] = [];
  let rejected = 0;
  for (const item of list) {
    if (!isValidStoredProject(item)) { rejected++; continue; }
    const all = [...builtIn, ...accepted];
    if (all.some((p) => p.id === item.id) || !checkSlot(lots, all, item.lotId, item.slotId).ok) { rejected++; continue; }
    accepted.push({ ...item, publicationStatus: "local-draft", screenshots: [] });
  }
  return { projects: accepted, rejected, available: true };
}

export function serializeLocalProjects(projects: Project[]) {
  return JSON.stringify({ version: SCHEMA_VERSION, projects });
}

/** Registry-compatible export without internal/runtime fields. */
export function exportProjectConfig(p: Project) {
  const { publicationStatus: _s, ...rest } = p;
  return JSON.stringify({ schemaVersion: SCHEMA_VERSION, project: { ...rest, schemaVersion: SCHEMA_VERSION } }, null, 2);
}

export const exportFileName = (p: Project) => `devcity-${slugify(p.name)}.json`;

export function downloadProjectConfig(p: Project) {
  const blob = new Blob([exportProjectConfig(p)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName(p);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

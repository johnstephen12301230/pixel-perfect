import type { DevelopmentLot } from '@/types/city';
import type { Project } from '@/types/project';
export const PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;
export const WEATHERS = ['Clear', 'Cloudy', 'Rainy', 'Foggy'] as const;
export type Period = typeof PERIODS[number];
export type Weather = typeof WEATHERS[number];
export const PERIOD_TIME: Record<Period, number> = { Morning: 540, Afternoon: 840, Evening: 1080, Night: 1320 };
export const PRESETS = { 'Corporate Day': { minutes: 840, weather: 'Clear' }, 'Golden Hour': { minutes: 1050, weather: 'Clear' }, 'Blue Hour': { minutes: 1170, weather: 'Clear' }, Midnight: { minutes: 0, weather: 'Clear' }, 'Rainy Evening': { minutes: 1110, weather: 'Rainy' } } as const;
export type Preset = keyof typeof PRESETS;
export const ENVIRONMENT_KEY = 'devcity.environment.v1';
export interface EnvironmentSettings { version: 1; minutes: number; automatic: boolean; manualPeriod: Period; speed: number; weather: Weather; autoWeather: boolean; preset: Preset | null; }
export const DEFAULT_ENVIRONMENT: EnvironmentSettings = { version: 1, minutes: 540, automatic: true, manualPeriod: 'Morning', speed: 6, weather: 'Clear', autoWeather: false, preset: null };
export const wrapTime = (m: number) => ((m % 1440) + 1440) % 1440;
export function periodAt(m: number): Period { const h = wrapTime(m) / 60; return h < 6 || h >= 20 ? 'Night' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'; }
export function formatTime(m: number) { const n = Math.floor(wrapTime(m)); return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
export function advanceTime(m: number, seconds: number, speed: number, playing: boolean) { return wrapTime(m + (playing ? Math.max(0, seconds) * speed : 0)); }
export function darknessAt(m: number) { const h = wrapTime(m) / 60; if (h < 5 || h >= 21) return 1; if (h < 8) return 1 - (h - 5) / 3; if (h < 17) return 0; return (h - 17) / 4; }
export function weatherAt(m: number): Weather { return WEATHERS[Math.floor(wrapTime(m) / 180) % WEATHERS.length] ?? 'Clear'; }
export function parseEnvironment(raw: string | null): EnvironmentSettings {
  try { const v = JSON.parse(raw ?? 'null'); if (v?.version !== 1) return { ...DEFAULT_ENVIRONMENT };
    return { version: 1, minutes: Number.isFinite(v.minutes) && v.minutes >= 0 && v.minutes < 1440 ? v.minutes : 540,
      automatic: typeof v.automatic === 'boolean' ? v.automatic : true,
      manualPeriod: PERIODS.includes(v.manualPeriod) ? v.manualPeriod : 'Morning',
      speed: Number.isFinite(v.speed) && v.speed >= 0.25 && v.speed <= 60 ? v.speed : 6,
      weather: WEATHERS.includes(v.weather) ? v.weather : 'Clear', autoWeather: v.autoWeather === true,
      preset: v.preset && Object.hasOwn(PRESETS, v.preset) ? v.preset : null };
  } catch { return { ...DEFAULT_ENVIRONMENT }; }
}
export function hashEnvironment(id: string) { let n = 2166136261; for (const c of id) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return (n >>> 0) / 4294967295; }
export function windowStrength(id: string, darkness: number) { const seed = hashEnvironment(id); return Math.max(0, Math.min(1, (darkness - (0.12 + seed * 0.6)) * 4)) * (0.5 + seed * 0.5); }
export function cityStatistics(projects: Project[], lots: DevelopmentLot[], sites: Record<string, number>) {
  const occupied = new Set(projects.map(p => p.slotId));
  const active = projects.filter(p => p.id in sites).length;
  return { projects: projects.length, completed: projects.length - active, occupiedLots: lots.filter(l => l.slots.some(s => occupied.has(s.id))).length,
    available: lots.reduce((n, l) => n + l.slots.filter(s => !occupied.has(s.id)).length, 0), districts: new Set(lots.map(l => l.district ?? 'Central District')).size, active };
}
/** Mutable render snapshot: updated only by the one environment frame loop. */
export const environmentFrame = { minutes: 540, darkness: 0, rain: 0, cloud: 0, fog: 0, elapsed: 0, reduced: false };

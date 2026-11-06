import { create } from 'zustand';
import { DEFAULT_ENVIRONMENT, ENVIRONMENT_KEY, PERIOD_TIME, PRESETS, parseEnvironment, periodAt, type EnvironmentSettings, type Period, type Weather, type Preset } from '@/utils/environment';
interface EnvironmentStore extends EnvironmentSettings { loaded: boolean; storageAvailable: boolean; revision: number; hydrate: () => void; setPeriod: (p: Period) => void; toggleTime: () => void; setWeather: (w: Weather) => void; setAutoWeather: (v: boolean) => void; setSpeed: (n: number) => void; setPreset: (p: Preset) => void; publish: (minutes: number, weather: Weather) => void; save: () => void; }
export const useEnvironmentStore = create<EnvironmentStore>((set, get) => {
  const change = (v: Partial<EnvironmentSettings>) => { set(s => ({ ...v, revision: s.revision + 1 })); get().save(); };
  return { ...DEFAULT_ENVIRONMENT, loaded: false, storageAvailable: true, revision: 0,
    hydrate: () => { if (get().loaded) return; try { set({ ...parseEnvironment(window.localStorage.getItem(ENVIRONMENT_KEY)), loaded: true, revision: get().revision + 1 }); } catch { set({ loaded: true, storageAvailable: false }); } },
    save: () => { const s = get(); if (!s.loaded) return; try { window.localStorage.setItem(ENVIRONMENT_KEY, JSON.stringify({ version: 1, minutes: s.minutes, automatic: s.automatic, manualPeriod: s.manualPeriod, speed: s.speed, weather: s.weather, autoWeather: s.autoWeather, preset: s.preset })); } catch { set({ storageAvailable: false }); } },
    setPeriod: p => change({ minutes: PERIOD_TIME[p], manualPeriod: p, automatic: false, preset: null }),
    toggleTime: () => change({ automatic: !get().automatic, preset: null }),
    setWeather: weather => change({ weather, autoWeather: false, preset: null }),
    setAutoWeather: autoWeather => change({ autoWeather, preset: null }),
    setSpeed: speed => { if (Number.isFinite(speed) && speed >= 0.25 && speed <= 60) change({ speed }); },
    setPreset: preset => change({ ...PRESETS[preset], preset, manualPeriod: periodAt(PRESETS[preset].minutes), automatic: false, autoWeather: false }),
    publish: (minutes, weather) => { set({ minutes, weather }); get().save(); },
  };
});

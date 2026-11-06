import { Pause, Play, Sun, Cloud, CloudRain, CloudFog, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEnvironmentStore } from '@/store/useEnvironmentStore';
import { useCityStore } from '@/store/useCityStore';
import { PERIODS, WEATHERS, PRESETS, formatTime, periodAt, type Period, type Weather, type Preset } from '@/utils/environment';
const weatherIcons = { Clear: Sun, Cloudy: Cloud, Rainy: CloudRain, Foggy: CloudFog };
export function EnvironmentControls() {
  const s = useEnvironmentStore();
  const busy = useCityStore(s => !!s.selectedProjectId || s.builderOpen || !!s.selectedSlotId);
  const Icon = periodAt(s.minutes) === 'Night' ? Moon : Sun;
  return <section aria-label="City time controls" className={`glass fixed left-3 z-20 flex items-center gap-1.5 rounded-full px-2 py-1.5 sm:bottom-5 sm:left-5 ${busy ? 'top-28 sm:top-auto' : 'bottom-3'}`}>
    <Icon className="h-4 w-4 shrink-0 text-primary"/>
    <time className="w-11 text-sm font-semibold tabular-nums">{formatTime(s.minutes)}</time>
    <select aria-label="Time of day" value={periodAt(s.minutes)} onChange={e => s.setPeriod(e.target.value as Period)} className="w-24 rounded-md bg-transparent py-1 text-xs font-semibold">{PERIODS.map(p => <option key={p}>{p}</option>)}</select>
    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label={s.automatic ? 'Pause city time' : 'Resume city time'} title={s.automatic ? 'Pause city time' : 'Resume city time'} onClick={s.toggleTime}>{s.automatic ? <Pause/> : <Play/>}</Button>
  </section>;
}
export function EnvironmentSettings() {
  const s = useEnvironmentStore();
  return <div className="space-y-5 border-t border-glass-border pt-4">
    <div><h3 className="mb-2 text-sm font-semibold">Weather</h3><div className="grid grid-cols-4 gap-1">{WEATHERS.map(w => { const Icon = weatherIcons[w]; return <Button key={w} variant={s.weather === w ? 'secondary' : 'ghost'} aria-pressed={s.weather === w} onClick={() => s.setWeather(w)} className="h-auto flex-col gap-1 px-1 py-2 text-[11px]"><Icon/>{w}</Button>; })}</div>
    <label className="mt-3 flex items-center justify-between text-xs">Automatic weather<input type="checkbox" checked={s.autoWeather} onChange={e => s.setAutoWeather(e.target.checked)} className="accent-primary"/></label></div>
    <label className="block text-xs font-semibold">Time progression <span className="float-right text-muted-foreground">{s.speed} min / sec</span><input aria-label="Time progression speed" type="range" min=".25" max="60" step=".25" value={s.speed} onChange={e => s.setSpeed(Number(e.target.value))} className="mt-3 w-full accent-primary"/></label>
    <label className="block text-xs font-semibold">Environment preset<select aria-label="Environment preset" value={s.preset ?? ''} onChange={e => { if (e.target.value) s.setPreset(e.target.value as Preset); }} className="mt-2 w-full rounded-md border border-input bg-background p-2 text-sm"><option value="">Custom</option>{Object.keys(PRESETS).map(p => <option key={p}>{p}</option>)}</select></label>
    <label className="block text-xs font-semibold">Time of day<select aria-label="Intelligence time of day" value={periodAt(s.minutes)} onChange={e => s.setPeriod(e.target.value as Period)} className="mt-2 w-full rounded-md border border-input bg-background p-2 text-sm">{PERIODS.map(p => <option key={p}>{p}</option>)}</select></label>
    {!s.storageAvailable && <p className="text-xs text-muted-foreground">Environmental preferences cannot be saved in this browser.</p>}
  </div>;
}

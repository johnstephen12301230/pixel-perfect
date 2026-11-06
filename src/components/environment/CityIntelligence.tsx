import { useProjectRegistry } from '@/store/useProjectRegistry';
import { useConstruction } from '@/store/useConstruction';
import { useEnvironmentStore } from '@/store/useEnvironmentStore';
import { cityStatistics, formatTime, periodAt } from '@/utils/environment';
import { EnvironmentSettings } from './EnvironmentControls';
export function CityIntelligence() {
  const { projects, lots } = useProjectRegistry(); const sites = useConstruction(s => s.sites); const env = useEnvironmentStore();
  const stats = cityStatistics(projects,lots,sites);
  const values = [['Projects',stats.projects],['Completed headquarters',stats.completed],['Occupied lots',stats.occupiedLots],['Available building slots',stats.available],['Districts',stats.districts],['Under construction',stats.active],['City time',formatTime(env.minutes)],['Period',periodAt(env.minutes)],['Weather',env.weather]];
  return <div className="min-h-0 overflow-y-auto overscroll-contain px-2 pb-3"><h2 className="mb-3 text-lg font-semibold">City Intelligence</h2><dl className="mb-4 divide-y divide-glass-border">{values.map(([label,value]) => <div key={label} className="flex items-center justify-between gap-3 py-2 text-xs"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl><EnvironmentSettings/></div>;
}

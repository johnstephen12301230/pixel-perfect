import { useEffect, useState } from "react";
import { Check, HardHat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { constructionProgress, useConstruction } from "@/store/useConstruction";
import { useCityStore } from "@/store/useCityStore";
import { useProjectRegistry } from "@/store/useProjectRegistry";
import { stageFor, stageInfo } from "@/utils/construction";

/** Liquid Glass progress card for the watched construction site; polls ~8×/s, not per frame. */
export function ConstructionPanel() {
  const id = useConstruction((s) => s.watchingId);
  const active = useConstruction((s) => (id ? id in s.sites : false));
  const project = useProjectRegistry((s) => s.projects.find((p) => p.id === id));
  const [p, setP] = useState(() => (id ? constructionProgress(id) : 1));
  useEffect(() => {
    if (!id) return;
    setP(constructionProgress(id));
    if (!active) return;
    const t = window.setInterval(() => setP(constructionProgress(id)), 125);
    return () => window.clearInterval(t);
  }, [id, active]);
  if (!id || !project) return null;
  const done = !active || p >= 1;
  const info = stageInfo(stageFor(p));
  const pct = done ? 100 : Math.floor(p * 100);
  const dismiss = () => useConstruction.getState().dismiss();
  const backToCity = () => { dismiss(); useCityStore.getState().resetCity(); };
  const open = () => { dismiss(); useCityStore.getState().selectProject(project.id); };
  return (
    <div role="status" aria-live="polite" className="glass fixed left-3 top-28 z-30 w-[min(300px,calc(100vw-24px))] rounded-3xl p-4 sm:left-5 sm:top-24">
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
          {done ? <Check className="h-4 w-4" /> : <HardHat className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{project.name}</p>
          <p className="text-xs text-muted-foreground">{done ? "Your headquarters is ready!" : "Building your headquarters…"}</p>
        </div>
        <button onClick={dismiss} aria-label="Hide construction progress" className="grid h-7 w-7 place-items-center rounded-full hover:bg-glass-strong"><X className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-3 flex items-baseline justify-between text-xs">
        <span className="font-semibold">{done ? "Headquarters complete" : info?.label}</span>
        <span className="tabular-nums text-muted-foreground">{pct}% complete</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${pct}%` }} />
      </div>
      {!done && <p className="mt-2 text-xs text-muted-foreground">{info?.message}</p>}
      {done && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={open} className="btn-primary-glass flex-1 rounded-full">Open headquarters</Button>
          <Button size="sm" variant="outline" onClick={backToCity} className="flex-1 rounded-full">Back to City</Button>
        </div>
      )}
    </div>
  );
}

import { X } from "lucide-react";
import { useCityStore } from "@/store/useCityStore";
import type { TechnologyEmployee } from "@/utils/workers";

export function WorkerInteractionPopover({ employee, accent }: { employee: TechnologyEmployee; accent: string }) {
  const rows: [string, string][] = [
    ["Department", employee.department.name],
    ["Responsibility", employee.responsibility],
    ["Project", employee.projectName],
  ];
  return (
    <div role="dialog" aria-label={`${employee.technology} employee`}
      className="glass pointer-events-auto w-60 -translate-y-1/2 rounded-2xl p-3.5 text-left text-xs shadow-lg"
      onPointerDown={(e) => e.stopPropagation()}>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
        <span className="text-sm font-semibold">{employee.technology}</span>
        <button type="button" aria-label="Close employee details" onClick={() => useCityStore.getState().selectWorker(null)}
          className="ml-auto grid h-6 w-6 place-items-center rounded-full hover:bg-glass-strong"><X className="h-3.5 w-3.5" /></button>
      </div>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
        ))}
      </dl>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Download, Building2, ChevronLeft, LayoutGrid, Map, Settings, User, X, Activity } from "lucide-react";
import { CityIntelligence } from "@/components/environment/CityIntelligence";
import { Button } from "@/components/ui/button";
import { useCityStore } from "@/store/useCityStore";
import { getLots, useProjectRegistry } from "@/store/useProjectRegistry";
import { downloadProjectConfig, locationLabel } from "@/utils/projectDraft";
import { cn } from "@/lib/utils";

type View = "menu" | "projects" | "settings" | "intelligence";

export function DevCitySidebar() {
  const { sidebarOpen, setSidebarOpen, resetCity, selectProject, selectedProjectId } = useCityStore();
  const navigate = useNavigate();
  const PROJECTS = useProjectRegistry((s) => s.projects);
  const storageOk = useProjectRegistry((s) => s.storageAvailable);
  const notify = useCityStore((s) => s.notify);
  const [view, setView] = useState<View>("menu");
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => setSidebarOpen(false);

  useEffect(() => {
    if (!sidebarOpen) return setView("menu");
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("button, a[href], select, input");
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [sidebarOpen, setSidebarOpen]);

  const row = "flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold transition-colors hover:bg-glass-strong";

  return (
    <div className={cn("fixed inset-0 z-50", !sidebarOpen && "pointer-events-none")} aria-hidden={!sidebarOpen}>
      <div
        onClick={close}
        className={cn("absolute inset-0 bg-scrim transition-opacity duration-300", sidebarOpen ? "opacity-100" : "opacity-0")}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="DevCity menu"
        className={cn(
          "glass spring absolute bottom-3 right-3 top-3 flex w-[min(340px,calc(100vw-24px))] flex-col rounded-3xl p-3 transition-transform",
          sidebarOpen ? "translate-x-0" : "translate-x-[110%]",
        )}
      >
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          {view === "menu" ? (
            <h2 className="text-lg font-semibold">Menu</h2>
          ) : (
            <button onClick={() => setView("menu")} className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          <button onClick={close} aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-full hover:bg-glass-strong">
            <X className="h-4 w-4" />
          </button>
        </div>

        {view === "menu" && (
          <nav className="flex flex-col gap-1">
            <button className={row} onClick={() => { resetCity(); navigate({ to: "/projects" }); close(); }}>
              <Map className="h-4 w-4 text-primary" /> City Overview
            </button>
            <button className={row} onClick={() => setView("projects")}>
              <LayoutGrid className="h-4 w-4 text-primary" /> My Projects
              <span className="ml-auto text-xs text-muted-foreground">{PROJECTS.length}</span>
            </button>
            <button className={row} onClick={() => { navigate({ to: "/portfolio" }); close(); }}>
              <User className="h-4 w-4 text-primary" /> Portfolio
            </button>
            <button className={row} onClick={() => setView("settings")}>
              <Settings className="h-4 w-4 text-primary" /> Settings
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">Soon</span>
            </button>
            <Button variant="ghost" className={row} onClick={() => setView("intelligence")}><Activity className="h-4 w-4 text-primary" /> City Intelligence</Button>
          </nav>
        )}

        {view === "projects" && (
          <ul className="flex flex-col gap-1.5 overflow-y-auto">
            {PROJECTS.map((p) => (
              <li key={p.id} className="relative">
                <button
                  className={cn(row, selectedProjectId === p.id && "bg-glass-strong")}
                  onClick={() => { selectProject(p.id); navigate({ to: "/projects" }); close(); }}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: p.accentColor }}>
                    <Building2 className="h-4 w-4 text-primary-foreground" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5">{p.name}{p.publicationStatus === "local-draft" && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Local Draft</span>}</span>
                    <span className="text-[11px] font-medium text-muted-foreground">{locationLabel(getLots(), p.slotId)}</span>
                    <span className="text-xs font-medium text-muted-foreground">{p.category} · {p.technologies.join(", ")}</span>
                  </span>
                </button>
                {p.publicationStatus === "local-draft" && (
                  <button aria-label={`Export ${p.name} configuration`} title="Export configuration" onClick={() => { downloadProjectConfig(p); notify("Project configuration exported."); }}
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full hover:bg-glass-strong"><Download className="h-4 w-4" /></button>
                )}
              </li>
            ))}
          </ul>
        )}
        {view === "projects" && !storageOk && <p className="m-2 text-xs text-muted-foreground">This browser can't save drafts. Export each new project to keep it.</p>}

        {view === "intelligence" && <CityIntelligence />}
        {view === "settings" && (
          <div className="m-2 rounded-2xl border border-dashed border-border p-6 text-center">
            <Settings className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 font-semibold">Coming Soon</p>
            <p className="mt-1 text-sm text-muted-foreground">City settings will be available in a future update.</p>
          </div>
        )}

        <p className="mt-auto px-2 pb-1 text-xs text-muted-foreground">DevCity 3.0 · The Living Glass Metropolis</p>
      </aside>
    </div>
  );
}

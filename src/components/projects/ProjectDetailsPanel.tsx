import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Building2, Check, Code2, Download, Layers, PlayCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLots, useProjectRegistry } from "@/store/useProjectRegistry";
import { downloadProjectConfig, locationLabel } from "@/utils/projectDraft";
import { useCityStore } from "@/store/useCityStore";
import { getInteriorPlan } from "@/utils/interiorLayout";
import { defaultFocusDepartment, getEmployees } from "@/utils/workers";

export function ProjectDetailsPanel() {
  const id = useCityStore((s) => s.selectedProjectId);
  const interaction = useCityStore((s) => s.interaction);
  const back = useCityStore((s) => s.selectProject);
  const panel = useRef<HTMLElement>(null);
  const project = useProjectRegistry((s) => s.projects.find((item) => item.id === id));

  useEffect(() => {
    if (!id) return;
    const previous = document.activeElement;
    panel.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || useCityStore.getState().sidebarOpen) return;
        if (useCityStore.getState().selectedWorkerId) useCityStore.getState().selectWorker(null); else back(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [id, back]);

  const focused = useCityStore((s) => s.focusedDepartmentId);
  const employees = useMemo(() => (project ? getEmployees(project, getInteriorPlan(project)) : []), [project]);
  if (!project) return null;
  const activeDept = focused ?? defaultFocusDepartment(employees);
  const depts = [...new Map(employees.map((e) => [e.department.id, e.department])).values()];
  const lot = getLots().find((item) => item.id === project.lotId);
  return (
    <aside ref={panel} tabIndex={-1} aria-labelledby="project-title" aria-busy={interaction === "focusing-building"}
      className="glass project-details fixed inset-x-3 bottom-3 z-30 flex max-h-[48dvh] flex-col overflow-hidden rounded-3xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-24 sm:max-h-none sm:w-[380px]">
      <div className="flex shrink-0 items-center justify-between border-b border-glass-border px-4 py-3">
        <Button variant="ghost" onClick={() => back(null)} className="rounded-full hover:bg-glass-strong"><ArrowLeft /> Back to City</Button>
        <Button variant="ghost" size="icon" onClick={() => back(null)} aria-label="Close project details" title="Close project details" className="rounded-full hover:bg-glass-strong"><X /></Button>
      </div>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Building2 className="h-4 w-4 text-primary" /> {lot?.name} <span aria-hidden="true">/</span> {project.category}
          <span className="ml-auto rounded-full bg-secondary px-2.5 py-1">{project.publicationStatus === "local-draft" ? "Local Draft" : project.publicationStatus === "published" ? "Published" : project.publicationStatus === "demo" ? "Demo" : "Draft"}</span>
        </div>
        <h2 id="project-title" className="break-words text-2xl font-semibold">{project.name}</h2>
        <p className="mt-2 text-sm font-medium text-muted-foreground">{project.tagline}</p>
        <p className="mt-5 text-sm leading-relaxed">{project.description}</p>
        <p className="mt-3 text-xs text-muted-foreground">{locationLabel(getLots(), project.slotId)}</p>
        {project.publicationStatus === "local-draft" && (
          <div className="mt-4 rounded-2xl border border-glass-border p-3 text-xs text-muted-foreground">
            Saved only in this browser.
            <Button variant="outline" size="sm" onClick={() => { downloadProjectConfig(project); useCityStore.getState().notify("Project configuration exported."); }} className="mt-2 w-full rounded-full"><Download /> Export Project Configuration</Button>
          </div>
        )}
        <section className="mt-6 border-t border-glass-border pt-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4 text-primary" /> Technology</h3>
          <ul className="mt-3 flex flex-wrap gap-2">{project.technologies.map((tech) => <li key={tech} className="rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium">{tech}</li>)}</ul>
        </section>
        <section className="mt-6 border-t border-glass-border pt-5">
          <h3 className="text-sm font-semibold">Features</h3>
          <ul className="mt-3 space-y-2.5">{project.features.map((feature) => <li key={feature} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{feature}</li>)}</ul>
        </section>
        <section className="mt-6 border-t border-glass-border pt-5">
          <h3 className="text-sm font-semibold">Inside the building</h3>
          <p className="mt-1 text-xs text-muted-foreground">Open a department floor to see its team at work. Click an employee to learn about them.</p>
          <div className="mt-3 flex flex-wrap gap-2">{depts.map((d) => (
            <button key={d.id} type="button" aria-pressed={activeDept === d.id} onClick={() => useCityStore.getState().focusDepartment(d.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeDept === d.id ? "border-primary bg-glass-strong" : "border-glass-border hover:bg-glass-strong"}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}
              <span className="text-muted-foreground">· {employees.filter((e) => e.department.id === d.id).map((e) => e.technology).join(", ")}</span>
            </button>
          ))}</div>
        </section>
        <section className="mt-6 border-t border-glass-border pt-5">
          <h3 className="text-sm font-semibold">Departments</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{project.departments.map((department) => <li key={department}>{department}</li>)}</ul>
        </section>
        {project.screenshots.length > 0 && <div className="mt-5 space-y-3">{project.screenshots.map((src, index) => <img key={src} src={src} alt={`${project.name} screenshot ${index + 1}`} className="aspect-video w-full rounded-lg object-cover" />)}</div>}
      </div>
      {(project.documentationUrl || project.demoUrl) && (
        <div className="flex shrink-0 gap-2 border-t border-glass-border px-4 pt-3">
          {project.documentationUrl && <Button asChild variant="ghost" size="sm" className="flex-1 rounded-full"><a href={project.documentationUrl} target="_blank" rel="noopener noreferrer"><BookOpen /> Docs</a></Button>}
          {project.demoUrl && <Button asChild variant="ghost" size="sm" className="flex-1 rounded-full"><a href={project.demoUrl} target="_blank" rel="noopener noreferrer"><PlayCircle /> Demo</a></Button>}
        </div>
      )}
      <div className="flex shrink-0 gap-2 border-t border-glass-border p-4">
        {project.liveUrl ? <Button asChild className="flex-1 rounded-full btn-primary-glass"><a href={project.liveUrl} target="_blank" rel="noopener noreferrer">Live project <ArrowUpRight /></a></Button> : <Button disabled className="flex-1 rounded-full">Live unavailable <ArrowUpRight /></Button>}
        {project.repositoryUrl ? <Button asChild variant="outline" className="flex-1 rounded-full"><a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer"><Code2 /> Repository</a></Button> : <Button disabled variant="outline" className="flex-1 rounded-full"><Code2 /> No repository</Button>}
      </div>
    </aside>
  );
}
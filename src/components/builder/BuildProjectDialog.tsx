import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Download, MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCityStore } from "@/store/useCityStore";
import { getLots, useProjectRegistry } from "@/store/useProjectRegistry";
import type { Project, TechnologyCategory } from "@/types/project";
import { cn } from "@/lib/utils";
import { getBuildingBlocks } from "@/utils/interiorLayout";
import {
  ACCENT_PALETTE, BUILDING_STYLES, checkSlot, downloadProjectConfig, emptyForm, formToProject, hasTechnology, locationLabel,
  makeProjectId, PROJECT_CATEGORIES, TECH_CATALOG, validateAppearance, validateForm, validateIdentity, validateLinks,
  validateStack, type FormErrors, type ProjectForm,
} from "@/utils/projectDraft";

const BuildingPreview = lazy(() => import("./BuildingPreview"));

const STEPS = ["Identity", "Stack", "Appearance", "Links", "Preview"] as const;
const VALIDATORS = [validateIdentity, validateStack, validateAppearance, validateLinks, validateForm];
const field = "w-full rounded-xl border border-glass-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, error, hint, children, id }: { label: string; error?: string | undefined; hint?: string; children: React.ReactNode; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold">{label}</label>
      {children}
      {error ? <p id={`${id}-err`} className="text-xs font-medium text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function BuildProjectDialog() {
  const open = useCityStore((s) => s.builderOpen);
  const slotId = useCityStore((s) => s.selectedSlotId);
  const close = useCityStore((s) => s.closeBuilder);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [created, setCreated] = useState<{ project: Project; persisted: boolean } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm()); setStep(0); setErrors({}); setCreated(null);
    panel.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") useCityStore.getState().closeBuilder(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const lot = getLots().find((l) => l.slots.some((s) => s.id === slotId));
  const preview = useMemo(() => formToProject(form, { lotId: lot?.id ?? "", slotId: slotId ?? "" }, "__preview__"), [form, lot, slotId]);
  if (!open || !slotId || !lot) return null;

  const set = <K extends keyof ProjectForm>(k: K, v: ProjectForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const next = () => {
    const e = VALIDATORS[step]!(form);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goTo = (i: number) => {
    for (let k = 0; k < i; k++) { const e = VALIDATORS[k]!(form); if (Object.keys(e).length) { setErrors(e); setStep(k); return; } }
    setStep(i);
  };
  const submit = () => {
    const e = validateForm(form);
    if (Object.keys(e).length) {
      setErrors(e);
      setStep(VALIDATORS.findIndex((v) => Object.keys(v(form)).length > 0));
      return;
    }
    const reg = useProjectRegistry.getState();
    const check = checkSlot(getLots(), reg.projects, lot.id, slotId);
    if (!check.ok) return alertSlot(check.reason);
    const project = formToProject(form, { lotId: lot.id, slotId }, makeProjectId(form.name, new Set(reg.projects.map((p) => p.id))));
    const res = reg.addProject(project);
    if (!res.ok) return alertSlot(res.reason);
    useConstruction.getState().start(project.id);
    useCityStore.getState().finishBuilder();
    if (!res.persisted) useCityStore.getState().notify("This browser couldn't save the project. Export it from My Projects to keep it.");
  };
  const alertSlot = (reason: string) => setErrors({ buildingStyle: `${reason} Close the builder and pick another empty slot.` });

  return (
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="false" aria-labelledby="builder-title"
      className="glass fixed inset-x-3 bottom-3 z-30 flex max-h-[80dvh] flex-col overflow-hidden rounded-3xl outline-none sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-24 sm:max-h-none sm:w-[440px]">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-glass-border px-5 py-4">
        <div className="min-w-0">
          <h2 id="builder-title" className="text-lg font-semibold">{created ? "Added to the city" : "Build a project"}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-primary" /> {locationLabel(getLots(), slotId)}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={close} aria-label="Close builder" className="rounded-full hover:bg-glass-strong"><X /></Button>
      </div>

      {created ? (
        <Done project={created.project} persisted={created.persisted} onClose={close} />
      ) : (
        <>
          <ol className="flex shrink-0 gap-1 px-5 pt-4" aria-label="Progress">
            {STEPS.map((s, i) => (
              <li key={s} className="flex-1">
                <button type="button" onClick={() => goTo(i)} aria-current={i === step ? "step" : undefined} className="w-full text-left">
                  <span className={cn("block h-1 rounded-full", i <= step ? "bg-primary" : "bg-secondary")} />
                  <span className={cn("mt-1.5 block text-[11px] font-semibold", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            {step === 0 && <IdentityStep form={form} set={set} errors={errors} />}
            {step === 1 && <StackStep form={form} set={set} errors={errors} />}
            {step === 2 && <AppearanceStep form={form} set={set} errors={errors} />}
            {step === 3 && <LinksStep form={form} set={set} errors={errors} />}
            {step === 4 && <PreviewStep project={preview} location={locationLabel(getLots(), slotId)} error={errors.buildingStyle} />}
          </div>
          <div className="flex shrink-0 items-center gap-2 border-t border-glass-border p-4">
            <Button variant="ghost" onClick={close} className="rounded-full">Cancel</Button>
            <div className="ml-auto flex gap-2">
              {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} className="rounded-full"><ArrowLeft /> Back</Button>}
              {step < 3 && <Button onClick={next} className="btn-primary-glass rounded-full">Continue <ArrowRight /></Button>}
              {step === 3 && <Button onClick={next} className="btn-primary-glass rounded-full">Preview Building <ArrowRight /></Button>}
              {step === 4 && <Button onClick={submit} className="btn-primary-glass rounded-full"><Plus /> Add to City</Button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type StepProps = { form: ProjectForm; set: <K extends keyof ProjectForm>(k: K, v: ProjectForm[K]) => void; errors: FormErrors };

function IdentityStep({ form, set, errors }: StepProps) {
  const [feature, setFeature] = useState("");
  const addFeature = () => { const f = feature.trim(); if (!f || form.features.some((x) => x.toLowerCase() === f.toLowerCase())) return; set("features", [...form.features, f]); setFeature(""); };
  return (
    <>
      <Field id="pf-name" label="Project name *" error={errors.name}>
        <input id="pf-name" className={field} value={form.name} maxLength={60} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} />
      </Field>
      <Field id="pf-tagline" label="Tagline">
        <input id="pf-tagline" className={field} value={form.tagline} maxLength={90} onChange={(e) => set("tagline", e.target.value)} />
      </Field>
      <Field id="pf-desc" label="Description *" error={errors.description}>
        <textarea id="pf-desc" rows={3} className={field} value={form.description} maxLength={600} onChange={(e) => set("description", e.target.value)} aria-invalid={!!errors.description} />
      </Field>
      <Field id="pf-cat" label="Category *" error={errors.category}>
        <select id="pf-cat" className={field} value={form.category} onChange={(e) => set("category", e.target.value)} aria-invalid={!!errors.category}>
          <option value="">Choose a category</option>
          {PROJECT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field id="pf-logo" label="Logo or image URL" error={errors.logoUrl}>
        <input id="pf-logo" className={field} inputMode="url" placeholder="https://" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
      </Field>
      <Field id="pf-feat" label="Key features" hint="Press Enter to add each feature.">
        <div className="flex gap-2">
          <input id="pf-feat" className={field} value={feature} maxLength={80} onChange={(e) => setFeature(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} />
          <Button type="button" variant="outline" size="icon" onClick={addFeature} aria-label="Add feature" className="shrink-0 rounded-xl"><Plus /></Button>
        </div>
      </Field>
      {form.features.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">{form.features.map((f) => (
          <li key={f} className="flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-xs font-medium">{f}
            <button type="button" aria-label={`Remove ${f}`} onClick={() => set("features", form.features.filter((x) => x !== f))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-glass-strong"><X className="h-3 w-3" /></button>
          </li>))}
        </ul>
      )}
    </>
  );
}

function StackStep({ form, set, errors }: StepProps) {
  const [custom, setCustom] = useState("");
  const [customCat, setCustomCat] = useState<TechnologyCategory>("Other");
  const [dupe, setDupe] = useState<string | null>(null);
  const toggle = (name: string, category: TechnologyCategory) => {
    if (hasTechnology(form.technologies, name)) set("technologies", form.technologies.filter((t) => t.name.toLowerCase() !== name.toLowerCase()));
    else set("technologies", [...form.technologies, { name, category, responsibility: "" }]);
  };
  const addCustom = () => {
    const n = custom.trim().replace(/\s+/g, " ");
    if (!n) return;
    if (hasTechnology(form.technologies, n)) return setDupe(`${n} is already in the stack.`);
    set("technologies", [...form.technologies, { name: n, category: customCat, responsibility: "" }]);
    setCustom(""); setDupe(null);
  };
  return (
    <>
      {Object.entries(TECH_CATALOG).map(([cat, list]) => (
        <fieldset key={cat}>
          <legend className="mb-1.5 text-xs font-semibold text-muted-foreground">{cat}</legend>
          <div className="flex flex-wrap gap-1.5">{list.map((t) => {
            const on = hasTechnology(form.technologies, t);
            return <button key={t} type="button" aria-pressed={on} onClick={() => toggle(t, cat as TechnologyCategory)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-glass-border hover:bg-glass-strong")}>{t}</button>;
          })}</div>
        </fieldset>
      ))}
      <Field id="pf-custom" label="Custom technology" error={dupe ?? undefined}>
        <div className="flex gap-2">
          <input id="pf-custom" className={field} value={custom} maxLength={40} onChange={(e) => { setCustom(e.target.value); setDupe(null); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }} />
          <select aria-label="Custom technology category" className={cn(field, "w-32")} value={customCat} onChange={(e) => setCustomCat(e.target.value as TechnologyCategory)}>
            {(["Frontend", "Backend", "Database", "Infrastructure", "Other"] as const).map((c) => <option key={c}>{c}</option>)}
          </select>
          <Button type="button" variant="outline" size="icon" onClick={addCustom} aria-label="Add custom technology" className="shrink-0 rounded-xl"><Plus /></Button>
        </div>
      </Field>
      <div>
        <p className="text-xs font-semibold">Selected stack ({form.technologies.length})</p>
        {errors.technologies && <p className="mt-1 text-xs font-medium text-destructive">{errors.technologies}</p>}
        <ul className="mt-2 space-y-2">{form.technologies.map((t, i) => (
          <li key={t.name} className="rounded-2xl border border-glass-border p-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold">{t.name}<span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{t.category}</span>
              <button type="button" aria-label={`Remove ${t.name}`} onClick={() => set("technologies", form.technologies.filter((_, k) => k !== i))} className="ml-auto grid h-6 w-6 place-items-center rounded-full hover:bg-glass-strong"><X className="h-3.5 w-3.5" /></button>
            </div>
            <input aria-label={`${t.name} responsibility`} placeholder="What does it do in this project? (optional)" maxLength={100} className={cn(field, "mt-2 py-1.5 text-xs")} value={t.responsibility}
              onChange={(e) => set("technologies", form.technologies.map((x, k) => (k === i ? { ...x, responsibility: e.target.value } : x)))} />
          </li>))}
        </ul>
      </div>
    </>
  );
}

function AppearanceStep({ form, set, errors }: StepProps) {
  const isCustom = !ACCENT_PALETTE.some((c) => c.value === form.accentColor);
  return (
    <>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold">Architecture *</legend>
        <div className="grid gap-2">{BUILDING_STYLES.map((s) => (
          <button key={s.id} type="button" aria-pressed={form.buildingStyle === s.id} onClick={() => set("buildingStyle", s.id)}
            className={cn("flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors", form.buildingStyle === s.id ? "border-primary bg-glass-strong" : "border-glass-border hover:bg-glass-strong")}>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{s.name}</span><span className="text-xs text-muted-foreground">{s.blurb}</span></span>
            {form.buildingStyle === s.id && <Check className="h-4 w-4 text-primary" />}
          </button>))}
        </div>
        {errors.buildingStyle && <p className="mt-1 text-xs font-medium text-destructive">{errors.buildingStyle}</p>}
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-xs font-semibold">Accent color</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PALETTE.map((c) => (
            <button key={c.value} type="button" aria-pressed={form.accentColor === c.value} title={c.name} aria-label={c.name} onClick={() => set("accentColor", c.value)}
              className={cn("h-9 w-9 rounded-full border-2 transition-transform hover:scale-105", form.accentColor === c.value ? "border-foreground" : "border-transparent")} style={{ background: c.value }} />
          ))}
          <label className={cn("flex h-9 items-center gap-2 rounded-full border-2 px-2 text-xs font-medium", isCustom ? "border-foreground" : "border-glass-border")}>
            <input type="color" aria-label="Custom color" value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0" /> Custom
          </label>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{ACCENT_PALETTE.find((c) => c.value === form.accentColor)?.name ?? `Custom ${form.accentColor}`} · used for signage and trim</p>
        {errors.accentColor && <p className="mt-1 text-xs font-medium text-destructive">{errors.accentColor}</p>}
      </fieldset>
    </>
  );
}

function LinksStep({ form, set, errors }: StepProps) {
  const links = [["liveUrl", "Live application"], ["repositoryUrl", "GitHub repository"], ["documentationUrl", "Documentation"], ["demoUrl", "Demonstration"]] as const;
  return (
    <>
      <p className="text-xs text-muted-foreground">All optional. Empty links are left out of the project panel.</p>
      {links.map(([k, label]) => (
        <Field key={k} id={`pf-${k}`} label={`${label} URL`} error={errors[k]}>
          <input id={`pf-${k}`} className={field} inputMode="url" placeholder="https://" value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} />
        </Field>
      ))}
    </>
  );
}

function PreviewStep({ project, location, error }: { project: Project; location: string; error?: string | undefined }) {
  const blocks = getBuildingBlocks(project);
  const w = Math.max(...blocks.map((b) => Math.abs(b.offset[0]) * 2 + b.w));
  const d = Math.max(...blocks.map((b) => Math.abs(b.offset[2]) * 2 + b.d));
  const style = BUILDING_STYLES.find((s) => s.id === project.buildingStyle)?.name;
  return (
    <>
      <div className="relative h-56 overflow-hidden rounded-2xl border border-glass-border bg-secondary/40">
        <Suspense fallback={<div className="grid h-full place-items-center text-xs text-muted-foreground">Loading preview…</div>}>
          <BuildingPreview project={project} />
        </Suspense>
        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-semibold">Preview · drag to rotate</span>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <div className="flex items-center gap-3">
        {project.logoUrl ? <img src={project.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className="h-10 w-10 rounded-xl" style={{ background: project.accentColor }} />}
        <div className="min-w-0"><p className="truncate font-semibold">{project.name}</p><p className="truncate text-xs text-muted-foreground">{project.tagline || project.category}</p></div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        {[["Architecture", style], ["Floors", `${project.floors}`], ["Footprint", `≈ ${w.toFixed(1)} × ${d.toFixed(1)} units`], ["Location", location]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-secondary/60 p-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>
        ))}
      </dl>
      <div>
        <p className="text-xs font-semibold">Departments</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">{project.departments.map((d) => <li key={d} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{d}</li>)}</ul>
      </div>
    </>
  );
}

function Done({ project, persisted, onClose }: { project: Project; persisted: boolean; onClose: () => void }) {
  const [exported, setExported] = useState(false);
  const view = () => { useCityStore.getState().closeBuilder(); useCityStore.getState().selectProject(project.id); };
  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-5">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"><Check /></span>
        <div><p className="font-semibold">{project.name} is now in the city.</p><p className="text-xs text-muted-foreground">Status: Local Draft</p></div></div>
      <p className="text-sm text-muted-foreground">
        {persisted
          ? "It's saved in this browser only. Other visitors won't see it until it's added to the published project list. Export the configuration to keep a copy."
          : "This browser couldn't save it, so it will disappear on refresh. Export the configuration now to keep it."}
      </p>
      {exported && <p role="status" className="text-sm font-medium text-primary">Configuration exported.</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={view} className="btn-primary-glass rounded-full">View building</Button>
        <Button variant="outline" onClick={() => { downloadProjectConfig(project); setExported(true); }} className="rounded-full"><Download /> Export Project Configuration</Button>
        <Button variant="ghost" onClick={onClose} className="rounded-full">Close</Button>
      </div>
    </div>
  );
}

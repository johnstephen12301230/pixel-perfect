import { describe, expect, it } from "vitest";
import { CITY_LOTS } from "@/data/cityLots";
import { PROJECTS } from "@/data/projects";
import { checkSlot, emptyForm, exportProjectConfig, formToProject, isSafeUrl, loadLocalProjects, serializeLocalProjects, STORAGE_KEY, validateForm, validateStack } from "./projectDraft";

const form = () => ({ ...emptyForm(), name: "  My App ", description: "Does things", category: "Dashboard", technologies: [{ name: "React", category: "Frontend" as const, responsibility: "" }] });
const mem = (v: string | null): Storage => ({ getItem: () => v, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null, length: 0 });

describe("Phase 6 project drafts", () => {
  it("requires a name and description", () => {
    const e = validateForm({ ...form(), name: "   ", description: "" });
    expect(e.name).toBeTruthy();
    expect(e.description).toBeTruthy();
  });
  it("accepts only http and https URLs", () => {
    expect(isSafeUrl("https://x.dev")).toBe(true);
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(validateForm({ ...form(), liveUrl: "ftp://x.dev" }).liveUrl).toBeTruthy();
  });
  it("rejects duplicate technologies regardless of case", () => {
    expect(validateStack({ ...form(), technologies: [{ name: "React", category: "Frontend", responsibility: "" }, { name: "react ", category: "Other", responsibility: "" }] }).technologies).toBeTruthy();
  });
  it("rejects occupied slots", () => {
    expect(checkSlot(CITY_LOTS, PROJECTS, "lot-a", "lot-a-s1").ok).toBe(false);
    expect(checkSlot(CITY_LOTS, PROJECTS, "lot-a", "lot-a-s2").ok).toBe(true);
  });
  it("never lets a lot exceed its capacity", () => {
    const full = ["s1", "s2"].map((s) => formToProject(form(), { lotId: "lot-c", slotId: `lot-c-${s}` }, s));
    expect(checkSlot(CITY_LOTS, full, "lot-c", "lot-c-s3").ok).toBe(false);
  });
  it("creates a trimmed local draft at the exact slot", () => {
    const p = formToProject(form(), { lotId: "lot-c", slotId: "lot-c-s2" }, "id1");
    expect(p.name).toBe("My App");
    expect(p.slotId).toBe("lot-c-s2");
    expect(p.publicationStatus).toBe("local-draft");
    expect(p.liveUrl).toBeNull();
  });
  it("reloads valid drafts and drops corrupt, duplicate or conflicting ones", () => {
    const a = formToProject(form(), { lotId: "lot-c", slotId: "lot-c-s1" }, "a");
    const clash = formToProject(form(), { lotId: "lot-c", slotId: "lot-c-s1" }, "b");
    const onBuiltIn = formToProject(form(), { lotId: "lot-a", slotId: "lot-a-s1" }, "c");
    const res = loadLocalProjects(mem(serializeLocalProjects([a, clash, onBuiltIn, { junk: 1 } as never])), CITY_LOTS, PROJECTS);
    expect(res.projects.map((p) => p.id)).toEqual(["a"]);
    expect(res.rejected).toBe(3);
    expect(loadLocalProjects(mem("{not json"), CITY_LOTS, PROJECTS).projects).toEqual([]);
    expect(STORAGE_KEY).toContain("v1");
  });
  it("exports registry-compatible JSON", () => {
    const out = JSON.parse(exportProjectConfig(formToProject(form(), { lotId: "lot-c", slotId: "lot-c-s1" }, "a")));
    expect(out.project.slotId).toBe("lot-c-s1");
    expect(out.schemaVersion).toBe(1);
  });
});

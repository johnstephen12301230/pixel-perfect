import { createFileRoute } from "@tanstack/react-router";
import { CityCanvas } from "@/components/city/CityCanvas";
import { useEffect } from "react";
import { BuildProjectDialog } from "@/components/builder/BuildProjectDialog";
import { ConstructionPanel } from "@/components/construction/ConstructionPanel";
import { useConstruction } from "@/store/useConstruction";
import { useProjectRegistry } from "@/store/useProjectRegistry";
import { ProjectDetailsPanel } from "@/components/projects/ProjectDetailsPanel";

export const Route = createFileRoute("/projects")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Projects — DevCity, The Living Glass Metropolis" },
      { name: "description", content: "Explore a miniature 3D glass city where every building is a software project." },
      { property: "og:title", content: "Projects — DevCity" },
      { property: "og:description", content: "Explore a miniature 3D glass city where every building is a software project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  useEffect(() => {
    useProjectRegistry.getState().hydrate();
    useConstruction.getState().hydrate(useProjectRegistry.getState().localIds);
  }, []);
  return (
    <main>
      <h1 className="sr-only">DevCity projects</h1>
      <CityCanvas />
      <ProjectDetailsPanel />
      <BuildProjectDialog />
      <ConstructionPanel />
    </main>
  );
}

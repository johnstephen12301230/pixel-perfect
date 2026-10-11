import { createFileRoute } from "@tanstack/react-router";
import { CityCanvas } from "@/components/city/CityCanvas";
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
  return (
    <main>
      <h1 className="sr-only">DevCity projects</h1>
      <CityCanvas />
      <ProjectDetailsPanel />
    </main>
  );
}

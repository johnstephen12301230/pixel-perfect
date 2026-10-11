import { createFileRoute } from "@tanstack/react-router";
import { CityCanvas } from "@/components/city/CityCanvas";

export const Route = createFileRoute("/projects")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Projects — DevCity, The Living Glass Metropolis" },
      { name: "description", content: "Explore a miniature 3D glass city where every building is a software project." },
      { property: "og:title", content: "Projects — DevCity" },
      { property: "og:description", content: "Explore a miniature 3D glass city where every building is a software project." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <main>
      <h1 className="sr-only">DevCity projects</h1>
      <CityCanvas />
    </main>
  );
}

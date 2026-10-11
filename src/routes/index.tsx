import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/projects" });
  },
  head: () => ({
    meta: [
      { title: "DevCity — The Living Glass Metropolis" },
      { name: "description", content: "An interactive 3D developer portfolio city." },
      { property: "og:title", content: "DevCity — The Living Glass Metropolis" },
      { property: "og:description", content: "An interactive 3D developer portfolio city." },
    ],
  }),
});

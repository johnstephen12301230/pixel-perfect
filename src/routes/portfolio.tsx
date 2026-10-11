import { createFileRoute } from "@tanstack/react-router";
import { PortfolioPage } from "@/components/portfolio/PortfolioPage";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — DevCity" },
      { name: "description", content: "The professional portfolio behind the DevCity metropolis." },
      { property: "og:title", content: "Portfolio — DevCity" },
      { property: "og:description", content: "The professional portfolio behind the DevCity metropolis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioPage,
});

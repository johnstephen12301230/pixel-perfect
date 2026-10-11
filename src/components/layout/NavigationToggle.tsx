import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function NavigationToggle({ active }: { active: "projects" | "portfolio" }) {
  const item = (key: "projects" | "portfolio", label: string) => (
    <Link
      to={key === "projects" ? "/projects" : "/portfolio"}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "relative z-10 w-28 rounded-full py-2 text-center text-sm font-semibold transition-colors",
        active === key ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Primary" className="glass pointer-events-auto relative flex rounded-full p-1">
      <span
        aria-hidden
        className={cn(
          "glass-strong spring absolute inset-y-1 left-1 w-28 rounded-full transition-transform",
          active === "portfolio" && "translate-x-28",
        )}
      />
      {item("projects", "Projects")}
      {item("portfolio", "Portfolio")}
    </nav>
  );
}

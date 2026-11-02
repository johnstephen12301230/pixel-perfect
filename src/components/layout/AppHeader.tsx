import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Plus } from "lucide-react";
import { useCityStore } from "@/store/useCityStore";
import { CITY_LOTS } from "@/data/cityLots";
import { getProjects } from "@/store/useProjectRegistry";
import { getNextAvailableSlot } from "@/utils/cityLayout";
import { NavigationToggle } from "./NavigationToggle";

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isProjects = !pathname.startsWith("/portfolio");
  const { setSidebarOpen, openBuilder, notify } = useCityStore();

  const onBuild = () => {
    const next = getNextAvailableSlot(CITY_LOTS, getProjects());
    if (!next) return notify("Every building slot is taken. New lots arrive with city expansion.");
    openBuilder(next.slot.id);
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <Link
          to="/projects"
          className="glass pointer-events-auto flex w-fit items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4"
        >
          <span className="btn-primary-glass grid h-8 w-8 place-items-center rounded-full font-display text-sm font-bold">
            D
          </span>
          <span className="font-display text-[15px] font-semibold tracking-tight">DevCity</span>
        </Link>

        <div className="hidden justify-center sm:flex">
          <NavigationToggle active={isProjects ? "projects" : "portfolio"} />
        </div>

        <div className="pointer-events-auto flex items-center justify-end gap-2">
          {isProjects && (
            <button
              onClick={onBuild}
              className="btn-primary-glass spring flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold hover:scale-[1.03] active:scale-95"
            >
              <Plus className="h-4 w-4" /> Build
            </button>
          )}
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="glass spring grid h-10 w-10 place-items-center rounded-full hover:scale-105 active:scale-95"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex justify-center sm:hidden">
        <NavigationToggle active={isProjects ? "projects" : "portfolio"} />
      </div>
    </header>
  );
}

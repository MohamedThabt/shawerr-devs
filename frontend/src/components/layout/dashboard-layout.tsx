import { useState } from "react";
import type { ReactNode } from "react";
import { AiBriefPanel } from "@/components/map/ai-brief-panel";
import { MobileBottomNav, type MobileView } from "@/components/layout/mobile-bottom-nav";

interface DashboardLayoutProps {
  map: ReactNode;
  feed: ReactNode;
}

export function DashboardLayout({ map, feed }: DashboardLayoutProps) {
  const [activeView, setActiveView] = useState<MobileView>("map");

  return (
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden custom-scrollbar bg-[#0a0f1a]">
      <main className={`flex-1 flex flex-col relative overflow-hidden ${activeView === "brief" ? "hidden lg:flex" : "flex"}`}>
        {/* Map View */}
        <div className={`flex-1 flex-col ${activeView === "map" ? "flex" : "hidden lg:flex"}`}>
          {map}
        </div>

        {/* Feed View */}
        <div className={`shrink-0 ${activeView === "feed" ? "block overflow-y-auto" : "hidden lg:block"}`}>
          {feed}
        </div>
      </main>

      {/* AI Brief View */}
      <div className={`${activeView === "brief" ? "block overflow-y-auto" : "hidden lg:block"}`}>
        <AiBriefPanel />
      </div>

      <MobileBottomNav activeView={activeView} onChange={setActiveView} />
    </div>
  );
}

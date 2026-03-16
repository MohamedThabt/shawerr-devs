import { cn } from "@/lib/utils";

export type MobileView = "map" | "feed" | "brief";

interface MobileBottomNavProps {
  activeView: MobileView;
  onChange: (view: MobileView) => void;
}

const NAV_ITEMS: { id: MobileView; label: string; icon: string }[] = [
  { id: "map", label: "Map", icon: "public" },
  { id: "feed", label: "News Digest", icon: "feed" },
  { id: "brief", label: "AI Brief", icon: "auto_awesome" },
];

export function MobileBottomNav({ activeView, onChange }: MobileBottomNavProps) {
  return (
    <div className="lg:hidden flex border-t border-white/5 glass-dark pb-safe sticky bottom-0 z-50 shrink-0">
      {NAV_ITEMS.map((item) => {
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all duration-200",
              isActive
                ? "text-[#1152d4]"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <span
              className={cn(
                "material-symbols-outlined text-xl transition-transform duration-200",
                isActive && "scale-110"
              )}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium tracking-tight">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

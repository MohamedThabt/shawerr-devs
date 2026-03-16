const CORE_NAV = [
  { icon: "public", label: "Global Map", active: true },
  { icon: "shield", label: "Intelligence", active: false },
  { icon: "monitoring", label: "Strategic Insights", active: false },
];

const OPS_NAV = [
  { icon: "security", label: "Risk Assessment" },
  { icon: "factory", label: "Supply Chain" },
  { icon: "bolt", label: "Energy Grid" },
];

export function Sidebar() {
  return (
    <aside className="w-64 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101622] overflow-y-auto custom-scrollbar shrink-0">
      <div className="p-4 space-y-1">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Core Dashboard
        </p>
        {CORE_NAV.map((item) => (
          <a
            key={item.label}
            href="#"
            className={
              item.active
                ? "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#1152d4]/10 text-[#1152d4] font-medium"
                : "flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </div>

      <div className="p-4 space-y-1 mt-4">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Operational Maps
        </p>
        {OPS_NAV.map((item) => (
          <a
            key={item.label}
            href="#"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </div>

      <div className="mt-auto p-4">
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold mb-2">System Status</p>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-slate-500">Node Sync</span>
            <span className="text-emerald-500">99.9%</span>
          </div>
          <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full">
            <div className="w-full h-full bg-emerald-500 rounded-full" />
          </div>
        </div>
      </div>
    </aside>
  );
}

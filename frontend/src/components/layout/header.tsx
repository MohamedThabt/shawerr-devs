

interface HeaderProps {
  articleCount?: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function Header({ articleCount, searchQuery, onSearchChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 gap-3 shrink-0 relative w-full overflow-hidden glass-dark border-b border-white/5 shadow-lg shadow-black/10">

      {/* Subtle gradient glow at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1152d4]/30 to-transparent" />

      {/* LEFT SECTION (Logo & Title) */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <div className="flex items-center justify-center p-2.5 rounded-xl glass-button text-[#1152d4]">
          <span className="material-symbols-outlined">language</span>
        </div>
        <h1 className="hidden md:block text-lg font-bold tracking-tight text-white">
          World Monitor <span className="text-[#1152d4]">Intelligence</span>
        </h1>
      </div>

      {/* CENTER SECTION (Search Bar) - Centered on desktop, flex-grow on mobile */}
      <div className="flex-1 md:flex-none md:absolute md:left-1/2 md:-translate-x-1/2 md:w-[400px] lg:w-[500px]">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-[#1152d4] transition-colors">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input
            className="block w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white placeholder-slate-500 text-sm transition-all outline-none focus:ring-2 focus:ring-[#1152d4]/30"
            placeholder="Search geopolitical events, regions, or assets..."
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* RIGHT SECTION (Actions) */}
      <div className="hidden md:flex items-center justify-end gap-3 lg:gap-4 shrink-0">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl glass-button border-emerald-500/30 text-emerald-400 text-xs font-bold shrink-0">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          LIVE
          {articleCount !== undefined && (
            <span className="text-emerald-400/70 ml-1">({articleCount})</span>
          )}
        </div>
      </div>

    </header>
  );
}

export function Loader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#101622]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-[#1152d4]" />
        <p className="text-sm text-slate-400">Loading intelligence data…</p>
      </div>
    </div>
  );
}

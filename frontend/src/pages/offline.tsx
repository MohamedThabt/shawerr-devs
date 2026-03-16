import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-[#020617] text-slate-900 dark:text-slate-100 p-6 text-center">
      <div className="size-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-5xl text-slate-400">wifi_off</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">Offline Mode</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
        You are currently offline. Cached data may still be available. Check your connection to get the latest intelligence feeds.
      </p>
      <Button onClick={handleRetry} className="gap-2 bg-[#1152d4] hover:bg-[#1152d4]/90 text-white">
        <span className="material-symbols-outlined text-sm">refresh</span>
        Retry Connection
      </Button>
    </div>
  );
}

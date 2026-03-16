import { memo, useMemo } from "react";
import { Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import type { NewsItem } from "@/types/news";

const SOURCE_COLORS: Record<string, string> = {
  bbc_world: "#10b981",       // emerald
  cnn_world: "#f43f5e",       // rose
  nytimes_world: "#f59e0b",   // amber
  guardian_world: "#3b82f6",   // blue
  nbc_top_stories: "#a855f7", // purple
  abc_international: "#f97316", // orange
  techcrunch: "#22d3ee",      // cyan
  wired: "#ec4899",           // pink
  financial_times: "#ef4444", // red
  science_daily: "#14b8a6",   // teal
};

function getMarkerColor(source: string): string {
  return SOURCE_COLORS[source] ?? "#1152d4";
}

function createDotIcon(color: string, delayMs: number = 0) {
  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div class="map-dot-wrapper"><div class="map-dot" style="--dot-color:${color};--enter-delay:${delayMs}ms"></div></div>`,
  });
}

interface MapMarkerProps {
  article: NewsItem;
  index?: number;
}

export const MapMarker = memo(function MapMarker({ article, index = 0 }: MapMarkerProps) {
  const color = getMarkerColor(article.source);
  const delayMs = Math.min(index * 40, 1200);
  const icon = useMemo(() => createDotIcon(color, delayMs), [color, delayMs]);

  // The card content reused for both Hover (Tooltip) and Click (Popup)
  const renderCardContent = () => (
    <div className="space-y-2 w-[240px] sm:w-[280px] text-left p-1">
      <div className="flex items-center gap-2">
        <span
          style={{ background: color }}
          className="inline-block size-2.5 rounded-full shrink-0 shadow-sm"
        />
        <h3 className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
          {article.title}
        </h3>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
          {article.source.replace(/_/g, " ")}
        </span>
        {article.location && (
          <span className="inline-block px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] text-slate-600 dark:text-slate-400">
            📍 {article.location}
          </span>
        )}
      </div>
      {article.summary && (
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-4 break-words">
          {article.summary.replace(/<[^>]*>?/gm, "")}
        </p>
      )}
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-block text-xs font-medium text-[#1152d4] dark:text-blue-400 hover:underline"
      >
        Read More →
      </a>
    </div>
  );

  return (
    <Marker
      position={[article.lat!, article.lon!]}
      icon={icon}
      eventHandlers={{
        mouseover: (e) => {
          const el = e.target.getElement()?.querySelector('.map-dot') as HTMLElement | null;
          if (el) el.classList.add('hovered');
        },
        mouseout: (e) => {
          const el = e.target.getElement()?.querySelector('.map-dot') as HTMLElement | null;
          if (el) el.classList.remove('hovered');
        },
      }}
    >
      <Tooltip 
        className="news-tooltip" 
        direction="top" 
        offset={[0, -10]} 
        opacity={1}
      >
        {renderCardContent()}
      </Tooltip>
      
      <Popup className="news-popup">
        {renderCardContent()}
      </Popup>
    </Marker>
  );
});

export { SOURCE_COLORS };

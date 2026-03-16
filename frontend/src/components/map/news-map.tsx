import { useMemo, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { MapMarker } from "./map-marker";
import { useMapNews } from "@/hooks/use-map-news";
import "leaflet/dist/leaflet.css";

function ZoomControls() {
  const map = useMap();
  const zoomIn = useCallback(() => map.zoomIn(), [map]);
  const zoomOut = useCallback(() => map.zoomOut(), [map]);
  const resetView = useCallback(() => map.setView([20, 0], 2), [map]);

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-1000">
      <button
        onClick={zoomIn}
        className="size-11 flex items-center justify-center rounded-xl glass-button text-slate-300 hover:text-white shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <span className="material-symbols-outlined">add</span>
      </button>
      <button
        onClick={zoomOut}
        className="size-11 flex items-center justify-center rounded-xl glass-button text-slate-300 hover:text-white shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <span className="material-symbols-outlined">remove</span>
      </button>
      <button
        onClick={resetView}
        className="size-11 flex items-center justify-center rounded-xl bg-[#1152d4]/80 backdrop-blur-sm text-white shadow-lg shadow-[#1152d4]/25 hover:bg-[#1152d4] hover:shadow-[#1152d4]/40 transition-all duration-200 border border-[#1152d4]/50"
      >
        <span className="material-symbols-outlined">my_location</span>
      </button>
    </div>
  );
}

export function NewsMap() {
  const { data } = useMapNews();
  const articles = data?.articles ?? [];

  const markers = useMemo(
    () =>
      articles.map((article, index) => (
        <MapMarker key={`${article.link}-${index}`} article={article} index={index} />
      )),
    [articles]
  );

  return (
    <div className="flex-1 relative overflow-hidden bg-[#101622] map-glow">
      {/* Radial glow overlay */}
      <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none bg-[radial-gradient(circle_at_center,rgba(17,82,212,0.2),transparent,transparent)] z-500" />

      {/* Radar scan line */}
      <div className="map-scan-line" />

      {/* LIVE indicator - Glass style */}
      <div className="absolute top-4 left-4 z-1001 flex items-center gap-2 px-3 py-1.5 rounded-xl glass-dark shadow-lg pointer-events-none select-none">
        <span className="live-dot" />
        <span className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">Live</span>
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full"
        style={{ background: "#0a0f1a" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {markers}
        <ZoomControls />
      </MapContainer>
    </div>
  );
}

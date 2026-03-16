import { memo } from "react";
import { formatDate } from "@/utils/format-date";
import type { NewsItem } from "@/types/news";

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  bbc_world: { bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Geopolitics" },
  cnn_world: { bg: "bg-rose-500/10", text: "text-rose-500", label: "Breaking" },
  nytimes_world: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Analysis" },
  guardian_world: { bg: "bg-emerald-500/10", text: "text-emerald-500", label: "Geopolitics" },
  nbc_top_stories: { bg: "bg-[#1152d4]/10", text: "text-[#1152d4]", label: "News" },
  abc_international: { bg: "bg-amber-500/10", text: "text-amber-500", label: "World" },
  techcrunch: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Tech" },
  wired: { bg: "bg-amber-500/10", text: "text-amber-500", label: "Tech" },
  financial_times: { bg: "bg-rose-500/10", text: "text-rose-500", label: "Finance" },
  science_daily: { bg: "bg-[#1152d4]/10", text: "text-[#1152d4]", label: "Science" },
};

const SENTIMENT_STYLES = [
  { bg: "bg-emerald-500", text: "text-emerald-500", label: "Positive" },
  { bg: "bg-amber-500", text: "text-amber-500", label: "Caution" },
  { bg: "bg-rose-500", text: "text-rose-500", label: "Volatile" },
  { bg: "bg-[#1152d4]", text: "text-[#1152d4]", label: "Updated" },
];

function getCategory(source: string) {
  return CATEGORY_STYLES[source] ?? { bg: "bg-[#1152d4]/10", text: "text-[#1152d4]", label: "Intel" };
}

function getSentiment(index: number) {
  return SENTIMENT_STYLES[index % SENTIMENT_STYLES.length];
}

interface NewsCardProps {
  article: NewsItem;
  index: number;
}

export const NewsCard = memo(function NewsCard({ article, index }: NewsCardProps) {
  const category = getCategory(article.source);
  const sentiment = getSentiment(index);

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-2xl p-4 glass-card transition-all duration-300 group block hover:translate-y-[-2px]"
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${category.bg} ${category.text} uppercase tracking-wide backdrop-blur-sm`}>
          {category.label}
        </span>
        <span className="text-[10px] text-slate-500">
          {formatDate(article.published_at)}
        </span>
      </div>

      <h3 className="text-sm font-semibold mb-2 text-white group-hover:text-[#1152d4] transition-colors line-clamp-2">
        {article.title}
      </h3>

      {article.summary && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {article.summary}
        </p>
      )}

      {article.location && (
        <p className="mt-3 text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
          <span className="material-symbols-outlined text-[12px] text-[#1152d4]">location_on</span>
          {article.location}
        </p>
      )}

      <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/5">
        <div className="flex -space-x-2">
          <div className="size-5 rounded-full bg-slate-600/50 border border-white/10 backdrop-blur-sm" />
          {index % 3 === 0 && (
            <div className="size-5 rounded-full bg-slate-500/50 border border-white/10 backdrop-blur-sm" />
          )}
        </div>
        <span className={`text-[10px] font-bold ${sentiment.text} flex items-center gap-1.5 uppercase`}>
          <span className={`size-1.5 rounded-full ${sentiment.bg}`} />
          {sentiment.label}
        </span>
      </div>
    </a>
  );
});


import { useState, useMemo } from "react";
import { NewsCard } from "./news-card";
import type { NewsItem } from "@/types/news";

const TABS = ["All Feed", "Geopolitics", "Tech", "Finance"] as const;

const TAB_SOURCES: Record<string, string[] | null> = {
  "All Feed": null,
  Geopolitics: ["bbc_world", "cnn_world", "guardian_world", "nytimes_world", "abc_international", "nbc_top_stories"],
  Tech: ["techcrunch", "wired", "science_daily"],
  Finance: ["financial_times"],
};

interface NewsListProps {
  articles: NewsItem[];
  isLoading: boolean;
}

function NewsCardSkeleton() {
  return (
    <div className="rounded-2xl p-4 glass-card animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 w-16 bg-white/10 rounded-lg" />
        <div className="h-3 w-10 bg-white/10 rounded" />
      </div>
      <div className="h-4 w-full bg-white/10 rounded mb-2" />
      <div className="h-3 w-3/4 bg-white/10 rounded" />
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="h-5 w-10 bg-white/10 rounded-full" />
        <div className="h-3 w-14 bg-white/10 rounded" />
      </div>
    </div>
  );
}

export function NewsList({ articles, isLoading }: NewsListProps) {
  const [activeTab, setActiveTab] = useState<string>("All Feed");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const filtered = useMemo(() => {
    const sources = TAB_SOURCES[activeTab];
    if (!sources) return articles;
    return articles.filter((a) => sources.includes(a.source));
  }, [articles, activeTab]);

  return (
    <section
      className={isExpanded
        ? "fixed inset-0 z-[2000] bg-[#0a0f1a]/95 backdrop-blur-xl p-4 md:p-8 flex flex-col gap-4 overflow-hidden"
        : "flex-1 lg:flex-none lg:h-80 border-t border-white/5 p-4 flex flex-col gap-4 shrink-0 glass-dark"
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
          <h2 className="font-bold flex items-center gap-2 shrink-0 text-white">
            <span className="material-symbols-outlined text-[#1152d4]">feed</span>
            News Digest
          </h2>
          <div className="flex p-1 rounded-xl glass shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? "bg-[#1152d4]/80 text-white shadow-lg shadow-[#1152d4]/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {isExpanded ? (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs text-[#1152d4] font-medium flex items-center gap-1 self-start sm:self-auto shrink-0 hover:text-[#1152d4]/80 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            back to dashboard
          </button>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-[#1152d4] font-medium flex items-center gap-1 self-start sm:self-auto shrink-0 hover:text-[#1152d4]/80 transition-colors"
          >
            view all
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-2 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <NewsCardSkeleton key={i} />)
            : filtered.map((article, index) => (
                <NewsCard key={`${article.link}-${index}`} article={article} index={index} />
              ))}

          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-8">
              <p className="text-sm text-slate-500">No intelligence reports available.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

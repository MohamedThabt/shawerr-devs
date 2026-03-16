import { useState, useMemo } from "react";
import { useNews } from "@/hooks/use-news";
import { Header } from "@/components/layout/header";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NewsMap } from "@/components/map/news-map";
import { NewsList } from "@/components/news/news-list";
import { Loader } from "@/components/ui/loader";

function matchesSearch(article: { title: string; summary: string | null; source: string; location: string | null }, query: string): boolean {
  const q = query.toLowerCase();
  return (
    article.title.toLowerCase().includes(q) ||
    (article.summary?.toLowerCase().includes(q) ?? false) ||
    article.source.toLowerCase().includes(q) ||
    (article.location?.toLowerCase().includes(q) ?? false)
  );
}

export function Dashboard() {
  const { data, isLoading, error } = useNews();
  const [searchQuery, setSearchQuery] = useState("");

  const articles = data?.articles ?? [];

  const searchedArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    return articles.filter((a) => matchesSearch(a, searchQuery.trim()));
  }, [articles, searchQuery]);

  if (isLoading && !data) {
    return <Loader />;
  }

  if (error && !data) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#101622]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-rose-500">
            Failed to load intelligence data
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#101622] text-slate-900 dark:text-slate-100 overflow-hidden h-screen flex flex-col">
      <Header
        articleCount={searchedArticles.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <DashboardLayout
        map={<NewsMap />}
        feed={<NewsList articles={searchedArticles} isLoading={isLoading} />}
      />
    </div>
  );
}

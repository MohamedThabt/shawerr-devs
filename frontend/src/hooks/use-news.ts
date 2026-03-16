import { useQuery } from "@tanstack/react-query";
import { getNews } from "@/services/news-service";

export function useNews() {
  return useQuery({
    queryKey: ["news"],
    queryFn: getNews,
    staleTime: Infinity,
    retry: 2,
  });
}

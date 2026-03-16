import { useQuery } from "@tanstack/react-query";
import { getMapNews } from "@/services/news-service";

export function useMapNews() {
  return useQuery({
    queryKey: ["map-news"],
    queryFn: getMapNews,
    staleTime: Infinity,
    retry: 2,
  });
}

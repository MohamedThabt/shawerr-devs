import { useQuery } from "@tanstack/react-query";
import { getBriefs } from "@/services/brief-service";

export function useBriefs() {
  return useQuery({
    queryKey: ["briefs"],
    queryFn: getBriefs,
    staleTime: Infinity,
    retry: 2,
  });
}

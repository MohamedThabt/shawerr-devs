import type { BriefResponse } from "@/types/brief";
import api from "./api";

export async function getBriefs(): Promise<BriefResponse> {
  const { data } = await api.get<BriefResponse>("/ai-briefs");
  return data;
}

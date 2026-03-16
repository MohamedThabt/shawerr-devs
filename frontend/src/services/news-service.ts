import type { NewsResponse } from "@/types/news";
import api from "./api";

export async function getNews(): Promise<NewsResponse> {
  const { data } = await api.get<NewsResponse>("/news");
  return data;
}

export async function getMapNews(): Promise<NewsResponse> {
  const { data } = await api.get<NewsResponse>("/map");
  return data;
}

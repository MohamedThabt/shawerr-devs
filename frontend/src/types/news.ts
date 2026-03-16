export interface NewsItem {
  source: string;
  title: string;
  link: string;
  published_at: string | null;
  summary: string | null;
  location: string | null;
  lat: number | null;
  lon: number | null;
  location_type: string | null;
}

export interface NewsResponse {
  count: number;
  articles: NewsItem[];
}

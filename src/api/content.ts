import apiClient from "./apiClient";

export interface PageHeroMedia {
  id: string;
  media_url: string;
  display_order: number;
}

export interface PageHero {
  page_key: string;
  content_type: "video" | "image";
  media: PageHeroMedia[];
  eyebrow: string | null;
  headline: string;
  subtext: string | null;
}

// Confirmed shape from a real network capture: GET /api/page-heroes/plays
export async function fetchPageHero(pageKey: string): Promise<PageHero> {
  const { data } = await apiClient.get<PageHero>(`/page-heroes/${pageKey}`);
  return data;
}

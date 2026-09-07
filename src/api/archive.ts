import apiClient from "./apiClient";

// Confirmed: GET /archive-hero-slides -> array of image-based slides
// (distinct from /page-heroes/plays, which is video-based).
export interface ArchiveHeroSlide {
  id: string;
  image_url: string;
  eyebrow: string | null;
  headline: string;
  subtext: string | null;
  display_order: number;
}

export async function fetchArchiveHeroSlides(): Promise<ArchiveHeroSlide[]> {
  const { data } = await apiClient.get<ArchiveHeroSlide[]>("/archive-hero-slides");
  return [...data].sort((a, b) => a.display_order - b.display_order);
}

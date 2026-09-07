import apiClient from "./apiClient";

// Confirmed: GET /theater-hero-slides -> array of image-based hero slides.
export interface TheaterHeroSlide {
  id: string;
  image_url: string;
  category: string;
  venue: string;
  title: string;
  synopsis: string;
  display_order: number;
}

export async function fetchTheaterHeroSlides(): Promise<TheaterHeroSlide[]> {
  const { data } = await apiClient.get<TheaterHeroSlide[]>("/theater-hero-slides");
  return [...data].sort((a, b) => a.display_order - b.display_order);
}

export interface TicketTier {
  id: string;
  tier_name: string;
  price: string;
  quantity: number;
}

export interface ApprovedEvent {
  id: string;
  event_title: string;
  event_category: string;
  event_description: string;
  proposed_date: string;
  proposed_time: string;
  venue: string;
  poster_image_url: string | null;
  org_name: string;
  ticket_tiers: TicketTier[];
}

// Confirmed: GET /event-enquiries/approved -> array of ApprovedEvent.
export async function fetchApprovedEvents(): Promise<ApprovedEvent[]> {
  const { data } = await apiClient.get<ApprovedEvent[]>("/event-enquiries/approved");
  return data;
}

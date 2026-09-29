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

export interface EventEnquiryAttachment {
  id: string;
  file_url: string;
  original_filename: string;
}

// Confirmed from a real network capture (GET /event-enquiries, 200 OK) —
// the current user's own submitted enquiries, auth-scoped server-side
// (distinct from /event-enquiries/approved above, which is the public
// approved-listings feed for everyone).
export interface MyEventEnquiry {
  id: string;
  org_name: string;
  org_about: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  event_title: string;
  event_category: string;
  event_description: string;
  proposed_date: string;
  proposed_time: string;
  venue: string;
  poster_image_url: string | null;
  remarks: string | null;
  status: string;
  admin_note: string | null;
  ticket_tiers: TicketTier[];
  attachments: EventEnquiryAttachment[];
  created_at: string;
}

export async function fetchMyEventEnquiries(): Promise<MyEventEnquiry[]> {
  const { data } = await apiClient.get<MyEventEnquiry[]>("/event-enquiries");
  return data;
}

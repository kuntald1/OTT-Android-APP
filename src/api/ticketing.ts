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

// ---------------------------------------------------------------------------
// Booking a ticket for a show people physically attend.
//
// This is the one checkout that stays inside the app. Google Play's
// billing requirement covers things consumed in the app — a
// subscription, a pay-per-view stream — and a seat in a hall is not
// one, so Razorpay is allowed here. See src/utils/purchaseNotice.ts for
// the flows that had to move to the website.
// ---------------------------------------------------------------------------

export interface TicketTierAvailability {
  id: string;
  tier_name: string;
  price: string;
  quantity: number;
  taken: number;
  available: number;
  sold_out: boolean;
}

export interface TicketBookingOrder {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_key_id: string;
  amount: string;
  currency: string;
  event_title: string;
  tier_name: string;
  quantity: number;
}

export interface TicketBooking {
  id: string;
  enquiry_id: string;
  event_title: string | null;
  event_venue: string | null;
  event_date: string | null;
  event_time: string | null;
  tier_name: string;
  unit_price: string;
  quantity: number;
  amount: string;
  currency: string;
  booking_reference: string | null;
  qr_token: string | null;
  status: string;
  checked_in_at: string | null;
  created_at: string;
}

// Open to everyone — the screen shows "Sold out" before asking anyone
// to sign in.
export async function fetchTicketAvailability(enquiryId: string): Promise<TicketTierAvailability[]> {
  const { data } = await apiClient.get<TicketTierAvailability[]>(
    `/event-tickets/events/${enquiryId}/availability`
  );
  return data;
}

export async function createTicketBookingOrder(
  enquiryId: string,
  tierId: string,
  quantity: number
): Promise<TicketBookingOrder> {
  const { data } = await apiClient.post<TicketBookingOrder>(
    `/event-tickets/events/${enquiryId}/razorpay/create-order`,
    { tier_id: tierId, quantity }
  );
  return data;
}

export async function verifyTicketBookingPayment(payload: {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<TicketBooking> {
  const { data } = await apiClient.post<TicketBooking>("/event-tickets/razorpay/verify", payload);
  return data;
}

export async function fetchMyTicketBookings(): Promise<TicketBooking[]> {
  const { data } = await apiClient.get<TicketBooking[]>("/event-tickets/mine");
  return data;
}

// The QR is drawn on the server, so the app just needs the URL. React
// Native's Image can send the auth header itself, which keeps the token
// out of the URL — see MyBookingsScreen.
export function ticketQrUrl(bookingId: string): string {
  return `${apiClient.defaults.baseURL}/event-tickets/${bookingId}/qr.png`;
}

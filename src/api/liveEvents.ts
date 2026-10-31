import apiClient from "./apiClient";

// Live streaming: the organiser side (create a broadcast) and the viewer
// side (find one, watch it, buy a ticket for it).
//
// Organiser side of live streaming ("plays_organiser" role, needs the
// account's can_live_stream permission). Same endpoints the web
// "My Live Events" page uses — see backend routers/live_streams.py.
// Kept in its own file so videos.ts (viewer-facing) stays untouched.

export interface MyLiveEvent {
  id: string;
  title: string;
  description: string | null;
  section: string;              // "play" | "archive" | "both"
  status: string;               // "idle" | "active" | "ended"
  monetization_type: string;    // "subscription" | "pay_per_stream"
  price_inr: string | null;
  price_usd: string | null;
  scheduled_start_at: string | null;
  promo_from: string | null;    // "YYYY-MM-DD"
  is_disabled: boolean;
  rtmp_url: string;
  stream_key: string;
  playback_url: string;
}

export async function fetchMyLiveEvents(): Promise<MyLiveEvent[]> {
  const { data } = await apiClient.get<MyLiveEvent[]>("/videos/live/mine");
  return data;
}

// `extra` carries the scheduling/monetization half of the form — see
// utils/liveEventForm.ts's liveEventPayload(), which builds it.
export async function createMyLiveEvent(
  title: string,
  description: string,
  extra: Record<string, unknown> = {}
): Promise<MyLiveEvent> {
  const { data } = await apiClient.post<MyLiveEvent>("/videos/live", {
    title,
    description: description || null,
    ...extra,
  });
  return data;
}

// Organiser edits their OWN event — the server scopes it by
// uploaded_by_user_id, and holds it to exactly the admin's rules.
export async function updateMyLiveEvent(
  id: string,
  updates: Record<string, unknown>
): Promise<MyLiveEvent> {
  const { data } = await apiClient.put<MyLiveEvent>(`/videos/live/${id}`, updates);
  return data;
}

export async function endMyLiveEvent(id: string): Promise<MyLiveEvent> {
  const { data } = await apiClient.post<MyLiveEvent>(`/videos/live/${id}/end`);
  return data;
}

export async function deleteMyLiveEvent(id: string): Promise<void> {
  await apiClient.delete(`/videos/live/${id}`);
}


// ---------------------------------------------------------------------------
// Viewer side
// ---------------------------------------------------------------------------

// The public shape of a live event. has_access / access_reason are the
// SERVER's verdict on this viewer (see backend _check_live_access) — the
// app never works it out from the subscription itself. playback_url is
// non-null only when access is granted AND the broadcast is on air, so an
// announced show stays unplayable even for a subscriber.
export interface LiveEventPublic {
  id: string;
  title: string;
  description: string | null;
  section: string;              // "play" | "archive" | "both"
  poster_image_url: string | null;
  status: string;               // "idle" | "active" | "ended"
  monetization_type: string;    // "subscription" | "pay_per_stream"
  price_inr: string | null;
  price_usd: string | null;
  scheduled_start_at: string | null;
  has_access: boolean;
  access_reason: string | null; // login_required | subscription_required | purchase_required
  playback_url: string | null;
  started_at: string | null;
}

// includeUpcoming=false keeps the original behaviour (on-air only).
// Pass true for the Live & Upcoming list, which also wants announced
// shows whose promote-from date has arrived.
export async function fetchPublicLiveEvents(
  section?: "play" | "archive",
  includeUpcoming = false
): Promise<LiveEventPublic[]> {
  const params: Record<string, string> = {};
  if (section) params.section = section;
  if (includeUpcoming) params.include_upcoming = "true";
  const { data } = await apiClient.get<LiveEventPublic[]>("/videos/live", { params });
  return data;
}

export async function fetchPublicLiveEvent(id: string): Promise<LiveEventPublic> {
  const { data } = await apiClient.get<LiveEventPublic>(`/videos/live/${id}`);
  return data;
}

// ---- Pay Per Streaming checkout ------------------------------------------
// Same two-step Razorpay shape the subscription flow uses (create an order,
// then have the SERVER verify the signature). No subscription prerequisite:
// a ticketed show is sold to anyone signed in.

export interface LiveStreamOrder {
  purchase_id: string;
  razorpay_order_id: string;
  razorpay_key_id: string;
  amount: string;
  currency: string;
  live_stream_title: string;
}

export async function createLiveEventOrder(liveStreamId: string): Promise<LiveStreamOrder> {
  const { data } = await apiClient.post<LiveStreamOrder>(
    `/videos/live/${liveStreamId}/purchase/razorpay/create-order`
  );
  return data;
}

export async function verifyLiveEventPayment(payload: {
  purchase_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<void> {
  await apiClient.post("/videos/live/purchase/razorpay/verify", payload);
}

import type { LiveEventPublic } from "@/api/liveEvents";

// ---------------------------------------------------------------------------
// One place that answers "what can this viewer do with this live event?",
// so the Live list, the watch screen and the home banner can't disagree
// with each other — or with the server.
//
// The server already decided (backend _check_live_access) and says so in
// has_access / access_reason. Nothing here re-derives that from the
// viewer's subscription; it only turns the answer into a label.
//
// Mirrors the web's src/shared/liveAccess.js — keep the two in step.
// ---------------------------------------------------------------------------

export const SECTION_LABELS: Record<string, string> = {
  play: "Contemporary",
  archive: "Heritage",
  both: "theomy",
};

export type LiveActionKind =
  | "watch"      // on air and they may play it
  | "login"      // sign in first
  | "subscribe"  // needs a plan covering this event's section
  | "pay"        // Pay Per Streaming, no ticket yet
  | "upcoming"   // announced, access already granted, just not on air
  | "ended";

export interface LiveAction {
  kind: LiveActionKind;
  label: string;
  hint: string;
  isLive: boolean;
}

export function isLiveNow(ev?: LiveEventPublic | null): boolean {
  return ev?.status === "active";
}

export function hasEnded(ev?: LiveEventPublic | null): boolean {
  return ev?.status === "ended";
}

// "3 Nov, 5:00 PM" in the viewer's own timezone. The API sends UTC.
export function formatShowTime(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatPrice(ev?: LiveEventPublic | null): string | null {
  if (ev?.price_inr == null) return null;
  const n = Number(ev.price_inr);
  if (Number.isNaN(n)) return null;
  return `₹${n % 1 === 0 ? n : n.toFixed(2)}`;
}

/**
 * Access is answered BEFORE "is it on air yet", deliberately: someone who
 * needs a ticket or a plan should be told while the show is still days
 * away, when there's time to act — not shown a bare countdown and then a
 * paywall the moment it starts.
 */
export function liveEventAction(ev?: LiveEventPublic | null): LiveAction {
  if (!ev) return { kind: "ended", label: "Unavailable", hint: "", isLive: false };

  if (hasEnded(ev)) return { kind: "ended", label: "Ended", hint: "", isLive: false };

  const live = isLiveNow(ev);
  const when = formatShowTime(ev.scheduled_start_at);
  const hint = live ? "On air now" : when ? `Starts ${when}` : "Starting soon";

  if (!ev.has_access) {
    if (ev.access_reason === "login_required") {
      return { kind: "login", label: "Sign in to watch", hint, isLive: live };
    }
    if (ev.access_reason === "purchase_required") {
      const price = formatPrice(ev);
      // Tickets are sold on the website, so the label states the price
    // rather than offering to sell. Opening the event explains where.
    return { kind: "pay", label: price ? `Ticket — ${price}` : "Ticket needed", hint, isLive: live };
    }
    const where = SECTION_LABELS[ev.section] || "theomy";
    return { kind: "subscribe", label: `Subscribe to ${where}`, hint, isLive: live };
  }

  if (!live) return { kind: "upcoming", label: "Details", hint, isLive: false };
  return { kind: "watch", label: "Watch now", hint, isLive: true };
}

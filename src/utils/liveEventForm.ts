import type { MyLiveEvent } from "@/api/liveEvents";

// ---------------------------------------------------------------------------
// The scheduling + monetization half of the organiser's live event form.
// Mirrors the web's src/shared/LiveEventFields.jsx so the app and the
// admin portal can't drift apart — same fields, same rules, same errors.
//
// Dates are typed rather than picked: adding a native date-picker would
// mean a new native dependency and a full rebuild, for a form an
// organiser fills in a handful of times. The format shown is the one the
// web form already shows an Indian organiser: DD-MM-YYYY.
// ---------------------------------------------------------------------------

export type Section = "play" | "archive" | "both";
export type Monetization = "subscription" | "pay_per_stream";

export interface LiveEventForm {
  section: Section;
  monetization_type: Monetization;
  price_inr: string;
  price_usd: string;
  scheduled_start_at: string; // "DD-MM-YYYY HH:MM", the organiser's own time
  promo_from: string;         // "DD-MM-YYYY"
}

const DATETIME_RE = /^(\d{1,2})-(\d{1,2})-(\d{4})[ T](\d{1,2}):(\d{2})$/;
const DATE_RE = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
const pad = (n: number) => String(n).padStart(2, "0");

// Rejects a date that doesn't exist (31-02-2026 would otherwise roll
// silently into March).
function realDate(y: number, m: number, d: number, hh = 0, mi = 0): Date | null {
  const date = new Date(y, m - 1, d, hh, mi);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

// "02-11-2026 13:15" (local) -> UTC ISO for the API.
export function parseLocalDateTime(value: string): string | null {
  const m = DATETIME_RE.exec(value.trim());
  if (!m) return null;
  const date = realDate(+m[3], +m[2], +m[1], +m[4], +m[5]);
  if (!date || +m[4] > 23 || +m[5] > 59) return null;
  return date.toISOString();
}

export function formatLocalDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "31-10-2026" -> "2026-10-31" for the API (a plain calendar date, no
// timezone conversion — it's the day promotion starts, not an instant).
export function parseLocalDate(value: string): string | null {
  const m = DATE_RE.exec(value.trim());
  if (!m) return null;
  if (!realDate(+m[3], +m[2], +m[1])) return null;
  return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
}

export function formatLocalDate(apiDate?: string | null): string {
  if (!apiDate) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(apiDate);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function emptyLiveEventForm(): LiveEventForm {
  return {
    section: "both",
    monetization_type: "subscription",
    price_inr: "",
    price_usd: "",
    scheduled_start_at: "",
    promo_from: "",
  };
}

export function liveEventFormFrom(ev: MyLiveEvent): LiveEventForm {
  return {
    section: (ev.section as Section) || "both",
    monetization_type: (ev.monetization_type as Monetization) || "subscription",
    price_inr: ev.price_inr != null ? String(ev.price_inr) : "",
    price_usd: ev.price_usd != null ? String(ev.price_usd) : "",
    scheduled_start_at: formatLocalDateTime(ev.scheduled_start_at),
    promo_from: formatLocalDate(ev.promo_from),
  };
}

export function liveEventPayload(form: LiveEventForm) {
  const paid = form.monetization_type === "pay_per_stream";
  return {
    // A paid show is sold to everyone, so it belongs in both sections.
    // The server enforces this too; this only keeps the request honest.
    section: paid ? "both" : form.section,
    monetization_type: form.monetization_type,
    price_inr: paid && form.price_inr !== "" ? Number(form.price_inr) : null,
    price_usd: paid && form.price_usd !== "" ? Number(form.price_usd) : null,
    scheduled_start_at: parseLocalDateTime(form.scheduled_start_at),
    promo_from: parseLocalDate(form.promo_from),
  };
}

// Mirrors the server's own checks (routers/live_streams.py
// _validate_monetization) plus the two date formats, so the organiser is
// told what's wrong before the request goes out.
export function liveEventFormError(form: LiveEventForm): string | null {
  if (form.monetization_type === "pay_per_stream") {
    if (form.price_inr === "" || form.price_usd === "") {
      return "A Pay Per Streaming event needs both a ₹ and a $ show price.";
    }
    if (!(Number(form.price_inr) > 0) || !(Number(form.price_usd) > 0)) {
      return "Show price must be greater than zero.";
    }
  }
  if (form.scheduled_start_at.trim() && !parseLocalDateTime(form.scheduled_start_at)) {
    return "Show date & time should look like 02-11-2026 17:00.";
  }
  if (form.promo_from.trim() && !parseLocalDate(form.promo_from)) {
    return "Promote from should look like 31-10-2026.";
  }
  return null;
}

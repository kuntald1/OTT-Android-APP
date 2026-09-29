import apiClient from "./apiClient";
import { Video } from "@/types";

// Confirmed against a real browser network capture on movixa.duckdns.org:
// GET /api/videos?section=play — lowercase "play", no status param, returns
// a bare array (not wrapped in { data: [...] } or similar).
export async function fetchPlays(): Promise<Video[]> {
  const { data } = await apiClient.get<Video[]>("/videos", {
    params: { section: "play" },
  });
  return data;
}

// Same endpoint, confirmed for section=archive too (same response shape).
export async function fetchArchive(): Promise<Video[]> {
  const { data } = await apiClient.get<Video[]>("/videos", {
    params: { section: "archive" },
  });
  return data;
}

export interface LanguageOption {
  language: string;
  poster_image_url: string | null;
  video_count: number;
}

// Confirmed: GET /videos/languages?section=play|archive -> the distinct
// languages present in that section, each with a representative poster
// and a count — real data instead of deriving languages client-side from
// the full video list.
export async function fetchLanguages(section: "play" | "archive"): Promise<LanguageOption[]> {
  const { data } = await apiClient.get<LanguageOption[]>("/videos/languages", {
    params: { section },
  });
  return data;
}

export interface StudioOption {
  user_id: string;
  name: string;
  poster_image_url: string | null;
  video_count: number;
}

// Confirmed: GET /videos/studios?section=play|archive -> the distinct
// uploader ("studio") accounts with content in that section.
export async function fetchStudios(section: "play" | "archive"): Promise<StudioOption[]> {
  const { data } = await apiClient.get<StudioOption[]>("/videos/studios", {
    params: { section },
  });
  return data;
}

// Admin-curated rows shown above/instead of auto-generated category
// rows — see backend/app/models.py's SpecialCategory docstring and the
// web app's identical block in VideoStreaming/VideoBrowsePage.jsx.
// Two flavours share this one shape: visible_from set = a temporary
// dated banner (e.g. "Sunday Special"), always rendered first; unset =
// a PERMANENT hand-curated row ("Section Wise Video" in Admin),
// ordered by display_order — these replace what used to be
// auto-generated per-category rows (Drama, Popular Shows, etc.).
export interface SpecialCategory {
  id: string;
  title: string;
  visible_from: string | null;
  visible_to: string | null;
  display_order: number;
  section: string;
  is_disabled: boolean;
  video_count: number;
  videos: Video[];
}

export async function fetchSpecialCategories(section: "play" | "archive"): Promise<SpecialCategory[]> {
  const { data } = await apiClient.get<SpecialCategory[]>("/special-categories", {
    params: { section },
  });
  return data;
}

// Confirmed: GET /videos?section=X&language=Y -> videos filtered server-side
// by language, same shape as fetchPlays/fetchArchive.
export async function fetchVideosByLanguage(
  section: "play" | "archive",
  language: string
): Promise<Video[]> {
  const { data } = await apiClient.get<Video[]>("/videos", {
    params: { section, language },
  });
  return data;
}

// Confirmed: GET /videos?section=X&uploaded_by=<user_id> -> a studio's
// videos within that section.
export async function fetchVideosByStudio(
  section: "play" | "archive",
  userId: string
): Promise<Video[]> {
  const { data } = await apiClient.get<Video[]>("/videos", {
    params: { section, uploaded_by: userId },
  });
  return data;
}

// Seen in a real browser network capture: GET /videos/mine -> 200 OK, but
// the response body wasn't captured directly (only inferred from the web
// app's "Your videos" UI). Assumed to reuse the same Video shape as
// fetchPlays/fetchArchive (this app's other confirmed /videos endpoints),
// since this is almost certainly the same underlying video list filtered
// to videos uploaded by the current user — Video already has `status`
// and `created_at` fields, which cover the "Published" badge and
// "Submitted <date>" line the web UI shows for this list.
export async function fetchMyVideos(): Promise<Video[]> {
  const { data } = await apiClient.get<Video[]>("/videos/mine");
  return data;
}

// Confirmed: POST /my-list/toggle { item_id, title, image_url, meta, section }
// -> { saved: boolean }
export async function toggleMyList(item: {
  item_id: string;
  title: string;
  image_url: string | null;
  meta: string;
  section: string;
}): Promise<{ saved: boolean }> {
  const { data } = await apiClient.post<{ saved: boolean }>("/my-list/toggle", item);
  return data;
}

// Confirmed: POST /videos/{id}/like/toggle -> { liked, likes_count }
export async function toggleLike(
  videoId: string
): Promise<{ liked: boolean; likes_count: number }> {
  const { data } = await apiClient.post<{ liked: boolean; likes_count: number }>(
    `/videos/${videoId}/like/toggle`
  );
  return data;
}

// POST /videos/{id}/playback-session/start
//
// IMPORTANT: the session_token is generated and owned by the CLIENT
// (see getPlaybackSessionToken in apiClient.ts) and must be sent in
// the REQUEST BODY — the server does not issue one and does not
// return one. An earlier version of this file had it backwards: it
// sent no body at all and expected session_token in the response.
// That made every call fail validation (session_token is required),
// so no PlaybackSession row was ever created for this device — which
// silently exempted the app from the screens limit entirely, in both
// directions (app never blocked, and app never blocked web either).
export interface PlaybackSessionStart {
  allowed: boolean;
  active_screens: number;
  max_screens: number;
  reason: string | null;
}

export async function startPlaybackSession(
  videoId: string,
  sessionToken: string
): Promise<PlaybackSessionStart> {
  const { data } = await apiClient.post<PlaybackSessionStart>(
    `/videos/${videoId}/playback-session/start`,
    { session_token: sessionToken }
  );
  return data;
}

// POST /videos/playback-session/end — frees this device's screens slot
// immediately instead of waiting for it to go stale (~50s).
export async function endPlaybackSession(sessionToken: string): Promise<void> {
  await apiClient.post(`/videos/playback-session/end`, { session_token: sessionToken });
}

// Sent periodically while content is actively playing, reporting the
// current continuously-watched STRETCH of the video's own timeline
// (segmentStartSeconds -> segmentEndSeconds) — not a cumulative
// "seconds watched" count. The backend merges this into the viewer's
// running union of watched ranges for the video and credits only
// whatever portion wasn't already covered, so re-watching or a
// seek/scrub jump never inflates revenue. See VideoPlayerScreen.tsx's
// segment tracker for how these two numbers are derived, and the web
// app's src/shared/watchSegmentTracker.js for the identical logic.
export async function sendWatchHeartbeat(
  videoId: string,
  segmentStartSeconds: number,
  segmentEndSeconds: number,
  playbackSessionToken?: string
): Promise<{
  total_watched_minutes: string;
  credited_this_call_rupees: string;
  total_creator_credited_rupees: string;
}> {
  const { data } = await apiClient.post(`/videos/${videoId}/watch-heartbeat`, {
    segment_start_seconds: segmentStartSeconds,
    segment_end_seconds: segmentEndSeconds,
    playback_session_token: playbackSessionToken || null,
  });
  return data;
}

// Confirmed endpoint (seen in a real network capture: GET
// /videos/recommendations/for-me), but the response BODY wasn't captured —
// this assumes it returns an array shaped like the other video list
// endpoints (id, title, poster_image_url, thumbnail_url at minimum).
// Falls back gracefully if the shape turns out different.
export async function fetchRecommendations(): Promise<Video[]> {
  const { data } = await apiClient.get<Video[]>("/videos/recommendations/for-me");
  return data;
}

// Confirmed: POST /videos/{id}/progress { position_seconds } -> 204 No Content
export async function saveProgress(videoId: string, positionSeconds: number): Promise<void> {
  await apiClient.post(`/videos/${videoId}/progress`, {
    position_seconds: positionSeconds,
  });
}

export interface ContinueWatchingItem {
  video_id: string;
  title: string;
  poster_image_url: string | null;
  thumbnail_url: string | null;
  trailer_playback_url: string | null;
  position_seconds: number;
  duration_seconds: number;
  progress_percent: number;
  updated_at: string;
}

// Confirmed: GET /videos/continue-watching/mine -> array of the shape above.
export async function fetchContinueWatching(): Promise<ContinueWatchingItem[]> {
  const { data } = await apiClient.get<ContinueWatchingItem[]>("/videos/continue-watching/mine");
  return data;
}

export interface LiveEvent {
  id: string;
  title: string;
  description: string;
  section: string;
  poster_image_url: string | null;
  status: string;
  playback_url: string;
  started_at: string;
}

// Confirmed: GET /videos/live -> array of the shape above.
export async function fetchLiveEvents(): Promise<LiveEvent[]> {
  const { data } = await apiClient.get<LiveEvent[]>("/videos/live");
  return data;
}

export interface WatchHistoryItem {
  video_id: string;
  title: string;
  poster_image_url: string | null;
  thumbnail_url: string | null;
  position_seconds: number;
  duration_seconds: number;
  finished: boolean;
  updated_at: string;
}

// Confirmed: GET /videos/history/mine -> array of the shape above.
export async function fetchWatchHistory(): Promise<WatchHistoryItem[]> {
  const { data } = await apiClient.get<WatchHistoryItem[]>("/videos/history/mine");
  return data;
}

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

// Confirmed from a real network capture: POST /videos/{id}/playback-session/start
// -> { session_token, allowed, active_screens, max_screens, reason }.
// (Field is "session_token", not "playback_session_token" as first guessed —
// corrected. `allowed` reflects the subscription's screens limit, e.g.
// false + reason set when the account's max concurrent screens is reached.)
export interface PlaybackSessionStart {
  session_token: string;
  allowed: boolean;
  active_screens: number;
  max_screens: number;
  reason: string | null;
}

export async function startPlaybackSession(videoId: string): Promise<PlaybackSessionStart> {
  const { data } = await apiClient.post<PlaybackSessionStart>(
    `/videos/${videoId}/playback-session/start`
  );
  return data;
}

// Sent periodically while content is actively playing. Request body key
// renamed to match the now-confirmed session_token field name (was
// guessed as playback_session_token before — corrected for consistency).
export async function sendWatchHeartbeat(
  videoId: string,
  sessionToken: string,
  watchedSeconds: number
): Promise<{
  max_session_minutes: string;
  credited_this_call_rupees: string;
  total_creator_credited_rupees: string;
}> {
  const { data } = await apiClient.post(`/videos/${videoId}/watch-heartbeat`, {
    session_token: sessionToken,
    watched_seconds: watchedSeconds,
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

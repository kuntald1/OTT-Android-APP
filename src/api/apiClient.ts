import axios, { AxiosError, AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";

// The live site. The app used to point at the pre-launch domain
// (movixa.duckdns.org) back when theomy.com returned 444; theomy.com has
// been serving since, and src/config/oauth.ts was already moved over —
// Google sign-in broke while the two disagreed, because the backend
// rebuilds the redirect_uri from its own BACKEND_BASE_URL
// (https://theomy.com/api) and rejects a mismatch. Same backend, same
// database either way: only the hostname differs.
//
// Exported so nothing else has to write a hostname of its own.
export const API_HOST = "https://theomy.com";
const API_BASE_URL = `${API_HOST}/api`;

// Bunny Stream (vz-*.b-cdn.net) refuses a video request that carries no
// Referer/Origin, and then the player renders a silent black box rather
// than raising an error — so these ride along with every playback URL.
//
// This is hotlink protection, NOT an API endpoint: the value has to be a
// hostname listed under Allowed Referrers in Bunny Stream's Security
// settings, which is a separate list from anything in this codebase.
// theomy.com is there already (the website plays video from it). If video
// ever goes black in the app while the rest of it works, this constant is
// the first thing to check.
export const MEDIA_HEADERS = {
  Referer: `${API_HOST}/`,
  Origin: API_HOST,
};

// Some media fields (e.g. poster_image_url) come back as host-relative
// paths like "/api/uploads/...", confirmed from a real network capture —
// others (thumbnail_url, playback_url) are already full CDN URLs. This
// resolves either case to a usable absolute URL.
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_HOST}${path}`;
}

const TOKEN_KEY = "theomy_auth_token";
const PLAYBACK_SESSION_KEY = "theomy_playback_session";

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

// A stable per-DEVICE id used for the screens limit (see the web app's
// getPlaybackSessionToken in src/api.js — same idea, SecureStore here
// instead of localStorage). The CLIENT generates and owns this; the
// backend never issues one. It must persist across app restarts so a
// relaunch reuses the same playback slot rather than consuming a
// second one.
export async function getPlaybackSessionToken(): Promise<string> {
  let token = await SecureStore.getItemAsync(PLAYBACK_SESSION_KEY);
  if (!token) {
    token = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    await SecureStore.setItemAsync(PLAYBACK_SESSION_KEY, token);
  }
  return token;
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// FastAPI puts validation/auth errors in `error.response.data.detail` — a
// plain string for our own HTTPException calls, but a LIST of Pydantic
// error objects (one per invalid field) for schema validation failures
// (422s), e.g. a malformed email. Screens that read
// `e?.response?.data?.detail` directly and render it in a <Text> would
// otherwise try to render an array/object, which React Native rejects —
// this always returns a plain, displayable string.
export function extractErrorMessage(error: any, fallback = "Something went wrong. Please try again."): string {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const raw = typeof detail[0]?.msg === "string" ? detail[0].msg : null;
    // Pydantic v2 prefixes some messages with "Value error, " — that's an
    // implementation detail, not something to show the person.
    return raw ? raw.replace(/^Value error,\s*/i, "") : "Please check the highlighted field and try again.";
  }
  return fallback;
}

// Set by AuthContext so the interceptor can force a logout on 401
// (single-device-session enforcement kicks out the previous session —
// same behavior the web app handles via its auth:sessionEnded event).
let onSessionExpired: (() => void) | null = null;
export function registerSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await clearStoredToken();
      onSessionExpired?.();
    }
    return Promise.reject(error);
  }
);

export default apiClient;

import axios, { AxiosError, AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";

// Pre-launch domain — same backend/DB/API as theomy.com, only routing
// differs (see theomy area notes: theomy.com returns 444 until launch).
const API_HOST = "https://movixa.duckdns.org";
const API_BASE_URL = `${API_HOST}/api`;

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

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
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

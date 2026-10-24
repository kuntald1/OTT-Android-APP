import apiClient from "./apiClient";

// Organiser side of live streaming ("plays_organiser" role, needs the
// account's can_live_stream permission). Same endpoints the web
// "My Live Events" page uses — see backend routers/live_streams.py.
// Kept in its own file so videos.ts (viewer-facing) stays untouched.

export interface MyLiveEvent {
  id: string;
  title: string;
  status: string; // "idle" | "active"
  rtmp_url: string;
  stream_key: string;
  playback_url: string;
}

export async function fetchMyLiveEvents(): Promise<MyLiveEvent[]> {
  const { data } = await apiClient.get<MyLiveEvent[]>("/videos/live/mine");
  return data;
}

export async function createMyLiveEvent(
  title: string,
  description: string,
  section: "play" | "archive" | "both"
): Promise<MyLiveEvent> {
  const { data } = await apiClient.post<MyLiveEvent>("/videos/live", {
    title,
    description: description || null,
    section,
  });
  return data;
}

export async function endMyLiveEvent(id: string): Promise<MyLiveEvent> {
  const { data } = await apiClient.post<MyLiveEvent>(`/videos/live/${id}/end`);
  return data;
}

export async function deleteMyLiveEvent(id: string): Promise<void> {
  await apiClient.delete(`/videos/live/${id}`);
}

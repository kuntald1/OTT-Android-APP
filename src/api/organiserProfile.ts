import apiClient from "./apiClient";

// Confirmed from a real network capture (web app, Manage Profile ->
// About [Organisation]): plays_organiser accounts can attach rich-text
// sections (About, Early days, Selected plays, Awards, etc.) to their
// public organiser profile page.
export interface ProfileSection {
  id: string;
  title: string;
  content_html: string;
  display_order: number;
}

export async function fetchProfileSections(): Promise<ProfileSection[]> {
  const { data } = await apiClient.get<ProfileSection[]>("/organiser-profile/sections");
  return data;
}

export async function createProfileSection(payload: {
  title: string;
  content_html: string;
}): Promise<ProfileSection> {
  const { data } = await apiClient.post<ProfileSection>("/organiser-profile/sections", payload);
  return data;
}

export async function updateProfileSection(
  id: string,
  payload: { title: string; content_html: string }
): Promise<ProfileSection> {
  const { data } = await apiClient.put<ProfileSection>(
    `/organiser-profile/sections/${id}`,
    payload
  );
  return data;
}

export async function deleteProfileSection(id: string): Promise<void> {
  await apiClient.delete(`/organiser-profile/sections/${id}`);
}

// Confirmed: GET /organiser-profile/{user_id}/sections -> the PUBLIC view
// of any organiser's About sections (path-keyed by user_id, not the
// logged-in user like /organiser-profile/sections above). Used when a
// viewer taps a Studio tile in Categories.
export async function fetchPublicOrganiserSections(userId: string): Promise<ProfileSection[]> {
  const { data } = await apiClient.get<ProfileSection[]>(`/organiser-profile/${userId}/sections`);
  return data;
}

// Confirmed: GET /organiser-profile/{user_id}/cover -> { cover_image_url }.
export async function fetchOrganiserCover(userId: string): Promise<{ cover_image_url: string | null }> {
  const { data } = await apiClient.get(`/organiser-profile/${userId}/cover`);
  return data;
}

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

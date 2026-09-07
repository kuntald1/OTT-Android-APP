import apiClient from "./apiClient";

export interface MyListItem {
  id: string;
  item_id: string;
  title: string;
  image_url: string | null;
  meta: string;
  section: string;
  created_at: string;
}

// Confirmed: GET /my-list -> array of the shape above. Removing an item
// reuses the existing POST /my-list/toggle (same call used to add it).
export async function fetchMyList(): Promise<MyListItem[]> {
  const { data } = await apiClient.get<MyListItem[]>("/my-list");
  return data;
}

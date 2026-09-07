import apiClient from "./apiClient";

export interface OrganiserRequest {
  id: string;
  user_id: string;
  user_name: string;
  subject: string;
  group_name: string;
  phone: string;
  email: string;
  remarks: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

// Confirmed: POST /organiser-requests { subject, group_name, phone, email,
// remarks } -> the created OrganiserRequest above.
export async function submitOrganiserRequest(payload: {
  subject: string;
  group_name: string;
  phone: string;
  email: string;
  remarks: string | null;
}): Promise<OrganiserRequest> {
  const { data } = await apiClient.post<OrganiserRequest>("/organiser-requests", payload);
  return data;
}

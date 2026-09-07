import apiClient from "./apiClient";

export interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  source: "message" | "complaint";
  image_url: string | null;
  created_at: string;
}

// Confirmed: POST /tickets is multipart/form-data (not JSON) — likely
// because the endpoint also accepts an optional image file alongside the
// text fields. Sending a JSON body here returns HTTP 422 "subject: Field
// required" even though subject is present, because FastAPI is reading it
// as Form fields, not a Pydantic JSON body.
export async function createTicket(payload: {
  subject: string;
  description: string;
  source: "message" | "complaint";
}): Promise<SupportTicket> {
  const form = new FormData();
  form.append("subject", payload.subject);
  form.append("description", payload.description);
  form.append("source", payload.source);
  const { data } = await apiClient.post<SupportTicket>("/tickets", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// Confirmed: GET /tickets -> array of the shape above, newest first.
export async function fetchMyTickets(): Promise<SupportTicket[]> {
  const { data } = await apiClient.get<SupportTicket[]>("/tickets");
  return data;
}

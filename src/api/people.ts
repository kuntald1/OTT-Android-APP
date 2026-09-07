import apiClient from "./apiClient";
import { Person } from "@/types";

// Confirmed: GET /people/{id} -> full Person object (bio fields included).
export async function fetchPerson(id: string): Promise<Person> {
  const { data } = await apiClient.get<Person>(`/people/${id}`);
  return data;
}

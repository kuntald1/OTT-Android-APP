import apiClient from "./apiClient";

// Confirmed from a real network capture (web app, Manage Profile ->
// Family Accounts): a subscribed account can create up to `max_allowed`
// sub-accounts that share the plan's extra screens.
export interface SubAccount {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  // Whether the parent declared this account for someone under 18 (Admin
  // decision, Sept 2026) — set once at creation and never changed here.
  // A declared minor never provides date of birth/city; a declared adult
  // is prompted to add its own on its own first login.
  is_minor: boolean;
}

export async function fetchMySubAccounts(): Promise<{
  max_allowed: number;
  sub_accounts: SubAccount[];
}> {
  const { data } = await apiClient.get("/sub-accounts/mine");
  return data;
}

export async function fetchMyParentAccount(): Promise<{
  has_parent: boolean;
  parent_name: string | null;
  parent_email: string | null;
}> {
  const { data } = await apiClient.get("/sub-accounts/my-parent");
  return data;
}

export async function createSubAccount(payload: {
  name: string;
  email: string;
  password: string;
  isMinor: boolean;
}): Promise<SubAccount> {
  const { data } = await apiClient.post<SubAccount>("/sub-accounts", {
    name: payload.name,
    email: payload.email,
    password: payload.password,
    is_minor: payload.isMinor,
  });
  return data;
}

export async function deactivateSubAccount(id: string): Promise<SubAccount> {
  const { data } = await apiClient.patch<SubAccount>(`/sub-accounts/${id}/deactivate`);
  return data;
}

// The parent changing whether a family account is for someone under 18.
// Added Nov 2026 with the age restriction: before this the declaration
// was fixed at creation, which left every sub-account made before it
// stuck on the safe "minor" default with no way out.
//
// Turning it OFF opens age-restricted content up, so the server asks for
// the Family PIN when the family has one set. We don't decide that here
// — send with no pin first, and a 400 naming the PIN is the signal to
// prompt for it. Turning it back ON never needs one.
export async function setSubAccountMinor(
  id: string,
  payload: { isMinor: boolean; pin?: string },
): Promise<SubAccount> {
  const body: Record<string, unknown> = { is_minor: payload.isMinor };
  if (payload.pin) body.pin = payload.pin;
  const { data } = await apiClient.patch<SubAccount>(`/sub-accounts/${id}/minor`, body);
  return data;
}

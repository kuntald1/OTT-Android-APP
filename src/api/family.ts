import apiClient from "./apiClient";

// "Who's watching?" — family account switching. Mirrors the web app's
// src/api.js fetchFamilyAccounts/switchFamilyAccount/setFamilyPin exactly,
// against the same backend (routers/family.py):
//   * A PARENT can enter any of its own active sub-accounts, no PIN needed.
//   * A SUB-ACCOUNT can get back into its PARENT only with the parent's
//     4-digit Family PIN.
//   * A switch is a real login of the target account (same Token shape as
//     /auth/login), so watch history, revenue, My List, the shared
//     subscription/screens pool all just work under the new account.
export interface FamilyAccount {
  id: string;
  name: string;
  photo_url: string | null;
  masked_email: string;
  is_parent: boolean;
  is_current: boolean;
  requires_pin: boolean;
}

export interface FamilyAccountsResponse {
  accounts: FamilyAccount[];
  pin_set: boolean;
}

export async function fetchFamilyAccounts(): Promise<FamilyAccountsResponse> {
  const { data } = await apiClient.get<FamilyAccountsResponse>("/family/accounts");
  return data;
}

// Returns { access_token, user } — same shape as login. `pin` is needed only
// when switching from a family member back into the main account.
export async function switchFamilyAccount(targetId: string, pin?: string) {
  const { data } = await apiClient.post("/family/switch", {
    target_id: targetId,
    ...(pin ? { pin } : {}),
  });
  return data;
}

// First PIN: just newPin. Changing it: currentPin too.
export async function setFamilyPin(params: { newPin: string; currentPin?: string }) {
  const { data } = await apiClient.put<{ pin_set: boolean }>("/family/pin", {
    new_pin: params.newPin,
    ...(params.currentPin ? { current_pin: params.currentPin } : {}),
  });
  return data;
}

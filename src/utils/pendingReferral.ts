import * as SecureStore from "expo-secure-store";

// An invite code typed on the Register screen but not yet claimed, kept
// across a Google / Facebook round trip.
//
// Email sign-up claims the code itself, right after the account is made
// (RegisterScreen). Social sign-up can't: tapping "G" or "f" leaves the
// app for an in-app browser tab and comes back through
// AuthContext.loginWithOAuthToken, which never sees the Register screen's
// state. So the code is parked here first and claimed from there — the
// same thing the website does with its stored ?ref= code.
//
// SecureStore, not a module variable, so the code survives the app being
// killed in the background during the OAuth trip. Every call is wrapped:
// a storage failure must never block someone signing in, it only costs
// them the referral.
const KEY = "theomy_pending_referral_code";

export async function setPendingReferralCode(code: string): Promise<void> {
  const value = code.trim().toUpperCase();
  if (!value) return;
  try {
    await SecureStore.setItemAsync(KEY, value);
  } catch {
    // Ignored on purpose — see above.
  }
}

export async function getPendingReferralCode(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function clearPendingReferralCode(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Ignored on purpose — see above.
  }
}

import apiClient from "./apiClient";

export interface MyReferral {
  code: string;
  share_url: string;
  expires_at: string;
  validity_days: number;
  referrer_reward_points: number;
  referred_reward_points: number;
  signed_up: number;
  rewarded: number;
  points_earned: number;
}

export interface ClaimResult {
  claimed: boolean;
  reason?: string;
  reward_points?: number;
  message?: string;
}

/** This account's code and share link, with a fresh one issued if the
 *  old one has run out. */
export async function fetchMyReferral(): Promise<MyReferral> {
  const { data } = await apiClient.get<MyReferral>("/referrals/me");
  return data;
}

/** Send the invite to one email address or WhatsApp number. */
export async function shareReferral(
  channel: "email" | "whatsapp",
  to: string,
): Promise<{ sent: boolean; to: string }> {
  const { data } = await apiClient.post("/referrals/share", { channel, to });
  return data;
}

/** Record that this new account came in through someone's code. The
 *  server decides whether it applies and answers { claimed: false,
 *  reason } rather than failing, so a stale code is not an error. */
export async function claimReferral(code: string): Promise<ClaimResult> {
  const { data } = await apiClient.post<ClaimResult>("/referrals/claim", { code });
  return data;
}

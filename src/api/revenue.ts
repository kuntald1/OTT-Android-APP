import apiClient from "./apiClient";

export interface RevenueRate {
  rate_paisa_per_minute: number;
  rate_rupees_per_minute: string;
  rate_display: string;
  platform_commission_percent: string;
}

export interface RevenueSummary {
  total_earned_rupees: string;
  available_balance_rupees: string;
  pending_withdrawals_rupees: string;
}

export interface Withdrawal {
  id: string;
  amount_rupees: string;
  status: string;
  admin_note: string | null;
  requested_at: string;
  processed_at: string | null;
}

export async function fetchRevenueRate(): Promise<RevenueRate> {
  const { data } = await apiClient.get<RevenueRate>("/revenue-rate");
  return data;
}

export async function fetchRevenueSummary(): Promise<RevenueSummary> {
  const { data } = await apiClient.get<RevenueSummary>("/revenue/summary");
  return data;
}

export async function fetchWithdrawals(): Promise<Withdrawal[]> {
  const { data } = await apiClient.get<Withdrawal[]>("/revenue/withdrawals");
  return data;
}

// Confirmed: POST /revenue/withdrawals { amount_rupees } -> the created
// Withdrawal above (status "pending").
export async function createWithdrawal(amountRupees: number): Promise<Withdrawal> {
  const { data } = await apiClient.post<Withdrawal>("/revenue/withdrawals", {
    amount_rupees: amountRupees,
  });
  return data;
}

// All three below confirmed directly from backend source (not a network
// capture): _rupees fields are JSON numbers (already quantized to 2
// decimals), not strings. Empty results are `[]`, not an error.

export interface ContentPerformance {
  video_id: string;
  title: string;
  unique_viewers: number;
  total_watch_minutes: number;
  gross_revenue_rupees: number;
  creator_earned_rupees: number;
}

// GET /videos/content-performance/mine -> sorted by creator_earned_rupees
// descending, server-side.
export async function fetchMyContentPerformance(): Promise<ContentPerformance[]> {
  const { data } = await apiClient.get<ContentPerformance[]>("/videos/content-performance/mine");
  return data;
}

export interface RevenueByDay {
  date: string; // "YYYY-MM-DD"
  creator_earned_rupees: number;
  gross_revenue_rupees: number;
}

// GET /videos/revenue/by-day/mine?days=N -> sorted by date ascending.
// SPARSE: a day with no revenue is simply absent from the array, not a
// zero-value row — fill gaps client-side.
export async function fetchMyRevenueByDay(days: number): Promise<RevenueByDay[]> {
  const { data } = await apiClient.get<RevenueByDay[]>("/videos/revenue/by-day/mine", { params: { days } });
  return data;
}

export interface RevenueByCountry {
  country: string; // may be "Unknown" if the viewer's account has no country set
  viewer_count: number;
  creator_earned_rupees: number;
}

export async function fetchMyRevenueByCountry(): Promise<RevenueByCountry[]> {
  const { data } = await apiClient.get<RevenueByCountry[]>("/videos/revenue/by-country/mine");
  return data;
}

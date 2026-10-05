import apiClient from "./apiClient";

export interface SubscriptionDuration {
  id: string;
  label: string;
  months: number;
  discount_percent: string;
  display_order: number;
  is_active: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tagline: string;
  base_price: string;
  per_extra_screen: string;
  base_price_usd: string;
  per_extra_screen_usd: string;
  features: string[];
  grants_play: boolean;
  grants_archive: boolean;
  highlighted: boolean;
  display_order: number;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  plan_name: string;
  duration_label: string;
  screens: number;
  price: string;
  currency: string;
  is_active: boolean;
  started_at: string;
  expires_at: string;
}

export interface Payment {
  id: string;
  subscription_id: string | null;
  gateway: string;
  gateway_payment_id: string | null;
  plan_name: string;
  duration_label: string;
  screens: number;
  base_amount: string;
  tax_amount: string;
  total_amount: string;
  reward_points_used: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface VideoPurchase {
  id: string;
  video_id: string;
  video_title: string;
  video_poster_url: string | null;
  amount: string;
  currency: string;
  gateway: string;
  gateway_payment_id: string | null;
  status: string;
  created_at: string;
}

export async function fetchSubscriptionDurations(): Promise<SubscriptionDuration[]> {
  const { data } = await apiClient.get<SubscriptionDuration[]>("/subscription-durations");
  return data;
}

export async function fetchExchangeRate(): Promise<{ inr_per_usd: string }> {
  const { data } = await apiClient.get("/exchange-rate");
  return data;
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await apiClient.get<SubscriptionPlan[]>("/subscription-plans");
  return data;
}

export async function fetchMySubscriptions(): Promise<Subscription[]> {
  const { data } = await apiClient.get<Subscription[]>("/subscriptions");
  return data;
}

export async function fetchMyPayments(): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>("/payments");
  return data;
}

export async function fetchMyVideoPurchases(): Promise<VideoPurchase[]> {
  const { data } = await apiClient.get<VideoPurchase[]>("/videos/purchases/mine");
  return data;
}

export async function fetchTaxConfig(): Promise<{ gst_percent: string }> {
  const { data } = await apiClient.get("/tax-config");
  return data;
}

// Confirmed: GET /subscriptions/me -> the single currently-active
// Subscription (different from GET /subscriptions, which returns the full
// history array).
export async function fetchMyActiveSubscription(): Promise<Subscription | null> {
  const { data } = await apiClient.get<Subscription>("/subscriptions/me");
  return data;
}

// Confirmed: POST /payments/razorpay/verify { payment_id, razorpay_order_id,
// razorpay_payment_id, razorpay_signature } -> the finalized Payment object
// (status "paid"). NOTE: the order-creation call that must happen BEFORE
// this (to get razorpay_order_id and open the Razorpay checkout) is not yet
// confirmed — its endpoint/payload needs a network capture before the
// "Pay with Razorpay" button can actually be wired up.
export async function verifyRazorpayPayment(payload: {
  payment_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<Payment> {
  const { data } = await apiClient.post<Payment>("/payments/razorpay/verify", payload);
  return data;
}

export interface RazorpayOrder {
  payment_id: string;
  razorpay_order_id: string;
  razorpay_key_id: string;
  base_amount: string;
  reward_points_used: number;
  tax_amount: string;
  total_amount: string;
  currency: string;
  plan_name: string;
  duration_label: string;
  screens: number;
}

// Confirmed: POST /payments/razorpay/create-order { plan_name,
// duration_label, screens, reward_points_requested } -> the RazorpayOrder
// above. total_amount is in rupees as a string — the Razorpay SDK needs
// paise, so multiply by 100 when opening checkout.
export async function createRazorpayOrder(payload: {
  plan_name: string;
  duration_label: string;
  screens: number;
  reward_points_requested: number;
}): Promise<RazorpayOrder> {
  const { data } = await apiClient.post<RazorpayOrder>("/payments/razorpay/create-order", payload);
  return data;
}

// ---- UPI Autopay (auto-renew) -------------------------------------------
// Backend: backend/app/routers/autopay.py. Opt-in, India only. The first
// charge is authorised in the customer's UPI app; Razorpay then renews it and
// reports every renewal to the SERVER by webhook (the app never sees those).

export interface AutopaySetup {
  autopay_id: string;
  razorpay_subscription_id: string;
  razorpay_key_id: string;
  base_amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  plan_name: string;
  duration_label: string;
  screens: number;
  cycle_months: number;
}

export interface AutopayStatus {
  active: boolean;
  plan_name?: string | null;
  duration_label?: string | null;
  screens?: number | null;
  total_amount?: string | null;
  // The real next-charge date (the server already removes its grace days).
  next_renewal_at?: string | null;
}

export async function createAutopaySubscription(payload: {
  plan_name: string;
  duration_label: string;
  screens: number;
}): Promise<AutopaySetup> {
  const { data } = await apiClient.post<AutopaySetup>("/payments/autopay/create", payload);
  return data;
}

// activated:false = the signature was fine but Razorpay didn't (yet) report
// the full first charge as captured; the server's webhook activates the plan
// moments later, so this is not an error.
export async function verifyAutopayPayment(payload: {
  autopay_id: string;
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): Promise<{ activated: boolean; payment_id?: string | null }> {
  const { data } = await apiClient.post("/payments/autopay/verify", payload);
  return data;
}

export async function fetchMyAutopay(): Promise<AutopayStatus> {
  const { data } = await apiClient.get<AutopayStatus>("/payments/autopay/me");
  return data;
}

// 204 No Content. Stops FUTURE charges only — the plan already paid for stays
// active until its own expiry.
export async function cancelMyAutopay(): Promise<void> {
  await apiClient.post("/payments/autopay/cancel");
}

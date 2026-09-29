import apiClient from "./apiClient";
import { AuthResponse, User } from "@/types";

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

// Confirmed from a real network capture: POST /auth/otp/send
// { phone, purpose: "login" | "registration" } -> { message }.
// Registration itself no longer uses this — see sendRegistrationEmailOtp
// below (Admin decision, Sept 2026: WhatsApp/phone OTP replaced by email
// OTP for registration). This is now ONLY used by OTP LOGIN
// ("Log in with OTP instead"), an existing account signing in — untouched.
export async function sendOtp(
  phone: string,
  purpose: "login" | "registration"
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("/auth/otp/send", {
    phone,
    purpose,
  });
  return data;
}

// Email-based OTP for India registration (Admin decision, Sept 2026) —
// replaces the old WhatsApp/phone OTP there. Phone is still collected and
// required for India (see register() below) but is no longer itself
// verified. Checks email — and phone/date_of_birth, when given — for an
// existing account / under-18 date of birth BEFORE sending anything, so
// that's caught right at "Send verification code" instead of only after
// the person has received and typed back the email code. Mirrors the web
// app's src/api.js sendRegistrationEmailOtp exactly.
export async function sendRegistrationEmailOtp(
  email: string,
  phone?: string,
  dateOfBirth?: string
): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("/auth/otp/send-email", {
    email,
    purpose: "registration",
    phone: phone || null,
    date_of_birth: dateOfBirth || null,
  });
  return data;
}

// Confirmed: POST /auth/login-otp { phone, otp } -> same shape as /auth/login
export async function loginWithOtp(phone: string, otp: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/login-otp", {
    phone,
    otp,
  });
  return data;
}

// Confirmed: POST /auth/forgot-password { email } -> { message }
export async function forgotPassword(email: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>("/auth/forgot-password", {
    email,
  });
  return data;
}

// The web registration form (confirmed via screenshot, and matched exactly
// as of Sept 2026) collects name, email, password, country, phone, date of
// birth, and — for India — city, then sends an email OTP
// (sendRegistrationEmailOtp above) before final account creation. otp is
// the code the person typed back. date_of_birth is required for every
// registration (server rejects under-18); city is only meaningful — and
// only sent — for India.
export async function register(params: {
  name: string;
  email: string;
  password: string;
  country: string;
  phone: string;
  otp: string;
  dateOfBirth: string;
  city?: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", {
    name: params.name,
    email: params.email,
    password: params.password,
    country: params.country,
    phone: params.phone || null,
    otp: params.otp,
    date_of_birth: params.dateOfBirth,
    city: params.country === "India" ? params.city || null : null,
  });
  return data;
}

// Confirmed: GET /auth/me -> full User object.
export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

// Confirmed: PUT /auth/me { name, email, phone } -> full updated User object.
export async function updateProfile(payload: {
  name: string;
  email: string;
  phone: string;
}): Promise<User> {
  const { data } = await apiClient.put<User>("/auth/me", payload);
  return data;
}

// Confirmed: POST /auth/me/photo (multipart) -> full updated User object
// with the new profile_photo_url.
export async function uploadProfilePhoto(fileUri: string): Promise<User> {
  const form = new FormData();
  const filename = fileUri.split("/").pop() || "photo.jpg";
  const extMatch = /\.(\w+)$/.exec(filename);
  const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
  form.append("file", {
    uri: fileUri,
    name: filename,
    type: `image/${ext === "jpg" ? "jpeg" : ext}`,
  } as any);

  const { data } = await apiClient.post<User>("/auth/me/photo", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// Confirmed: PUT /auth/me/password { old_password, new_password } ->
// { message }.
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const { data } = await apiClient.put<{ message: string }>("/auth/me/password", {
    old_password: oldPassword,
    new_password: newPassword,
  });
  return data;
}

// "Complete your profile" (date of birth + city) — mirrors the web app's
// src/api.js fetchDemographicsStatus/completeDemographics exactly. Covers
// every account that doesn't have both yet: an account created before
// this feature shipped (any auth_provider), or a sub-account its parent
// declared an ADULT at creation (see api/subAccounts.ts) filling in its
// own details on its own first login. A declared-minor sub-account never
// needs this — needs_profile is always false for it.
export interface DemographicsStatus {
  needs_profile: boolean;
  is_declared_minor: boolean;
  date_of_birth: string | null;
  city: string | null;
}

export async function fetchDemographicsStatus(): Promise<DemographicsStatus> {
  const { data } = await apiClient.get<DemographicsStatus>("/auth/me/demographics-status");
  return data;
}

export async function completeDemographics(payload: {
  dateOfBirth: string;
  city?: string;
}): Promise<DemographicsStatus> {
  const { data } = await apiClient.put<DemographicsStatus>("/auth/me/demographics", {
    date_of_birth: payload.dateOfBirth,
    city: payload.city || null,
  });
  return data;
}

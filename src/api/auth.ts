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
// { phone, purpose: "login" | "registration" } -> { message }
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

// The web registration form (confirmed via screenshot) collects name, email,
// password, country, phone, then sends an OTP (POST /auth/otp/send with
// purpose:"registration" — confirmed) before final account creation.
// The FINAL verify-and-create-account call's endpoint/shape is NOT confirmed
// (no network capture of that last step) — this guesses it reuses
// /auth/register with the otp attached. Correct this once captured.
export async function register(params: {
  name: string;
  email: string;
  password: string;
  country: string;
  phone: string;
  otp: string;
}): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/auth/register", params);
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

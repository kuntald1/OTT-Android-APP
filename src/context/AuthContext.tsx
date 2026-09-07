import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  clearStoredToken,
  getStoredToken,
  registerSessionExpiredHandler,
  setStoredToken,
} from "@/api/apiClient";
import {
  login as loginRequest,
  loginWithOtp as loginWithOtpRequest,
  register as registerRequest,
  fetchCurrentUser,
} from "@/api/auth";
import { User } from "@/types";

interface RegisterParams {
  name: string;
  email: string;
  password: string;
  country: string;
  phone: string;
  otp: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOtp: (phone: string, otp: string) => Promise<void>;
  loginWithOAuthToken: (
    token: string,
    partialUser: Partial<User> & Pick<User, "id" | "name" | "email">
  ) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await clearStoredToken();
    setUser(null);
  }, []);

  useEffect(() => {
    // Any 401 (including single-device-session kickout) routes back here.
    registerSessionExpiredHandler(() => {
      setUser(null);
    });
  }, []);

  // Confirmed shape: GET /auth/me -> the full User object (id, name, email,
  // phone, country, role, auth_provider, profile_photo_url,
  // reward_points_balance, can_live_stream, created_at). Used on app boot
  // to restore the session silently from a stored token.
  useEffect(() => {
    (async () => {
      const token = await getStoredToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch {
        // Stored token is stale/invalid — clear it and fall back to login.
        await clearStoredToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, user: loggedInUser } = await loginRequest(
      email,
      password
    );
    await setStoredToken(access_token);
    setUser(loggedInUser);
  }, []);

  // Confirmed shape: POST /auth/login-otp { phone, otp } -> same response
  // as /auth/login.
  const loginWithOtp = useCallback(async (phone: string, otp: string) => {
    const { access_token, user: loggedInUser } = await loginWithOtpRequest(
      phone,
      otp
    );
    await setStoredToken(access_token);
    setUser(loggedInUser);
  }, []);

  // For social login (Facebook/Google via in-app browser) — the mobile
  // OAuth callback (see BACKEND_REQUIREMENTS.md, not yet built on the
  // backend) redirects to theomy://auth-callback with the token and basic
  // user fields directly in the query string, so no extra /auth/me call is
  // needed here.
  const loginWithOAuthToken = useCallback(
    async (
      token: string,
      partialUser: Partial<User> & Pick<User, "id" | "name" | "email">
    ) => {
      await setStoredToken(token);
      setUser({ role: "user", ...partialUser } as User);
    },
    []
  );

  // Final verify-and-create-account call is UNCONFIRMED (see api/auth.ts) —
  // assumes it returns the same access_token + user shape as login.
  const register = useCallback(async (params: RegisterParams) => {
    const { access_token, user: newUser } = await registerRequest(params);
    await setStoredToken(access_token);
    setUser(newUser);
  }, []);

  // Lets screens (Manage Profile) push a freshly-saved user object into
  // context immediately after a successful save, instead of waiting on a
  // refetch — used after PUT /auth/me and POST /auth/me/photo.
  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithOtp,
        loginWithOAuthToken,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

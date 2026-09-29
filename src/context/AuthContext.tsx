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
  fetchDemographicsStatus,
  completeDemographics as completeDemographicsRequest,
} from "@/api/auth";
import { fetchFamilyAccounts } from "@/api/family";
import { User } from "@/types";

interface RegisterParams {
  name: string;
  email: string;
  password: string;
  country: string;
  phone: string;
  otp: string;
  dateOfBirth: string;
  city?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsProfileCompletion: boolean;
  completeDemographics: (payload: { dateOfBirth: string; city?: string }) => Promise<void>;
  hasFamily: boolean;
  familyPickerOpen: boolean;
  openFamilyPicker: () => void;
  closeFamilyPicker: () => void;
  refreshFamily: () => Promise<boolean>;
  applyAccountSwitch: (data: { access_token: string; user: User }) => void;
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
  // "Complete your profile" (date of birth + city) — checked after every
  // login and on session restore, same as the web app's needsProfileCompletion
  // (see CompleteProfileModal.tsx). A network failure here just means the
  // prompt doesn't show this time rather than blocking the app.
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  // Family accounts ("Who's watching?") — hasFamily = this account has
  // other accounts to switch to (itself + at least one more); mirrors the
  // web app's AppContext.jsx exactly, against the same backend
  // (routers/family.py via api/family.ts).
  const [hasFamily, setHasFamily] = useState(false);
  const [familyPickerOpen, setFamilyPickerOpen] = useState(false);

  const refreshProfileCompletionStatus = useCallback(async () => {
    try {
      const status = await fetchDemographicsStatus();
      setNeedsProfileCompletion(status.needs_profile);
    } catch {
      setNeedsProfileCompletion(false);
    }
  }, []);

  const completeDemographics = useCallback(async (payload: { dateOfBirth: string; city?: string }) => {
    await completeDemographicsRequest(payload);
    setNeedsProfileCompletion(false);
  }, []);

  // Whether this account has family accounts to switch to. Never throws —
  // a failure just means no "Switch account" item. Returns the flag so
  // openFamilyPickerIfFamily below can decide whether to open the picker
  // without a second round-trip.
  const refreshFamily = useCallback(async () => {
    try {
      const fam = await fetchFamilyAccounts();
      const has = fam.accounts.length > 1;
      setHasFamily(has);
      return has;
    } catch {
      setHasFamily(false);
      return false;
    }
  }, []);

  // Shows "Who's watching?" right after a REAL login (password / OTP /
  // Google-Facebook) — only when there is a family to pick from.
  // Deliberately NOT called on session restore or right after registering
  // (a brand-new account can't have a family yet) — matches the web app's
  // AppContext.jsx exactly (see openFamilyPickerIfFamily there).
  const openFamilyPickerIfFamily = useCallback(async () => {
    if (await refreshFamily()) setFamilyPickerOpen(true);
  }, [refreshFamily]);

  const openFamilyPicker = useCallback(() => setFamilyPickerOpen(true), []);
  const closeFamilyPicker = useCallback(() => setFamilyPickerOpen(false), []);

  const logout = useCallback(async () => {
    await clearStoredToken();
    setUser(null);
    setNeedsProfileCompletion(false);
    setHasFamily(false);
    setFamilyPickerOpen(false);
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
        refreshProfileCompletionStatus();
        refreshFamily(); // silent — never opens the picker on a session restore
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
    refreshProfileCompletionStatus();
    openFamilyPickerIfFamily();
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
    refreshProfileCompletionStatus();
    openFamilyPickerIfFamily();
  }, []);

  // For social login (Facebook/Google via in-app browser) — the mobile
  // OAuth callback (see BACKEND_REQUIREMENTS.md, not yet built on the
  // backend) redirects to theomy://auth-callback with the token and basic
  // user fields directly in the query string, so no extra /auth/me call is
  // needed here. This IS the one path most likely to actually need
  // "Complete your profile" — a social signup never saw the date-of-birth
  // /city form at all.
  const loginWithOAuthToken = useCallback(
    async (
      token: string,
      partialUser: Partial<User> & Pick<User, "id" | "name" | "email">
    ) => {
      await setStoredToken(token);
      setUser({ role: "user", ...partialUser } as User);
      refreshProfileCompletionStatus();
      openFamilyPickerIfFamily();
    },
    []
  );

  // Final verify-and-create-account call is UNCONFIRMED (see api/auth.ts) —
  // assumes it returns the same access_token + user shape as login.
  // refreshFamily (not openFamilyPickerIfFamily) — a brand-new account
  // can't have a family yet, matches the web app's register() exactly.
  const register = useCallback(async (params: RegisterParams) => {
    const { access_token, user: newUser } = await registerRequest(params);
    await setStoredToken(access_token);
    setUser(newUser);
    refreshProfileCompletionStatus();
    refreshFamily();
  }, []);

  // Adopts the account a family switch just returned ({ access_token, user
  // }): the same as a fresh login of THAT account, after clearing whatever
  // belonged to the previous one so none of it lingers for the next
  // person. Mirrors the web app's applyAccountSwitch exactly.
  const applyAccountSwitch = useCallback((data: { access_token: string; user: User }) => {
    setStoredToken(data.access_token);
    setUser(data.user);
    setFamilyPickerOpen(false);
    refreshProfileCompletionStatus();
    refreshFamily();
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
        needsProfileCompletion,
        completeDemographics,
        hasFamily,
        familyPickerOpen,
        openFamilyPicker,
        closeFamilyPicker,
        refreshFamily,
        applyAccountSwitch,
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

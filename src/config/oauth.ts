// theomy Facebook App (developers.facebook.com/apps/2271307686962571)
export const FACEBOOK_APP_ID = "2271307686962571";

// Custom URL scheme registered in app.json ("scheme": "theomy") — the
// mobile-only backend callback redirects here when auth completes.
export const AUTH_CALLBACK_SCHEME = "theomy://auth-callback";

const API_HOST = "https://movixa.duckdns.org";

// Requires a NEW backend route — see BACKEND_REQUIREMENTS.md. This is NOT
// the same as the existing /api/auth/facebook/callback (that one redirects
// to the web frontend); this mobile variant needs to redirect to
// AUTH_CALLBACK_SCHEME with the token instead.
export function buildFacebookAuthUrl(): string {
  const redirectUri = `${API_HOST}/api/auth/facebook/callback/mobile`;
  return (
    `https://www.facebook.com/v19.0/dialog/oauth` +
    `?client_id=${FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=email,public_profile`
  );
}

// Confirmed from a real network capture of the site's "Continue with
// Google" button: GET https://accounts.google.com/o/oauth2/v2/auth
// with response_type=code, client_id (Web application type — same one the
// backend already uses to exchange the code), scope=openid email profile,
// access_type=online, prompt=select_account.
const GOOGLE_WEB_CLIENT_ID =
  "598175360751-jmjjrtpfbrp1vu3p9t4nfdr8hie4dn96.apps.googleusercontent.com";

// Requires a NEW backend route — see BACKEND_REQUIREMENTS.md — mirroring
// the Facebook mobile callback pattern: same logic as the existing
// /api/auth/google/callback, but redirects to AUTH_CALLBACK_SCHEME with
// the token instead of the web frontend.
export function buildGoogleAuthUrl(): string {
  const redirectUri = `${API_HOST}/api/auth/google/callback/mobile`;
  return (
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?response_type=code` +
    `&client_id=${GOOGLE_WEB_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&access_type=online` +
    `&prompt=select_account`
  );
}

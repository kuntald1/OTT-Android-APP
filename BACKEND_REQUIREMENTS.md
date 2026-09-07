# Backend changes needed for mobile social login (Path 1)

The mobile app opens the OAuth flow in an in-app browser tab and needs the
backend to redirect back to a custom URL scheme (`theomy://auth-callback`)
with the token, instead of redirecting to the web frontend.

## New route needed: Facebook mobile callback

Add a new endpoint, e.g. `GET /api/auth/facebook/callback/mobile`, that does
the same thing as the existing `/api/auth/facebook/callback` (exchange the
Facebook code, find/create the user, issue a JWT) but instead of redirecting
to `https://movixa.duckdns.org/...`, redirects to:

```
theomy://auth-callback?token=<access_token>&name=<url-encoded name>&email=<url-encoded email>&user_id=<id>&role=<role>
```

(Sending the user's name/email/id/role directly in the redirect avoids the
mobile app needing a separate `/auth/me` call with an unconfirmed shape —
but if `/auth/me` is confirmed and stable, just sending `token` and letting
the app call `/auth/me` works too — whichever is easier on your end.)

## Same pattern for Google — confirmed and ready

Confirmed from a real network capture: the web app hits
`GET https://accounts.google.com/o/oauth2/v2/auth` with
`response_type=code`, `client_id=598175360751-jmjjrtpfbrp1vu3p9t4nfdr8hie4dn96.apps.googleusercontent.com`
(the existing Web application client), `redirect_uri=https://movixa.duckdns.org/api/auth/google/callback`,
`scope=openid email profile`, `access_type=online`, `prompt=select_account`.

Add `GET /api/auth/google/callback/mobile` the same way as the Facebook
mobile callback — same logic as the existing `/api/auth/google/callback`
(exchange code, find/create user, issue JWT), but redirect to
`theomy://auth-callback?token=...` instead of the web frontend. The mobile
app already sends `redirect_uri=https://movixa.duckdns.org/api/auth/google/callback/mobile`
to Google, so once this route exists it'll be hit automatically — no other
change needed on the Google Cloud Console side (the existing Web client ID
is reused as-is, not the separate Android/iOS client IDs created earlier).

## Mid-roll ads — new backend endpoint needed

Confirmed working: pre-roll ads (`ad_cue_points[0]`, offset 0) play correctly on
Android via `react-native-video`'s `adTagUrl` prop + `RNVideo_useExoplayerIMA=true`
in `android/gradle.properties`.

Mid-roll cue points (e.g. offset 15s, 22s — each with its own separate VAST tag)
do NOT play, because `adTagUrl` only accepts a single URL that the IMA SDK
fetches itself — there's no way from the mobile app to hand it several
separate VAST tags at different offsets directly. IMA's mechanism for that
is a **VMAP** (Video Multiple Ad Playlist): a single XML document listing
every ad break's time offset and its own VAST tag URI.

**Requested new endpoint**: `GET /api/videos/{id}/vmap`

Should return XML (`Content-Type: application/xml` or `text/xml`) built from
that video's `ad_cue_points`, one `<vmap:AdBreak>` per cue point:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<vmap:VMAP xmlns:vmap="http://www.iab.net/videoad_vast_vmap_1" version="1.0">
  <vmap:AdBreak timeOffset="start" breakType="linear" breakId="cue-0">
    <vmap:AdSource id="cue-0-ad" allowMultipleAds="false" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[<vast_tag_url for offset 0>]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
  <vmap:AdBreak timeOffset="00:00:15.000" breakType="linear" breakId="cue-15">
    <vmap:AdSource id="cue-15-ad" allowMultipleAds="false" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[<vast_tag_url for offset 15>]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
  <!-- one more <vmap:AdBreak> per remaining cue point, timeOffset = HH:MM:SS.mmm -->
</vmap:VMAP>
```

(`timeOffset="start"` is VMAP's own convention for a pre-roll — offset 0
should use `"start"` rather than `"00:00:00.000"`, both work but `"start"`
is more standard.)

Once this exists, the mobile app switches `adTagUrl` from the single
pre-roll `vast_tag_url` to `https://movixa.duckdns.org/api/videos/{id}/vmap`
— same `adTagUrl` prop, no other native/app change needed.

## Mobile app side for Facebook/Google login (already built)

The app opens:
```
https://www.facebook.com/v19.0/dialog/oauth?client_id=2271307686962571&redirect_uri=https://movixa.duckdns.org/api/auth/facebook/callback/mobile&scope=email,public_profile
```
via `expo-web-browser`'s `openAuthSessionAsync`, watching for any URL
starting with `theomy://auth-callback`. When Facebook redirects to the new
mobile callback above, the browser session closes and the app reads the
`token` (and optional `name`/`email`/`role`) query params to log the person
in — no polling, no separate deep-link listener needed.

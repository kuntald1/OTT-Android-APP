# theomy-mobile (Phase 1)

Expo/React Native client for theomy, talking to the existing FastAPI backend
at `https://movixa.duckdns.org/api` — no backend changes.

## What's built

- Auth: login screen, JWT stored in `expo-secure-store`, 401 → auto-logout
  (handles the backend's single-device-session kickout)
- Plays browse: grid of published Play-section videos
- Video detail: poster, description, cast, Play button
- Video playback: `expo-av` player with a play/pause-aware watch-heartbeat
  timer (mirrors the web app's segment-timer logic), sent every ~20s

## Setup (Docker)

```bash
docker compose up --build
```

This starts the Expo dev server in **tunnel mode** — the terminal will print
a QR code pointing at an `exp.host` tunnel URL. Scan it with the **Expo Go**
app on your phone (Play Store / App Store); phone and PC do **not** need to
be on the same network for tunnel mode.

Live reload works normally — the container bind-mounts the project folder,
so edits on your machine (e.g. in VS Code on Windows) show up immediately
without rebuilding the image. Only rebuild (`docker compose up --build`)
after changing `package.json`.

**LAN mode instead of tunnel** (faster, no internet round-trip, but phone
and PC must share WiFi): edit the `command:` in `docker-compose.yml` to
`npx expo start --lan`, and set `REACT_NATIVE_PACKAGER_HOSTNAME` to your
PC's LAN IP before starting:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (ipconfig | findstr /R "IPv4").Split(":")[1].Trim()
docker compose up --build
```

## Setup (without Docker, if you ever need it)

```bash
npm install
npx expo start
```

## Before running against real data

Field names in `src/types/index.ts` and the request/response shapes in
`src/api/*.ts` (`/auth/login`, `/auth/me`, `/videos`, `/videos/{id}`,
`/videos/{id}/watch-heartbeat`) are based on the theomy handoff doc's
description, **not** a direct read of the backend router/model files.
Before wiring this up for real:

1. Confirm `/auth/login` response shape (does it return `user` inline, or
   need a separate `/auth/me` call?) — `AuthContext.login` assumes inline.
2. Confirm `/videos` query params for filtering by section/status.
3. Confirm the exact playback URL field name on the video detail response
   (Bunny Stream — `playback_url` here is a guess).
4. Confirm `watch-heartbeat` payload shape.

## Not in this phase (flagged in the handoff doc)

- Ads (IMA SDK is web-only — needs a separate mobile ad approach)
- Payments (Razorpay/Stripe native SDKs — different flow from web checkout)
- Push notifications (not implemented anywhere in the backend yet)
- Register screen (only login for now)
- Subscription-scope gating on the player (web app has the same known gap —
  currently only checks login status, not active subscription)

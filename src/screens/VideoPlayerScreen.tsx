import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import RNVideo, { OnLoadData, VideoRef } from "react-native-video";
import { getStoredToken } from "@/api/apiClient";
import { saveProgress, sendWatchHeartbeat, endPlaybackSession } from "@/api/videos";
import { Video } from "@/types";
import { COLORS } from "@/theme/colors";

const HEARTBEAT_INTERVAL_MS = 20_000;

// Uses react-native-video (has built-in Google IMA SDK support via
// adTagUrl) pointed at the backend's /videos/{id}/vmap endpoint — confirmed
// working end-to-end (pre-roll + mid-roll ad breaks all play correctly).
export default function VideoPlayerScreen() {
  const route = useRoute<any>();
  const video: Video = route.params.video;
  const playbackSessionToken: string | undefined = route.params.playbackSessionToken;
  // Trailers (e.g. locked Archive content) play the short trailer_playback_url
  // instead — no playback session, heartbeat, resume position, or ads,
  // since it's not the actual monetized content.
  const isTrailer: boolean = route.params.isTrailer === true;

  const playerRef = useRef<VideoRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [authToken, setAuthToken] = useState<string | null | undefined>(undefined);

  // Watch-segment tracker — mirrors the web app's
  // src/shared/watchSegmentTracker.js exactly, so both platforms feed
  // the backend's range-based crediting model (see
  // backend/app/routers/watch.py's _merge_watched_range) the same way:
  // the CURRENT continuously-watched stretch [segmentStart, lastPos]
  // of the video's own timeline, reset to a fresh segment on every
  // seek/scrub. Resending an already-reported/overlapping segment is
  // always safe — the backend's watched-ranges union merge is
  // idempotent — so there's no need to advance segmentStart after each
  // periodic flush, only an actual seek should start a new one.
  const segmentStartRef = useRef<number | null>(null);
  const lastPositionRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const currentPositionSecondsRef = useRef(isTrailer ? 0 : video.resume_position_seconds || 0);

  const reportPosition = (pos: number) => {
    if (segmentStartRef.current === null) segmentStartRef.current = pos;
    lastPositionRef.current = pos;
  };

  const sourceUrl = isTrailer ? video.trailer_playback_url : video.playback_url;
  const hasAds = !isTrailer && video.ad_cue_points && video.ad_cue_points.length > 0;
  // The IMA SDK makes its own native HTTP request for this — it does NOT go
  // through our axios client, so the usual Authorization header never
  // reaches it. The backend expects the token as a query param instead
  // (confirmed with the backend team), so the video element is held back
  // (see the loading branch below) until the token is loaded from storage.
  const vmapUrl =
    hasAds && authToken
      ? `https://movixa.duckdns.org/api/videos/${video.id}/vmap?token=${encodeURIComponent(authToken)}`
      : undefined;

  useEffect(() => {
    if (isTrailer) return;
    (async () => {
      const token = await getStoredToken();
      setAuthToken(token);
    })();
  }, [isTrailer]);

  const flushSegment = async () => {
    const start = segmentStartRef.current;
    const end = lastPositionRef.current;
    if (start === null || end === null || end <= start) return;
    const roundedStart = Math.round(start);
    const roundedEnd = Math.round(end);
    if (roundedEnd <= roundedStart) return;
    try {
      if (playbackSessionToken) {
        await sendWatchHeartbeat(video.id, roundedStart, roundedEnd, playbackSessionToken);
      }
      await saveProgress(video.id, roundedEnd);
    } catch {
      // Silently retry next tick — the segment stays tracked (not
      // reset), so the next successful heartbeat just resends a
      // slightly longer version of the same stretch.
    }
  };

  useEffect(() => {
    if (isTrailer) return;
    const interval = setInterval(flushSegment, HEARTBEAT_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      flushSegment(); // final heartbeat on unmount so the last stretch isn't lost
      // Frees this device's screens-limit slot immediately instead of
      // waiting out the backend's 50s stale-session window — matters
      // when someone closes the player and wants to start watching on
      // another device right away.
      if (playbackSessionToken) {
        endPlaybackSession(playbackSessionToken).catch(() => {
          // Not critical — the backend's own 50s timeout frees the slot
          // anyway if this call fails (e.g. app killed mid-request).
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id, playbackSessionToken, isTrailer]);

  const handleLoad = (data: OnLoadData) => {
    setIsLoaded(true);
    const resumeSeconds = isTrailer ? 0 : video.resume_position_seconds || 0;
    if (resumeSeconds > 2) {
      playerRef.current?.seek(resumeSeconds);
    }
    isPlayingRef.current = true;
  };

  const handleProgress = (data: { currentTime: number }) => {
    currentPositionSecondsRef.current = data.currentTime;
    // Ad time is excluded the same way paused/buffering time is — the
    // segment tracker only accumulates while content is actually
    // playing, never during an ad break.
    if (isPlayingRef.current && !isAdPlaying) {
      // Safety net for react-native-video's onSeek not firing when the
      // NATIVE controls scrubber is dragged (a known issue on v6) — if
      // position jumped by much more than one progress tick's worth of
      // real playback, treat it as an undetected seek: flush whatever
      // was genuinely watched so far, then start a fresh segment at the
      // new position. Without this, a scrubbed-past range could get
      // silently reported to the backend as watched.
      const last = lastPositionRef.current;
      const JUMP_THRESHOLD_SECONDS = 3;
      if (last !== null && Math.abs(data.currentTime - last) > JUMP_THRESHOLD_SECONDS) {
        flushSegment();
        segmentStartRef.current = data.currentTime;
        lastPositionRef.current = data.currentTime;
      } else {
        reportPosition(data.currentTime);
      }
    }
  };

  // Fires once a seek (via the native scrubber OR playerRef.seek())
  // completes. Whatever was being tracked is now a finished, genuine
  // segment — flush it immediately (don't wait for the next 20s tick)
  // via the same sender the interval above uses, then start fresh
  // from wherever the seek landed. This is what makes drag/scrub
  // jumps NOT count as watched time — the skipped range is never
  // reported to the backend at all.
  const handleSeek = (data: { currentTime: number; seekTime: number }) => {
    flushSegment();
    segmentStartRef.current = data.currentTime;
    lastPositionRef.current = data.currentTime;
  };

  // NOTE: onPlaybackStateChanged is react-native-video's documented
  // play/pause callback as of v6 — verify against the installed version's
  // types once `npx expo install react-native-video` completes locally.
  const handlePlaybackStateChanged = (data: { isPlaying: boolean }) => {
    isPlayingRef.current = data.isPlaying;
  };

  // IMA ad events: excluded from the watch-segment tracker for the ad's
  // duration (see handleProgress's isAdPlaying gate) — content position
  // doesn't move during the ad, so once it ends the same segment just
  // continues, no seek/reset needed.
  const handleAdEvent = (event: { event: string }) => {
    if (event.event === "STARTED") setIsAdPlaying(true);
    if (["COMPLETED", "SKIPPED", "ALL_ADS_COMPLETED", "ERROR"].includes(event.event)) {
      setIsAdPlaying(false);
    }
  };

  if (!sourceUrl) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {isTrailer ? "Trailer not available" : "Playback URL not available"}
        </Text>
      </View>
    );
  }

  // Wait for the auth token to load before mounting the player when this
  // video has ads — otherwise adTagUrl would mount without the token and
  // IMA would fire its (unauthenticated) VMAP request too early.
  if (hasAds && authToken === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RNVideo
        ref={playerRef}
        source={{
          uri: sourceUrl,
          // Bunny Stream (the actual video CDN, vz-*.b-cdn.net) checks the
          // Referer/Origin against an allow-list configured in its own
          // dashboard — unlike the poster images (served from movixa's own
          // backend), which needed no header at all. Sending the site's
          // real origin here only works once that origin is whitelisted in
          // Bunny Stream's Security settings (see reply for where).
          headers: {
            Referer: "https://movixa.duckdns.org/",
            Origin: "https://movixa.duckdns.org",
          },
        }}
        adTagUrl={vmapUrl}
        style={styles.video}
        controls
        resizeMode="contain"
        paused={false}
        onLoad={handleLoad}
        onProgress={handleProgress}
        onSeek={handleSeek}
        onPlaybackStateChanged={handlePlaybackStateChanged}
        onReceiveAdEvent={handleAdEvent}
        onError={(e) => setError(JSON.stringify(e))}
      />
      {!isLoaded && !error && (
        <View style={styles.overlay}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      )}
      {error && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>Couldn't start playback</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorText: { color: "#ef4444", textAlign: "center" },
  errorDetail: { color: "#ef4444", opacity: 0.7, fontSize: 11, marginTop: 8, textAlign: "center" },
  video: { width: "100%", aspectRatio: 16 / 9 },
});

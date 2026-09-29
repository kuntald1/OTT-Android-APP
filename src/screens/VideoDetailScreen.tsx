import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import RNVideo from "react-native-video";
import { getPlaybackSessionToken, resolveMediaUrl } from "@/api/apiClient";
import {
  fetchArchive,
  fetchPlays,
  fetchRecommendations,
  startPlaybackSession,
  toggleLike,
  toggleMyList,
} from "@/api/videos";
import { onSubscriptionChanged } from "@/hooks/useSubscriptionAccess";
import { useAuth } from "@/context/AuthContext";
import { CastMember, CrewMember, Video } from "@/types";
import { COLORS } from "@/theme/colors";

// video arrives via navigation params from PlaysBrowseScreen — the /videos
// list endpoint already returns full detail, so there's no separate detail
// fetch here. "More Like This" uses the confirmed /videos/recommendations
// endpoint, falling back to the caller-supplied relatedVideos if that fails
// or comes back empty.
export default function VideoDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const video: Video = route.params.video;
  const fallbackRelated: Video[] = route.params.relatedVideos || [];

  const [liked, setLiked] = useState(video.liked_by_me);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [inMyList, setInMyList] = useState(video.in_my_list);
  const [startingPlayback, setStartingPlayback] = useState(false);
  // Themed replacement for the native Alert.alert — the OS dialog
  // can't be styled to match the app (plain white/system look), so
  // playback-blocking messages (screens limit, connection failure) use
  // this instead.
  const [alertMessage, setAlertMessage] = useState<{ title: string; body: string } | null>(null);
  const [recommended, setRecommended] = useState<Video[]>(fallbackRelated);
  const [trailerFailed, setTrailerFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const recs = await fetchRecommendations();
        const filtered = recs.filter((v) => v.id !== video.id);
        if (filtered.length > 0) setRecommended(filtered);
      } catch {
        // Keep the category-based fallback from PlaysBrowseScreen.
      }
    })();
  }, [video.id]);

  // This screen shows a snapshot of the video taken when it was opened, so
  // after subscribing (e.g. tapped "Subscribe" here, paid, came back) it
  // would keep showing the old locked state. On a subscription change, look
  // this video up again in the section lists (which carry the real
  // has_access) and swap it into the route params.
  useEffect(
    () =>
      onSubscriptionChanged(() => {
        (async () => {
          try {
            const [plays, archive] = await Promise.all([fetchPlays(), fetchArchive()]);
            const fresh = [...plays, ...archive].find((v) => v.id === video.id);
            if (fresh) navigation.setParams({ video: fresh });
          } catch {
            // Keep showing the current state; a manual reopen still works.
          }
        })();
      }),
    [video.id, navigation]
  );

  const handleToggleLike = async () => {
    setLiked(!liked);
    setLikesCount((c) => (liked ? c - 1 : c + 1));
    try {
      const res = await toggleLike(video.id);
      setLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch {
      setLiked(liked);
      setLikesCount(likesCount);
    }
  };

  const handleToggleMyList = async () => {
    setInMyList(!inMyList);
    try {
      const res = await toggleMyList({
        item_id: video.id,
        title: video.title,
        image_url: video.poster_image_url,
        meta: `${video.release_year} · ${video.age_rating}`,
        section: "Video Streaming",
      });
      setInMyList(res.saved);
    } catch {
      setInMyList(inMyList);
    }
  };

  const handlePlay = async () => {
    setStartingPlayback(true);
    try {
      const sessionToken = await getPlaybackSessionToken();
      const session = await startPlaybackSession(video.id, sessionToken);
      if (!session.allowed) {
        setAlertMessage({
          title: "Too many screens active",
          body:
            session.reason ||
            `Up to ${session.max_screens} screens can play at once — ${session.active_screens} are active right now.`,
        });
        return;
      }
      navigation.navigate("VideoPlayer", {
        video,
        playbackSessionToken: sessionToken,
      });
    } catch {
      // Fail CLOSED, not open. Previously this fell through to
      // navigate("VideoPlayer", { video }) with no token, which meant
      // any error here silently bypassed the screens limit and left
      // the device invisible to it. Better to tell the viewer to
      // retry than to hand out an unmetered stream.
      setAlertMessage({ title: "Couldn't start playback", body: "Please check your connection and try again." });
    } finally {
      setStartingPlayback(false);
    }
  };

  const goToPerson = (person: import("@/types").Person) => {
    navigation.navigate("PersonDetail", { person });
  };

  const renderCastRow = (member: CastMember) => (
    <TouchableOpacity
      key={member.id}
      style={styles.personRow}
      onPress={() => goToPerson(member.person)}
    >
      <Image
        source={{ uri: resolveMediaUrl(member.person.photo_url) }}
        style={styles.personPhoto}
      />
      <Text style={styles.personLink}>
        {member.person.name}
        {member.character_role ? ` — ${member.character_role}` : ""}
      </Text>
    </TouchableOpacity>
  );

  const renderCrewRow = (member: CrewMember) => (
    // Matches the web app's display exactly — the backend's crew.role field
    // actually holds the person's name, and person.name holds their job
    // title (a data-model quirk, not a bug in this app).
    <TouchableOpacity
      key={member.id}
      style={styles.personRow}
      onPress={() => goToPerson(member.person)}
    >
      <Image
        source={{ uri: resolveMediaUrl(member.person.photo_url) }}
        style={styles.personPhoto}
      />
      <Text style={styles.sectionItem}>
        {member.role}: <Text style={styles.personLink}>{member.person.name}</Text>
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
    <ScrollView style={styles.container}>
      <View style={styles.poster}>
        {video.trailer_playback_url && !trailerFailed ? (
          // Autoplaying trailer preview (looping, with sound) — plays
          // automatically when the detail screen opens. Deliberately not
          // wired to playback-session/heartbeat/progress, so trailer time
          // never counts toward paid watch-minutes.
          <RNVideo
            source={{
              uri: video.trailer_playback_url,
              // Same Bunny Stream Referer/Origin requirement as
              // VideoPlayerScreen — without these the trailer silently
              // fails and renders as a black box instead of erroring.
              headers: {
                Referer: "https://movixa.duckdns.org/",
                Origin: "https://movixa.duckdns.org",
              },
            }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            muted={false}
            repeat
            paused={false}
            onError={() => setTrailerFailed(true)}
          />
        ) : (
          <Image
            source={{ uri: resolveMediaUrl(video.poster_image_url) || resolveMediaUrl(video.thumbnail_url) }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{video.title}</Text>

        <View style={styles.actionRow}>
          {video.has_access !== false && (
            <TouchableOpacity style={styles.playButton} onPress={handlePlay} disabled={startingPlayback}>
              {startingPlayback ? (
                <ActivityIndicator color={COLORS.ctaText} size="small" />
              ) : (
                <Text style={styles.playButtonText}>▶ Play</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconButton} onPress={handleToggleMyList}>
            <Text style={[styles.iconButtonText, inMyList && styles.iconButtonTextActive]}>
              {inMyList ? "✓" : "+"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleToggleLike}>
            <Text style={[styles.iconButtonText, liked && styles.iconButtonTextActive]}>
              👍 {likesCount}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.meta}>
          {video.release_year} · {video.duration_seconds ? `0h ${Math.round(video.duration_seconds / 60)}m` : ""} · {video.age_rating}
        </Text>

        {video.description && <Text style={styles.description}>{video.description}</Text>}

        {/* Explicitly === false — see the resolveFullVideo fix in
            PlaysBrowseScreen.tsx/ArchiveScreen.tsx for the real fix
            (cross-section videos now resolve to their true
            has_access); this is only a backup for the rare case a
            video isn't found in either pool. Genuinely unknown access
            should never show this box — real enforcement still
            happens server-side when the stream itself is requested.

            Message is specific to THIS video's own section (Play or
            Archive) rather than a generic "a subscription is needed" —
            a Play-only subscriber hitting an Archive video should be
            told exactly what to add ("Subscribe to Archive"), not left
            to guess which of the two plans covers it. */}
        {video.has_access === false && (
          <TouchableOpacity
            style={styles.lockedBox}
            onPress={() => navigation.navigate("SubscriptionPlans")}
          >
            <Text style={styles.lockedText}>
              {video.monetization_type === "pay_per_video" && video.pricing
                ? `₹${video.pricing.price_inr} needed to watch this video`
                : user?.parent_id
                // A sub-account can't buy a plan; the main account holder does.
                ? `Ask the main account holder to add ${video.section === "archive" ? "Archive" : video.section === "play" ? "Play" : "a plan"} to watch this video`
                : video.section === "archive"
                ? "Subscribe to Archive to watch this video"
                : video.section === "play"
                ? "Subscribe to Play to watch this video"
                : "A subscription is needed to watch this video"}
            </Text>
          </TouchableOpacity>
        )}

        {video.categories && video.categories.length > 0 && (
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>GENRES</Text>
            <Text style={styles.metaValue}>{video.categories.join(", ")}</Text>
          </View>
        )}

        {video.languages && video.languages.length > 0 && (
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>AVAILABLE IN</Text>
            <Text style={styles.metaValue}>{video.languages.join(", ")}</Text>
          </View>
        )}

        {video.cast && video.cast.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>CAST</Text>
            {video.cast.map(renderCastRow)}
          </View>
        )}

        {video.crew && video.crew.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>CREW</Text>
            {video.crew.map(renderCrewRow)}
          </View>
        )}

        {video.uploaded_by_name && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>STUDIO</Text>
            <TouchableOpacity
              style={styles.studioRow}
              onPress={() =>
                navigation.navigate("StudioProfile", {
                  userId: video.uploaded_by_user_id,
                  name: video.uploaded_by_name,
                  section: video.section,
                })
              }
            >
              <Text style={styles.studioName}>{video.uploaded_by_name}</Text>
              <Text style={styles.studioChevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        {recommended.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>MORE LIKE THIS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
              {recommended.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => navigation.push("VideoDetail", { video: item })}
                >
                  <Image
                    source={{ uri: resolveMediaUrl(item.poster_image_url) || resolveMediaUrl(item.thumbnail_url) }}
                    style={styles.relatedPoster}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>

    <Modal visible={!!alertMessage} transparent animationType="fade" onRequestClose={() => setAlertMessage(null)}>
      <View style={styles.alertOverlay}>
        <View style={styles.alertBox}>
          <Text style={styles.alertTitle}>{alertMessage?.title}</Text>
          <Text style={styles.alertBody}>{alertMessage?.body}</Text>
          <TouchableOpacity style={styles.alertButton} onPress={() => setAlertMessage(null)}>
            <Text style={styles.alertButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  alertBox: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.burgundyDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },
  alertTitle: { color: COLORS.cream, fontSize: 17, fontWeight: "700", marginBottom: 8 },
  alertBody: { color: COLORS.cream, opacity: 0.85, fontSize: 14, lineHeight: 20 },
  alertButton: {
    alignSelf: "flex-end",
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gold,
  },
  alertButtonText: { color: COLORS.ctaText, fontSize: 14, fontWeight: "700" },
  container: { flex: 1, backgroundColor: COLORS.background },
  poster: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.burgundyDark,
    overflow: "hidden",
  },
  content: { padding: 16 },
  title: { color: COLORS.cream, fontSize: 22, fontWeight: "700" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  playButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  playButtonText: { color: COLORS.ctaText, fontSize: 15, fontWeight: "700" },
  iconButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  iconButtonText: { color: COLORS.cream, fontSize: 14 },
  iconButtonTextActive: { color: COLORS.gold, fontWeight: "700" },
  meta: { color: COLORS.gold, marginTop: 12 },
  description: { color: COLORS.cream, marginTop: 12, lineHeight: 20, opacity: 0.85 },
  lockedBox: {
    backgroundColor: COLORS.burgundyDark,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  lockedText: { color: COLORS.gold, fontSize: 15 },
  metaBlock: { marginTop: 16 },
  metaLabel: { color: COLORS.cream, opacity: 0.5, fontSize: 11, letterSpacing: 1 },
  metaValue: { color: COLORS.cream, fontSize: 14, marginTop: 2 },
  section: { marginTop: 24 },
  sectionHeading: {
    color: COLORS.cream,
    opacity: 0.5,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionItem: { color: COLORS.cream, opacity: 0.85, fontSize: 14 },
  studioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  studioName: { color: COLORS.gold, fontSize: 15, fontWeight: "700" },
  studioChevron: { color: COLORS.gold, fontSize: 20 },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  personPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.burgundyDark,
  },
  personLink: { color: COLORS.gold, fontSize: 14, fontWeight: "600" },
  relatedRow: { gap: 10, paddingTop: 4 },
  relatedPoster: {
    width: 110,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.burgundyDark,
  },
});

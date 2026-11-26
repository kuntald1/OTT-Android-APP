import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";
import RNVideo from "react-native-video";
import { getPlaybackSessionToken, MEDIA_HEADERS, resolveMediaUrl } from "@/api/apiClient";
import {
  fetchArchive,
  fetchPlays,
  fetchRecommendations,
  startPlaybackSession,
  toggleMyList,
} from "@/api/videos";
import { onSubscriptionChanged, useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAuth } from "@/context/AuthContext";
import { CastMember, CrewMember, Video } from "@/types";
import { COLORS } from "@/theme/colors";
import { WEB_PURCHASE_NOTICE_VIDEO } from "@/utils/purchaseNotice";
import { ageRatingLabel } from "@/shared/ageRatings";
import ThemedAlert, { ThemedAlertState } from "@/components/ThemedAlert";

// video arrives via navigation params from PlaysBrowseScreen — the /videos
// list endpoint already returns full detail, so there's no separate detail
// fetch here. "More Like This" uses the confirmed /videos/recommendations
// endpoint, falling back to the caller-supplied relatedVideos if that fails
// or comes back empty.
export default function VideoDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { hasPlay, hasArchive, isSubscribed } = useSubscriptionAccess();
  const isFocused = useIsFocused();
  const video: Video = route.params.video;
  const fallbackRelated: Video[] = route.params.relatedVideos || [];

  const [inMyList, setInMyList] = useState(video.in_my_list);
  const [startingPlayback, setStartingPlayback] = useState(false);
  // Themed replacement for the native Alert.alert — the OS dialog
  // can't be styled to match the app (plain white/system look), so
  // playback-blocking messages (screens limit, connection failure,
  // "subscription required") use this instead.
  const [alertMessage, setAlertMessage] = useState<ThemedAlertState>(null);
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

  const handleToggleMyList = async () => {
    setInMyList(!inMyList);
    try {
      const res = await toggleMyList({
        item_id: video.id,
        title: video.title,
        image_url: video.poster_image_url,
        meta: `${video.release_year} · ${ageRatingLabel(video.age_rating)}`,
        section: "Video Streaming",
      });
      setInMyList(res.saved);
    } catch {
      setInMyList(inMyList);
    }
  };

  // What the section this video sits in is called on the plans page, so
  // the message can name the exact plan to buy rather than "a plan".
  const sectionLabel =
    video.section === "archive" ? "Heritage" : video.section === "play" ? "Contemporary" : null;

  // Second opinion on access, for the case the video object itself is
  // stale or came from a list that didn't carry the real has_access (a
  // recommendation row, a search result). It asks the same question the
  // header's Contemporary/Heritage pills ask, so a Heritage video and the
  // Heritage pill can never disagree about whether this person is in.
  //
  // Only ever applied to subscription_only content: a pay-per-video the
  // person BOUGHT, and a free video, are watchable with no plan at all,
  // and must not be caught by a plan check. isSubscribed === null means
  // "couldn't tell" (logged out, network error) — that blocks nothing
  // here, exactly as it blocks no pill.
  const planMissing =
    video.monetization_type === "subscription_only" &&
    (isSubscribed === false ||
      (video.section === "archive" && !hasArchive) ||
      (video.section === "play" && !hasPlay));

  // has_access === true is the server's own yes and always wins; the plan
  // check above is only consulted when the video didn't bring a no of its own.
  const locked = video.has_access === false || (video.has_access !== true && planMissing);

  // Play is now shown on every video, locked or not — a greyed-out or
  // absent button left people guessing what the video even was. Tapping a
  // locked one explains what's missing and offers the way out, instead of
  // starting a stream the server would refuse anyway.
  const showLockedMessage = () => {
    if (video.monetization_type === "pay_per_video") {
      setAlertMessage({
        title: "This video is bought on its own",
        body: video.pricing
          ? `${WEB_PURCHASE_NOTICE_VIDEO} It costs ₹${video.pricing.price_inr}.`
          : WEB_PURCHASE_NOTICE_VIDEO,
      });
      return;
    }
    if (user?.parent_id) {
      // A sub-account can't buy a plan, so sending it to the plans page
      // would be a dead end — name who can instead.
      setAlertMessage({
        title: "Subscription required",
        body: `Ask the main account holder to add ${sectionLabel || "a plan"} to watch this.`,
      });
      return;
    }
    setAlertMessage({
      title: "Subscription required",
      // Same two sentences as the header's pill alert, so the app says
      // one thing about a missing plan wherever you meet it.
      body:
        isSubscribed === false
          ? `You don't have an active plan yet. Subscribe to watch ${sectionLabel || "this"}.`
          : `${sectionLabel || "This video"} isn't included in your current plan. View plans to get access?`,
      buttons: [
        { label: "Not now", style: "cancel" },
        { label: "Yes, view plans", onPress: () => navigation.navigate("SubscriptionPlans") },
      ],
    });
  };

  const handlePlay = async () => {
    if (locked) {
      showLockedMessage();
      return;
    }
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
              headers: MEDIA_HEADERS,
            }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            // Silenced and stopped the moment this screen is no longer the
            // one on top — otherwise the preview carried on playing under
            // the video player pushed over it, and its sound came through
            // whenever the actual video was paused.
            muted={!isFocused}
            repeat
            paused={!isFocused}
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
          <TouchableOpacity style={styles.playButton} onPress={handlePlay} disabled={startingPlayback}>
            {startingPlayback ? (
              <ActivityIndicator color={COLORS.ctaText} size="small" />
            ) : (
              <Text style={styles.playButtonText}>▶ Play</Text>
            )}
          </TouchableOpacity>
          {/* Add-to-My-List only. The thumbs-up that used to sit beside it
              is gone at the client's request — a like count on a theatre
              recording wasn't earning its place next to Play. The backend
              route and the stored likes are untouched. */}
          <TouchableOpacity style={styles.iconButton} onPress={handleToggleMyList}>
            <Text style={[styles.iconButtonText, inMyList && styles.iconButtonTextActive]}>
              {inMyList ? "✓" : "+"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.meta}>
          {video.release_year} · {video.duration_seconds ? `0h ${Math.round(video.duration_seconds / 60)}m` : ""} · {ageRatingLabel(video.age_rating)}
        </Text>

        {video.description && <Text style={styles.description}>{video.description}</Text>}

        {/* Same `locked` the Play button uses, so the hint written here
            and the dialog a Play tap opens can never disagree. It is
            still only a hint — real enforcement happens server-side when
            the stream itself is requested.

            Message is specific to THIS video's own section (Play or
            Archive) rather than a generic "a subscription is needed" —
            a Play-only subscriber hitting an Archive video should be
            told exactly what to add ("Subscribe to Archive"), not left
            to guess which of the two plans covers it. */}
        {locked && video.monetization_type === "pay_per_video" && (
          <View style={styles.lockedBox}>
            <Text style={styles.lockedText}>
              {video.pricing
                ? `₹${video.pricing.price_inr} needed to watch this video`
                : "This video is bought on its own"}
            </Text>
            <Text style={styles.lockedNotice}>{WEB_PURCHASE_NOTICE_VIDEO}</Text>
          </View>
        )}

        {locked && video.monetization_type !== "pay_per_video" && (
          <TouchableOpacity
            style={styles.lockedBox}
            onPress={() => navigation.navigate("SubscriptionPlans")}
          >
            <Text style={styles.lockedText}>
              {user?.parent_id
                // A sub-account can't buy a plan; the main account holder does.
                ? `Ask the main account holder to add ${video.section === "archive" ? "Heritage" : video.section === "play" ? "Contemporary" : "a plan"} to watch this video`
                : video.section === "archive"
                ? "Subscribe to Heritage to watch this video"
                : video.section === "play"
                ? "Subscribe to Contemporary to watch this video"
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

    {/* Was a copy of ThemedAlert's markup inlined here; now the shared
        component, which looks identical but also takes buttons — needed
        for the "Not now / Yes, view plans" pair. */}
    <ThemedAlert alert={alertMessage} onClose={() => setAlertMessage(null)} />
    </>
  );
}

const styles = StyleSheet.create({
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
  lockedNotice: { color: COLORS.textMuted, fontSize: 13, marginTop: 8, lineHeight: 18 },
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

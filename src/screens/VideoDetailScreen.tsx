import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import RNVideo from "react-native-video";
import { resolveMediaUrl } from "@/api/apiClient";
import {
  fetchRecommendations,
  startPlaybackSession,
  toggleLike,
  toggleMyList,
} from "@/api/videos";
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
  const video: Video = route.params.video;
  const fallbackRelated: Video[] = route.params.relatedVideos || [];

  const [liked, setLiked] = useState(video.liked_by_me);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [inMyList, setInMyList] = useState(video.in_my_list);
  const [startingPlayback, setStartingPlayback] = useState(false);
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
      const session = await startPlaybackSession(video.id);
      if (!session.allowed) {
        Alert.alert(
          "Too many screens active",
          session.reason ||
            `Up to ${session.max_screens} screens can play at once — ${session.active_screens} are active right now.`
        );
        return;
      }
      navigation.navigate("VideoPlayer", {
        video,
        playbackSessionToken: session.session_token,
      });
    } catch {
      navigation.navigate("VideoPlayer", { video });
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
          {video.has_access && (
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

        {!video.has_access && (
          <View style={styles.lockedBox}>
            <Text style={styles.lockedText}>
              {video.monetization_type === "pay_per_video" && video.pricing
                ? `₹${video.pricing.price_inr} needed to watch this video`
                : "A subscription is needed to watch this video"}
            </Text>
          </View>
        )}

        {video.categories.length > 0 && (
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>GENRES</Text>
            <Text style={styles.metaValue}>{video.categories.join(", ")}</Text>
          </View>
        )}

        {video.languages.length > 0 && (
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>AVAILABLE IN</Text>
            <Text style={styles.metaValue}>{video.languages.join(", ")}</Text>
          </View>
        )}

        {video.cast.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>CAST</Text>
            {video.cast.map(renderCastRow)}
          </View>
        )}

        {video.crew.length > 0 && (
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

import React, { useState } from "react";
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import RNVideo from "react-native-video";
import { resolveMediaUrl } from "@/api/apiClient";
import { Video } from "@/types";
import { COLORS, ELEVATION, RADIUS, SPACING, TYPE } from "@/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Asymmetric-peek layout (cards start flush at the left, next card's edge
// peeks in on the right) — flows continuously, "one after another".
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_SPACING = 14;
const STEP = CARD_WIDTH + CARD_SPACING;

export default function FeaturedCarousel({
  videos,
  onPressCard,
}: {
  videos: Video[];
  onPressCard: (video: Video) => void;
}) {
  // Only the centered/active card autoplays a muted preview (when it has a
  // trailer) — the rest stay as static posters, matching the "active card
  // keeps focus" behavior from the reference spec, and avoiding the cost of
  // running several video players at once.
  const [activeIndex, setActiveIndex] = useState(0);
  // One mute toggle for the carousel (only the active card ever plays audio
  // at a time, so a single flag is enough) — starts unmuted to match the
  // existing autoplay behavior, user can tap to mute.
  const [muted, setMuted] = useState(false);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / STEP);
    setActiveIndex(Math.max(0, Math.min(index, videos.length - 1)));
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={STEP}
        snapToAlignment="start"
        onMomentumScrollEnd={handleScrollEnd}
        contentContainerStyle={styles.scrollContent}
      >
        {videos.map((video, index) => {
        const isActive = index === activeIndex;
        const posterUrl = resolveMediaUrl(video.poster_image_url) || resolveMediaUrl(video.thumbnail_url);

        return (
          <TouchableOpacity
            key={video.id}
            style={styles.cardShadow}
            activeOpacity={0.9}
            onPress={() => onPressCard(video)}
          >
            <View style={styles.card}>
              {isActive && video.trailer_playback_url ? (
                <RNVideo
                  source={{
                    uri: video.trailer_playback_url,
                    // Bunny Stream (vz-*.b-cdn.net) rejects requests without
                    // these headers — same fix already confirmed working in
                    // VideoPlayerScreen. Without them the video silently
                    // fails to decode, rendering as a plain black box.
                    headers: {
                      Referer: "https://movixa.duckdns.org/",
                      Origin: "https://movixa.duckdns.org",
                    },
                  }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  muted={muted}
                  repeat
                  paused={false}
                />
              ) : (
                <Image
                  source={posterUrl ? { uri: posterUrl } : undefined}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              )}

              <LinearGradient
                colors={["transparent", "rgba(20,0,4,0.55)", "rgba(20,0,4,0.92)"]}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
              />

              {video.categories && video.categories[0] && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{video.categories[0]}</Text>
                </View>
              )}
              <View style={styles.hdBadge}>
                <Text style={styles.hdBadgeText}>HD</Text>
              </View>

              {isActive && video.trailer_playback_url && (
                <TouchableOpacity
                  style={styles.muteButton}
                  onPress={() => setMuted((m) => !m)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={muted ? "volume-mute" : "volume-high"}
                    size={16}
                    color={COLORS.cream}
                  />
                </TouchableOpacity>
              )}

              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                  {video.title}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {[video.release_year, video.languages[0]].filter(Boolean).join(" · ")}
                </Text>
                <TouchableOpacity style={styles.watchNowButton} onPress={() => onPressCard(video)}>
                  <Text style={styles.playIcon}>▶</Text>
                  <Text style={styles.watchNowText}>Watch Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
        })}
      </ScrollView>

      {videos.length > 1 && (
        <View style={styles.dotsRow}>
          {videos.map((video, index) => (
            <View
              key={video.id}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingLeft: 16, paddingRight: 4 },
  // Shadow (elevation, Android) lives on this outer, non-clipping wrapper.
  // `overflow: "hidden"` + `elevation` on the same View is a known Android
  // bug that silently prevents clipped children (our poster Image) from
  // rendering — the real cause of the blank/black cards, not headers.
  cardShadow: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.15,
    marginRight: CARD_SPACING,
    borderRadius: RADIUS.lg,
    ...ELEVATION.hero,
  },
  card: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    backgroundColor: COLORS.burgundyDark,
    justifyContent: "flex-end",
  },
  badge: {
    position: "absolute",
    top: SPACING.lg,
    left: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { ...TYPE.overline, color: COLORS.gold },
  hdBadge: {
    position: "absolute",
    top: SPACING.lg,
    right: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  hdBadgeText: { ...TYPE.overline, color: COLORS.cream },
  muteButton: {
    position: "absolute",
    top: SPACING.lg + 28,
    right: SPACING.lg,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: SPACING.lg },
  title: { ...TYPE.title, fontSize: 24, color: COLORS.cream },
  subtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 3, marginBottom: SPACING.md },
  watchNowButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
  },
  playIcon: { color: COLORS.ctaText, fontSize: 12 },
  watchNowText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: SPACING.md,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)" },
  dotActive: { backgroundColor: COLORS.gold, width: 16 },
});

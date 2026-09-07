import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { resolveMediaUrl } from "@/api/apiClient";
import { Video } from "@/types";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

export const MEDIA_CARD_WIDTH = 190;
const MEDIA_CARD_HEIGHT = MEDIA_CARD_WIDTH * 1.5;

// Same resolution order VideoDetailScreen uses (poster_image_url, falling
// back to thumbnail_url) — no special headers needed.
function resolvePosterSource(video: Video) {
  const url = resolveMediaUrl(video.poster_image_url) || resolveMediaUrl(video.thumbnail_url);
  return url ? { uri: url } : undefined;
}

// Single card component shared across every row (Plays, Archive,
// Recommended, Continue Watching) so the whole app has one consistent
// treatment — badges sit *on* the poster instead of stacking as loose text
// underneath, which is what made the old rows look cluttered.
export default function MediaCard({
  video,
  onPress,
  progressPercent,
  accentColor = COLORS.gold,
}: {
  video: Video;
  onPress: () => void;
  progressPercent?: number;
  accentColor?: string;
}) {
  const priceLabel =
    video.monetization_type === "pay_per_video" && video.pricing
      ? `₹${parseFloat(video.pricing.price_inr)}`
      : null;
  const source = resolvePosterSource(video);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.posterWrap}>
        {source ? (
          <Image source={source} style={styles.poster} resizeMode="cover" />
        ) : (
          // No poster_image_url or thumbnail_url came back for this video
          // from the backend — show a placeholder instead of a blank black
          // box so it doesn't look broken.
          <View style={styles.posterFallback}>
            <MaterialCommunityIcons name="movie-open-outline" size={30} color={COLORS.textFaint} />
          </View>
        )}

        <LinearGradient
          colors={["transparent", "rgba(20,0,4,0.75)"]}
          locations={[0.55, 1]}
          style={styles.posterOverlay}
        />

        {!video.has_access && (
          <View style={styles.lockChip}>
            <Text style={styles.lockChipText}>🔒</Text>
          </View>
        )}

        {priceLabel && (
          <View style={[styles.priceChip, { backgroundColor: accentColor }]}>
            <Text style={styles.priceChipText}>{priceLabel}</Text>
          </View>
        )}

        {progressPercent != null && (
          <TouchableOpacity style={styles.playChip} onPress={onPress}>
            <Text style={styles.playChipIcon}>▶</Text>
          </TouchableOpacity>
        )}

        {progressPercent != null && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]}
              />
            </View>
            <Text style={styles.progressLabel}>{Math.round(progressPercent)}%</Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={[styles.meta, { color: accentColor }]} numberOfLines={1}>
        {video.monetization_type === "subscription_only"
          ? "Subscription"
          : [video.release_year, video.age_rating].filter(Boolean).join(" · ")}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: MEDIA_CARD_WIDTH },
  // Built exactly like MyListScreen's poster (which renders fine): the
  // Image itself carries the width/height and creates the layout, and the
  // wrapper is just `position: relative` with no elevation. Previously the
  // Image used absoluteFill inside an elevated wrapper — on Android an
  // absolutely-positioned child of an elevated View gets no measured size
  // and never draws, which is why these boxes were blank while the hero
  // (whose card is not elevated the same way) worked.
  posterWrap: { position: "relative" },
  poster: {
    width: MEDIA_CARD_WIDTH,
    height: MEDIA_CARD_HEIGHT,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.burgundyDark,
  },
  posterOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: MEDIA_CARD_HEIGHT,
    borderRadius: RADIUS.md,
  },
  posterFallback: {
    width: MEDIA_CARD_WIDTH,
    height: MEDIA_CARD_HEIGHT,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  lockChip: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockChipText: { fontSize: 11 },
  priceChip: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  priceChipText: { ...TYPE.caption, color: COLORS.ctaText, fontWeight: "800" },
  playChip: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  playChipIcon: { color: COLORS.gold, fontSize: 10 },
  progressRow: {
    position: "absolute",
    left: SPACING.sm,
    right: SPACING.sm,
    top: MEDIA_CARD_HEIGHT - SPACING.sm - 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressFill: { height: 3 },
  progressLabel: { ...TYPE.caption, color: COLORS.cream, fontSize: 10 },
  title: {
    ...TYPE.label,
    color: COLORS.cream,
    marginTop: SPACING.sm,
    lineHeight: 17,
  },
  meta: { ...TYPE.caption, marginTop: 2 },
});

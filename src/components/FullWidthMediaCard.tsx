import React from "react";
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { resolveMediaUrl } from "@/api/apiClient";
import { Video } from "@/types";
import { COLORS, ELEVATION, RADIUS, SPACING, TYPE } from "@/theme";

// One card per row, filling the full available width — used for vertical
// browse lists (a language's titles, a studio's titles) where MediaCard's
// fixed 190px width doesn't divide evenly into 2 columns on most phones
// and leaves an awkward blank gap on the right. Visually the same "poster
// + gradient + info" language as MediaCard/ArchiveMediaCard, just full-width
// instead of a fixed small card.
const CARD_HEIGHT = Dimensions.get("window").height * 0.42;

export default function FullWidthMediaCard({ video, onPress }: { video: Video; onPress: () => void }) {
  const posterUrl = resolveMediaUrl(video.poster_image_url) || resolveMediaUrl(video.thumbnail_url);
  const priceLabel =
    video.monetization_type === "pay_per_video" && video.pricing
      ? `₹${parseFloat(video.pricing.price_inr)}`
      : video.monetization_type === "subscription_only"
        ? "Subscription"
        : null;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={onPress}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.fallback} />
      )}

      <LinearGradient
        colors={["transparent", "rgba(20,0,4,0.55)", "rgba(20,0,4,0.92)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {!video.has_access && (
        <View style={styles.lockChip}>
          <Text style={styles.lockChipText}>🔒</Text>
        </View>
      )}

      <TouchableOpacity style={styles.playButton} onPress={onPress}>
        <Text style={styles.playIcon}>▶</Text>
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[video.release_year, video.languages[0]].filter(Boolean).join(" · ")}
        </Text>
        {priceLabel && (
          <View style={styles.priceChip}>
            <Text style={styles.priceChipText}>{priceLabel}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    height: CARD_HEIGHT,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    backgroundColor: COLORS.burgundyDark,
    justifyContent: "flex-end",
    ...ELEVATION.hero,
  },
  fallback: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.burgundyDark },
  lockChip: {
    position: "absolute",
    top: SPACING.md,
    right: SPACING.md,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockChipText: { fontSize: 14 },
  playButton: {
    position: "absolute",
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { color: COLORS.gold, fontSize: 16 },
  info: { padding: SPACING.lg, paddingRight: SPACING.xxl + SPACING.lg },
  title: { ...TYPE.title, fontSize: 20, color: COLORS.cream },
  meta: { ...TYPE.caption, color: COLORS.gold, marginTop: 4 },
  priceChip: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: SPACING.sm,
  },
  priceChipText: { ...TYPE.caption, color: COLORS.ctaText, fontWeight: "800" },
});

import React from "react";
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { resolveMediaUrl } from "@/api/apiClient";
import { Video } from "@/types";
import { COLORS, ELEVATION, RADIUS, SPACING, TYPE } from "@/theme";

// Big enough that one card fills most of the screen (leaving a peek of the
// next one, like a reels-style feed) rather than a compact aspect-ratio box.
const CARD_HEIGHT = Dimensions.get("window").height * 0.72;

// Full-width, stacked-one-after-another card for Archive (in place of the
// old horizontal-scroll row). Built the same way the Archive hero banner
// already does it in this same file (Image absoluteFill + overflow:hidden +
// elevation on one View) — that pattern is already proven to work here.
// Deliberately a SEPARATE component from MediaCard (used on Home), so
// nothing about Home's cards changes and the image-rendering fix already
// in place there can't regress.
export default function ArchiveMediaCard({ video, onPress }: { video: Video; onPress: () => void }) {
  const posterUrl = resolveMediaUrl(video.poster_image_url) || resolveMediaUrl(video.thumbnail_url);
  const tags = video.categories.slice(0, 2).join("  |  ");
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
        colors={["transparent", "rgba(20,12,4,0.55)", "rgba(20,12,4,0.92)"]}
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
        {tags ? (
          <Text style={styles.tags} numberOfLines={1}>
            {tags}
          </Text>
        ) : null}
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
    backgroundColor: COLORS.archiveDark,
    justifyContent: "flex-end",
    ...ELEVATION.hero,
  },
  fallback: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.archiveDark },
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
    borderColor: COLORS.archiveGold,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: { color: COLORS.archiveGold, fontSize: 16 },
  info: { padding: SPACING.lg, paddingRight: SPACING.xxl + SPACING.lg },
  title: { ...TYPE.title, fontSize: 22, color: COLORS.cream },
  meta: { ...TYPE.caption, color: COLORS.archiveGold, marginTop: 4 },
  tags: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  priceChip: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.archiveGold,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: SPACING.sm,
  },
  priceChipText: { ...TYPE.caption, color: COLORS.archiveDark, fontWeight: "800" },
});

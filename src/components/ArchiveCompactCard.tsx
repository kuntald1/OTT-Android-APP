import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { resolveMediaUrl } from "@/api/apiClient";
import { Video } from "@/types";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

// Same footprint as Home's MediaCard (so category rows feel similarly
// sized), but a distinct "framed placard" look — gold-bordered poster,
// title/meta printed BELOW the frame instead of overlaid on the image —
// so Archive rows read as visually different from Home's Play rows, not
// just a smaller copy of the same card. Corner radius is deliberately
// larger than the app-wide RADIUS scale (Archive-only, per request), to
// match a more pronounced "curved poster" look.
export const CARD_WIDTH = 155;
const CARD_HEIGHT = CARD_WIDTH * 1.35;
const CARD_RADIUS = 20;

export default function ArchiveCompactCard({ video, onPress }: { video: Video; onPress: () => void }) {
  const posterUrl = resolveMediaUrl(video.poster_image_url) || resolveMediaUrl(video.thumbnail_url);
  const priceLabel =
    video.monetization_type === "pay_per_video" && video.pricing
      ? `₹${parseFloat(video.pricing.price_inr)}`
      : video.monetization_type === "subscription_only"
        ? "Sub"
        : null;

  return (
    <TouchableOpacity style={styles.wrap} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.frame}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.fallback]} />
        )}
        {!video.has_access && (
          <View style={styles.lockChip}>
            <Text style={styles.lockChipText}>🔒</Text>
          </View>
        )}
        {priceLabel && (
          <View style={styles.priceChip}>
            <Text style={styles.priceChipText}>{priceLabel}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {[video.release_year, video.languages[0]].filter(Boolean).join(" · ")}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { width: CARD_WIDTH },
  frame: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: CARD_RADIUS,
    borderWidth: 1.5,
    borderColor: COLORS.archiveGold,
    overflow: "hidden",
    backgroundColor: COLORS.archiveDark,
  },
  poster: { width: "100%", height: "100%" },
  fallback: { backgroundColor: COLORS.archiveDark },
  lockChip: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockChipText: { fontSize: 11 },
  priceChip: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: COLORS.archiveGold,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priceChipText: { ...TYPE.overline, color: COLORS.archiveDark, fontWeight: "800", fontSize: 9 },
  title: { ...TYPE.label, color: COLORS.cream, marginTop: SPACING.xs, fontSize: 13 },
  meta: { ...TYPE.overline, color: COLORS.archiveGold, marginTop: 2 },
});

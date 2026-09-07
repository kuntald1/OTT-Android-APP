import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

export default function BrowseTile({
  label,
  posterUrl,
  onPress,
}: {
  label: string;
  posterUrl?: string | null;
  onPress: () => void;
}) {
  const resolved = resolveMediaUrl(posterUrl);

  return (
    <TouchableOpacity style={styles.tile} activeOpacity={0.85} onPress={onPress}>
      {resolved ? (
        <Image source={{ uri: resolved }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.fallback} />
      )}
      <LinearGradient
        colors={["transparent", "rgba(15,5,5,0.85)"]}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 150,
    height: 110,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    backgroundColor: COLORS.burgundyDark,
    justifyContent: "flex-end",
    padding: SPACING.sm,
  },
  fallback: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.surfaceStrong },
  label: { ...TYPE.label, color: COLORS.cream, fontWeight: "700" },
});

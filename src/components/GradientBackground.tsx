import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "@/theme/colors";

// Subtle vertical gradient used as the base background for every main
// screen, instead of a flat solid color — gives the app more depth/premium
// feel per the "very ordinary" feedback. Accepts a custom `colors` override
// so Archive can use its own sepia-bronze gradient instead of the default
// burgundy one.
const DEFAULT_COLORS = [
  COLORS.heroGlow,
  COLORS.heroGlowSoft,
  COLORS.burgundyMuted,
  COLORS.background,
  COLORS.burgundyDark,
] as const;
const DEFAULT_LOCATIONS = [0, 0.16, 0.34, 0.62, 1] as const;
const DEFAULT_GLOW_COLORS = ["rgba(193,83,46,0.16)", "rgba(232,158,88,0.20)"] as const;

type GradientColors = readonly [string, string, ...string[]];
type GradientLocations = readonly [number, number, ...number[]];

export default function GradientBackground({
  style,
  colors,
  locations,
  glowColors,
  children,
}: {
  style?: ViewStyle;
  colors?: GradientColors;
  locations?: GradientLocations;
  glowColors?: readonly [string, string];
  children: React.ReactNode;
}) {
  const useDefault = !colors;
  const resolvedGlow = glowColors || (useDefault ? DEFAULT_GLOW_COLORS : null);
  return (
    <LinearGradient
      colors={useDefault ? DEFAULT_COLORS : colors!}
      locations={locations || (useDefault ? DEFAULT_LOCATIONS : undefined)}
      style={[styles.fill, style]}
    >
      {/* Soft warm "bloom" behind the status bar / header, layered as
          overlapping translucent circles since expo-linear-gradient only
          draws linear gradients — this fakes a radial glow without a blur
          dependency (which would need a native rebuild). Archive passes
          its own gold-tinted glowColors instead of the default burgundy
          ones, so it gets the same depth without reusing Play's palette. */}
      {resolvedGlow && (
        <View pointerEvents="none" style={styles.glowWrap}>
          <View style={[styles.glowOuter, { backgroundColor: resolvedGlow[0] }]} />
          <View style={[styles.glowInner, { backgroundColor: resolvedGlow[1] }]} />
        </View>
      )}
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  glowWrap: {
    position: "absolute",
    top: -180,
    left: "50%",
    marginLeft: -220,
    width: 440,
    height: 440,
    alignItems: "center",
    justifyContent: "center",
  },
  glowOuter: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 220,
  },
  glowInner: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
  },
});

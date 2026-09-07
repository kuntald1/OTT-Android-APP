import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/theme/colors";

// Shown at the bottom of every main screen — matches the tagline shown on
// the web app's footer.
export default function Footer() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>theomy</Text>
      <Text style={styles.tagline}>Celebrating Kolkata's stages, one production at a time.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
    marginTop: 24,
  },
  title: { color: COLORS.gold, fontSize: 16, fontWeight: "800" },
  tagline: { color: COLORS.cream, opacity: 0.6, fontSize: 12, marginTop: 6 },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import { COLORS } from "@/theme/colors";

// Stub for nav/profile-menu destinations not yet built (Archive, My List,
// Community, Ticketing, Manage Profile, Watch History, Request as Organiser,
// Subscription Plans, Help Center) — keeps navigation from dead-ending while
// each screen gets built out in a later phase.
export default function PlaceholderScreen() {
  const route = useRoute<any>();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{route.name} — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  text: { color: COLORS.cream, fontSize: 16, opacity: 0.7 },
});

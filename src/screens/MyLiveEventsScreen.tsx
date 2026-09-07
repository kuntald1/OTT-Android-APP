import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchLiveEvents, LiveEvent } from "@/api/videos";
import { resolveMediaUrl } from "@/api/apiClient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";

// Organiser-only ("plays_organiser" role) — reached from the profile menu.
// Plain ScrollView + .map(), no FlatList, matching the pattern already
// confirmed to render posters correctly elsewhere in this app.
export default function MyLiveEventsScreen() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setEvents(await fetchLiveEvents());
      } catch {
        setError("Couldn't load live events");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <GradientBackground style={styles.screen}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>No live events yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {events.map((event) => {
            const posterUrl = resolveMediaUrl(event.poster_image_url);
            return (
              <View key={event.id} style={styles.card}>
                {posterUrl ? (
                  <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
                ) : (
                  <View style={[styles.poster, styles.posterFallback]} />
                )}
                <View style={styles.info}>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, event.status === "active" && styles.statusDotLive]} />
                    <Text style={styles.status}>{event.status === "active" ? "LIVE" : event.status}</Text>
                  </View>
                  <Text style={styles.title} numberOfLines={2}>
                    {event.title}
                  </Text>
                  <Text style={styles.description} numberOfLines={2}>
                    {event.description}
                  </Text>
                  <Text style={styles.started}>
                    Started {new Date(event.started_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.textMuted },
  content: { padding: SPACING.lg, gap: SPACING.lg },
  card: {
    flexDirection: "row",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  poster: { width: 90, height: 90, borderRadius: RADIUS.sm, backgroundColor: COLORS.burgundyDark },
  posterFallback: { backgroundColor: COLORS.surfaceStrong },
  info: { flex: 1, justifyContent: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textFaint },
  statusDotLive: { backgroundColor: "#E0324C" },
  status: { ...TYPE.overline, color: COLORS.textMuted },
  title: { ...TYPE.title, fontSize: 16, color: COLORS.cream },
  description: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  started: { ...TYPE.caption, color: COLORS.gold, marginTop: 4 },
});

import React, { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fetchPublicLiveEvents, LiveEventPublic } from "@/api/liveEvents";
import { isLiveNow, formatShowTime } from "@/utils/liveAccess";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

// ---------------------------------------------------------------------------
// A single slim row on the Plays/Archive home screens, shown only when
// something is on air or announced. Tapping it opens Live & Upcoming.
//
// Deliberately NOT a modal, a takeover or an alert: a viewer browsing the
// catalogue shouldn't be interrupted by a show they may not even be able
// to watch. It states what's happening and gets out of the way.
//
// Visible to signed-out visitors too — an announced show is a promotion,
// and the people most worth reaching with it haven't subscribed yet. The
// server still withholds every playback_url from them.
// ---------------------------------------------------------------------------

const REFRESH_MS = 30000;

export default function LiveNowBanner({ section }: { section?: "play" | "archive" }) {
  const navigation = useNavigation<any>();
  const [events, setEvents] = useState<LiveEventPublic[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const rows = await fetchPublicLiveEvents(section, true);
          if (!cancelled) setEvents(rows);
        } catch {
          if (!cancelled) setEvents([]);
        }
      };
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }, [section])
  );

  if (events.length === 0) return null;

  const live = events.filter(isLiveNow);
  const onAir = live.length > 0;
  const headline = onAir ? live[0] : events[0];
  const when = formatShowTime(headline.scheduled_start_at);

  const extra = events.length - 1;
  const subtitle = onAir
    ? extra > 0
      ? `${headline.title} · +${extra} more`
      : headline.title
    : extra > 0
      ? `${headline.title} · +${extra} more`
      : when
        ? `${headline.title} · ${when}`
        : headline.title;

  return (
    <TouchableOpacity
      style={[styles.banner, onAir ? styles.bannerLive : styles.bannerSoon]}
      activeOpacity={0.85}
      onPress={() => navigation.navigate("LiveEvents")}
    >
      {onAir ? (
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>
      ) : (
        <View style={styles.soonTag}>
          <Ionicons name="calendar-outline" size={11} color={COLORS.gold} />
          <Text style={styles.soonTagText}>SOON</Text>
        </View>
      )}
      <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      <Ionicons name="chevron-forward" size={16} color="rgba(245,235,221,0.5)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  bannerLive: { backgroundColor: "rgba(224,50,76,0.12)", borderColor: "rgba(224,50,76,0.45)" },
  bannerSoon: { backgroundColor: "rgba(212,175,55,0.08)", borderColor: "rgba(212,175,55,0.35)" },

  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E0324C",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveTagText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  soonTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10,1,4,0.5)",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  soonTagText: { color: COLORS.gold, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  subtitle: { ...TYPE.label, color: COLORS.cream, flex: 1 },
});

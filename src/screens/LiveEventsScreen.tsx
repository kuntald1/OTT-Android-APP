import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { fetchPublicLiveEvents, LiveEventPublic } from "@/api/liveEvents";
import { resolveMediaUrl } from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";
import { isLiveNow, liveEventAction, formatShowTime } from "@/utils/liveAccess";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";

// ---------------------------------------------------------------------------
// Live & Upcoming — every announced show in one place, on air or not.
//
// This screen is why the live indicator doesn't interrupt anyone: tapping
// it lands here, where a viewer without a plan can still read what's
// coming and decide to join. What they can't do is play it, and each
// card's button says exactly why.
// ---------------------------------------------------------------------------

const REFRESH_MS = 30000;

function Poster({ event }: { event: LiveEventPublic }) {
  const uri = resolveMediaUrl(event.poster_image_url);
  if (uri) return <Image source={{ uri }} style={styles.poster} resizeMode="cover" />;
  return (
    <View style={[styles.poster, styles.posterEmpty]}>
      <Ionicons name="radio-outline" size={30} color="rgba(245,235,221,0.3)" />
    </View>
  );
}

function EventCard({
  event,
  onAct,
}: {
  event: LiveEventPublic;
  onAct: (ev: LiveEventPublic) => void;
}) {
  const action = liveEventAction(event);
  const live = isLiveNow(event);
  const when = formatShowTime(event.scheduled_start_at);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onAct(event)}>
      <View>
        <Poster event={event} />
        {live ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        ) : when ? (
          <View style={styles.soonBadge}>
            <Ionicons name="calendar-outline" size={11} color={COLORS.gold} />
            <Text style={styles.soonBadgeText}>{when}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        {!!event.description && (
          <Text style={styles.description} numberOfLines={2}>{event.description}</Text>
        )}
        <View style={styles.cardFooter}>
          <Text style={styles.hint} numberOfLines={1}>{action.hint}</Text>
          <View
            style={[
              styles.actionPill,
              action.kind === "watch" || action.kind === "pay" ? styles.actionPillStrong : null,
            ]}
          >
            <Text
              style={[
                styles.actionPillText,
                action.kind === "watch" || action.kind === "pay"
                  ? styles.actionPillTextStrong
                  : null,
              ]}
            >
              {action.label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function LiveEventsScreen() {
  const navigation = useNavigation<any>();
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<LiveEventPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await fetchPublicLiveEvents(undefined, true));
    } catch {
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Every card opens the event's own screen, which holds the player, the
  // checkout and the full description — except "subscribe", which has a
  // destination of its own, and "sign in", which has no screen at all.
  const handleAct = (event: LiveEventPublic) => {
    const action = liveEventAction(event);
    if (action.kind === "login") return navigation.navigate("Login");
    if (action.kind === "subscribe") return navigation.navigate("SubscriptionPlans");
    navigation.navigate("LiveWatch", { id: event.id });
  };

  const liveCount = events.filter(isLiveNow).length;

  if (loading) {
    return (
      <GradientBackground style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
        }
      >
        <Text style={styles.lead}>
          {liveCount > 0
            ? `${liveCount} show${liveCount > 1 ? "s" : ""} on air right now.`
            : "Announced shows — come back at show time to watch."}
        </Text>

        {events.length === 0 ? (
          <Text style={styles.empty}>Nothing live or announced right now.</Text>
        ) : (
          events.map((ev) => <EventCard key={ev.id} event={ev} onAct={handleAct} />)
        )}

        {!isAuthenticated && events.length > 0 && (
          <Text style={styles.signedOutNote}>
            Sign in to watch — you can buy a show or subscribe from here.
          </Text>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  lead: { ...TYPE.body, color: COLORS.textMuted },
  empty: { ...TYPE.body, color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.xl },
  signedOutNote: { ...TYPE.caption, color: COLORS.textFaint, textAlign: "center" },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    overflow: "hidden",
  },
  poster: { width: "100%", aspectRatio: 16 / 9, backgroundColor: COLORS.surfaceStrong },
  posterEmpty: { alignItems: "center", justifyContent: "center" },

  liveBadge: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E0324C",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  soonBadge: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(10,1,4,0.78)",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  soonBadgeText: { color: COLORS.gold, fontSize: 10, fontWeight: "700" },

  cardBody: { padding: SPACING.md, gap: 6 },
  title: { ...TYPE.section, color: COLORS.cream },
  description: { ...TYPE.caption, color: COLORS.textMuted },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
    marginTop: 4,
  },
  hint: { ...TYPE.caption, color: COLORS.textFaint, flexShrink: 1 },
  actionPill: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
  },
  actionPillStrong: { backgroundColor: COLORS.gold },
  actionPillText: { ...TYPE.label, color: COLORS.cream },
  actionPillTextStrong: { color: COLORS.ctaText, fontWeight: "800" },
});

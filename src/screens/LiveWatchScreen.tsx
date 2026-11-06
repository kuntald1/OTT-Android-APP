import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import RNVideo from "react-native-video";
import { fetchPublicLiveEvent, LiveEventPublic } from "@/api/liveEvents";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, liveEventAction } from "@/utils/liveAccess";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import { WEB_TICKET_NOTICE } from "@/utils/purchaseNotice";

// ---------------------------------------------------------------------------
// One live event: the player when this viewer may watch and it's on air,
// and otherwise an honest reason why not — announced for later, needs a
// plan, needs a ticket, or over.
//
// The reason comes from the server (has_access / access_reason); this
// screen never guesses it from the subscription. Tickets are not sold
// here — see utils/purchaseNotice for why — so a viewer without one is
// told the price and where to buy it.
// ---------------------------------------------------------------------------

export default function LiveWatchScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const id: string = route.params?.id;
  const { user, isAuthenticated } = useAuth();

  const [event, setEvent] = useState<LiveEventPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);


  const load = useCallback(async () => {
    setFailed(false);
    setPlayerError(false);
    try {
      setEvent(await fetchPublicLiveEvent(id));
    } catch {
      setFailed(true);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    if (event?.title) navigation.setOptions({ title: event.title });
  }, [event?.title, navigation]);

  if (loading) {
    return (
      <GradientBackground style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      </GradientBackground>
    );
  }

  if (failed || !event) {
    return (
      <GradientBackground style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.msg}>Couldn't load this event.</Text>
          <TouchableOpacity style={styles.btn} onPress={load}>
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }

  const action = liveEventAction(event);
  const price = formatPrice(event);
  const canPlay = !!event.playback_url && action.kind === "watch";

  // Two independent facts: whether it's on air, and whether this viewer
  // may watch. Say both — "Starts 3 Nov, 5:00 PM" AND "Buy for ₹125" —
  // so nobody comes back at show time only to find they need a ticket.
  let icon: keyof typeof Ionicons.glyphMap = action.isLive ? "lock-closed-outline" : "calendar-outline";
  let headline = action.isLive ? "This show is on air now" : "Not live yet";
  let detail = action.hint;
  let cta: { label: string; onPress: (() => void) | null } | null = null;
  let notice = "";

  if (action.kind === "ended") {
    icon = "radio-outline";
    headline = "This broadcast has ended.";
    detail = "";
  } else if (action.kind === "login") {
    cta = { label: "Sign in", onPress: () => navigation.navigate("Login") };
    detail = action.isLive ? "Sign in to watch it." : `${action.hint} · Sign in to watch it.`;
  } else if (action.kind === "subscribe") {
    cta = { label: action.label, onPress: () => navigation.navigate("SubscriptionPlans") };
    detail = action.isLive
      ? `${action.label} to watch it.`
      : `${action.hint} · ${action.label} to watch it.`;
  } else if (action.kind === "pay") {
    const priceLine = price ? `This show needs a ticket — ${price}.` : "This show needs a ticket.";
    detail = action.isLive ? priceLine : `${action.hint} · ${priceLine}`;
    notice = WEB_TICKET_NOTICE;
  }

  return (
    <GradientBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {canPlay ? (
          <View style={styles.playerWrap}>
            <RNVideo
              key={playerKey}
              source={{ uri: event.playback_url as string }}
              style={styles.video}
              controls
              resizeMode="contain"
              paused={false}
              onError={() => setPlayerError(true)}
            />
            {playerError && (
              <View style={styles.overlay}>
                <Text style={styles.msg}>Couldn't start the live stream.</Text>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => {
                    setPlayerError(false);
                    setPlayerKey((k) => k + 1);
                  }}
                >
                  <Text style={styles.btnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.lockedPanel}>
            <Ionicons name={icon} size={26} color="rgba(245,235,221,0.35)" />
            <Text style={styles.lockedHeadline}>{headline}</Text>
            {!!detail && <Text style={styles.lockedDetail}>{detail}</Text>}
            {cta && (
              <TouchableOpacity
                style={[styles.btn, !cta.onPress && styles.btnDisabled]}
                onPress={cta.onPress || undefined}
                disabled={!cta.onPress}
              >
                <Text style={styles.btnText}>{cta.label}</Text>
              </TouchableOpacity>
            )}
            {!!notice && <Text style={styles.webNotice}>{notice}</Text>}
          </View>
        )}

        <View style={styles.meta}>
          {action.isLive && (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>LIVE</Text>
            </View>
          )}
          <Text style={styles.title}>{event.title}</Text>
          {!!event.description && <Text style={styles.description}>{event.description}</Text>}
        </View>
      </ScrollView>

    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  content: { paddingBottom: SPACING.xxl },

  playerWrap: { width: "100%", backgroundColor: "#000" },
  video: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  lockedPanel: {
    width: "100%",
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.surfaceStrong,
  },
  lockedHeadline: { ...TYPE.section, color: COLORS.cream, textAlign: "center" },
  lockedDetail: { ...TYPE.body, color: COLORS.textMuted, textAlign: "center" },

  msg: { ...TYPE.body, color: COLORS.cream, textAlign: "center", marginBottom: SPACING.md },
  webNotice: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 10, textAlign: "center" },
  errorText: { ...TYPE.caption, color: "#f87171", textAlign: "center" },
  btn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 9,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },

  meta: { padding: SPACING.lg, gap: SPACING.sm },
  livePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#E0324C",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  livePillText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  title: { ...TYPE.title, color: COLORS.cream },
  description: { ...TYPE.body, color: COLORS.textMuted },
});

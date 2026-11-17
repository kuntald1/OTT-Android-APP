import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMyReferral, MyReferral, shareReferral } from "@/api/referrals";
import { extractErrorMessage } from "@/api/apiClient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";

// ---------------------------------------------------------------------------
// Refer & Earn — opened from the profile menu. Shows this account's code and
// link, shares it through the phone's own share sheet (WhatsApp, Messages,
// Mail, anything installed), or sends it from the server to one address or
// number.
//
// Point values come from the server, never from a constant here: they are
// set in Admin > Reward Points and changing them must not need a new build.
// ---------------------------------------------------------------------------

const fmtDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

export default function ReferEarnScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MyReferral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [channel, setChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const load = async () => {
    try {
      setData(await fetchMyReferral());
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, "Couldn't load your referral code."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const shareNatively = async () => {
    if (!data) return;
    try {
      await Share.share({
        message:
          `Join me on theomy — Bengali theatre, streaming at home.\n\n` +
          `Use my invite code ${data.code} and you'll get ${data.referred_reward_points} ` +
          `reward points once you take your first subscription.\n\n${data.share_url}`,
      });
    } catch {
      // The person dismissed the sheet, or the platform refused it.
      // Nothing to report — the code is still on screen to copy by hand.
    }
  };

  const send = async () => {
    if (sending || !to.trim()) return;
    setSending(true);
    setSendError(null);
    setSentTo(null);
    try {
      const res = await shareReferral(channel, to.trim());
      setSentTo(res.to || to.trim());
      setTo("");
      load();
    } catch (err) {
      setSendError(extractErrorMessage(err, "Couldn't send it. Try again."));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator color={COLORS.gold} />
      </GradientBackground>
    );
  }

  if (!data) {
    return (
      <GradientBackground style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: SPACING.xxl + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            Share your invite. When a friend joins with it and takes their first subscription, you get{" "}
            <Text style={styles.introStrong}>{data.referrer_reward_points} points</Text> and they get{" "}
            <Text style={styles.introStrong}>{data.referred_reward_points}</Text>. Points come straight
            off what you pay next time.
          </Text>

          {/* ------------------------------------------------- the code */}
          <View style={styles.codeCard}>
            <Text style={styles.overline}>YOUR INVITE CODE</Text>
            <Text style={styles.code}>{data.code}</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={shareNatively} activeOpacity={0.85}>
              <Text style={styles.shareBtnText}>Share invite</Text>
            </TouchableOpacity>
            <Text style={styles.expiry}>
              Good until {fmtDate(data.expires_at)}. After that you'll be given a fresh code here, and
              this one stops working.
            </Text>
          </View>

          {/* ----------------------------------------------- send it to */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Send it to someone</Text>
            <Text style={styles.cardHint}>
              We'll send the invite with your name on it. Tapping the link opens the sign-up form with
              your code already filled in.
            </Text>

            <View style={styles.chipRow}>
              {([
                { id: "whatsapp", label: "WhatsApp" },
                { id: "email", label: "Email" },
              ] as const).map((c) => {
                const active = channel === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => { setChannel(c.id); setSendError(null); setSentTo(null); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              value={to}
              onChangeText={(v) => { setTo(v); setSendError(null); setSentTo(null); }}
              placeholder={channel === "email" ? "friend@example.com" : "Phone number with WhatsApp"}
              placeholderTextColor={COLORS.textFaint}
              keyboardType={channel === "email" ? "email-address" : "phone-pad"}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {channel === "whatsapp" && (
              <Text style={styles.fieldHint}>
                Indian numbers need no country code. For anywhere else, start with +.
              </Text>
            )}

            <TouchableOpacity
              style={[styles.sendBtn, (sending || !to.trim()) && styles.sendBtnDisabled]}
              onPress={send}
              disabled={sending || !to.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.sendBtnText}>{sending ? "Sending…" : "Send invite"}</Text>
            </TouchableOpacity>

            {sendError && <Text style={styles.error}>{sendError}</Text>}
            {sentTo && <Text style={styles.success}>Invite sent to {sentTo}.</Text>}
          </View>

          {/* ----------------------------------------------- your stats */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your referrals</Text>
            <View style={styles.statRow}>
              {[
                { label: "Joined", value: data.signed_up, accent: false },
                { label: "Subscribed", value: data.rewarded, accent: false },
                { label: "Points earned", value: data.points_earned, accent: true },
              ].map((s) => (
                <View key={s.label} style={styles.stat}>
                  <Text style={[styles.statValue, s.accent && styles.statValueAccent]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            {data.signed_up === 0 && (
              <Text style={styles.cardHint}>
                No one has joined with your code yet. Send it to a friend who'd enjoy a play.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  content: { padding: SPACING.lg, gap: SPACING.lg },

  intro: { ...TYPE.body, color: COLORS.textMuted, lineHeight: 21 },
  introStrong: { color: COLORS.gold, fontWeight: "700" },

  codeCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.md,
  },
  overline: { ...TYPE.overline, color: COLORS.textFaint },
  code: { fontSize: 32, fontWeight: "800", color: COLORS.gold, letterSpacing: 7 },
  shareBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  shareBtnText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "700" },
  expiry: { ...TYPE.caption, color: COLORS.textFaint, textAlign: "center", lineHeight: 16 },

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cardTitle: { ...TYPE.section, color: COLORS.cream },
  cardHint: { ...TYPE.caption, color: COLORS.textFaint, lineHeight: 16 },

  chipRow: { flexDirection: "row", gap: SPACING.sm },
  chip: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  chipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  chipText: { ...TYPE.label, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.ctaText },

  input: {
    backgroundColor: COLORS.burgundyDark,
    color: COLORS.cream,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    fontSize: 16,
  },
  fieldHint: { ...TYPE.caption, color: COLORS.textFaint },

  sendBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { ...TYPE.label, color: COLORS.ctaText, fontSize: 15, fontWeight: "700" },

  statRow: { flexDirection: "row", gap: SPACING.sm },
  stat: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "700", color: COLORS.cream },
  statValueAccent: { color: COLORS.gold },
  statLabel: { ...TYPE.caption, color: COLORS.textFaint, marginTop: 2 },

  error: { ...TYPE.caption, color: COLORS.burgundyLight },
  success: { ...TYPE.caption, color: "#6FCF97" },
});

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getStoredToken } from "@/api/apiClient";
import { TicketBooking, fetchMyTicketBookings, ticketQrUrl } from "@/api/ticketing";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";

// ---------------------------------------------------------------------------
// Tickets bought for shows this person will physically attend.
//
// Only paid bookings come back from the server, so a row here IS a
// ticket — there is no status to explain. What has to work at a dim
// venue door is the booking number and the QR, so the number is set
// large and the QR sits on white.
//
// The QR is a PNG drawn by the server. React Native's Image can send
// the auth header itself, so the token never goes into a URL and the
// app needs no QR library of its own.
// ---------------------------------------------------------------------------

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<TicketBooking[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [list, stored] = await Promise.all([fetchMyTicketBookings(), getStoredToken()]);
      setBookings(list);
      setToken(stored);
    } catch {
      setError("Couldn't load your bookings. Pull down to try again.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const formatWhen = (iso: string | null, time: string | null) => {
    if (!iso) return "";
    const d = new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return time ? `${d}, ${time}` : d;
  };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
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
        <Text style={styles.intro}>
          Show the QR code at the venue. If your phone is flat, the booking number is enough.
        </Text>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {!error && bookings.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven't booked any shows yet.</Text>
          </View>
        )}

        {bookings.map((b) => {
          const used = !!b.checked_in_at;
          return (
            <View key={b.id} style={[styles.card, used && styles.cardUsed]}>
              <Text style={styles.eventTitle}>{b.event_title || "Show"}</Text>

              {!!b.event_date && (
                <Text style={styles.meta}>📅 {formatWhen(b.event_date, b.event_time)}</Text>
              )}
              {!!b.event_venue && <Text style={styles.meta}>📍 {b.event_venue}</Text>}

              <Text style={styles.seats}>
                {b.quantity} × {b.tier_name} · ₹{parseFloat(b.amount).toFixed(0)}
              </Text>

              <Text style={styles.refLabel}>BOOKING NUMBER</Text>
              <Text style={styles.reference}>{b.booking_reference}</Text>

              <View style={styles.qrWrap}>
                {token ? (
                  <Image
                    source={{
                      uri: ticketQrUrl(b.id),
                      headers: { Authorization: `Bearer ${token}` },
                    }}
                    style={styles.qr}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.qrFallback}>QR unavailable</Text>
                )}
              </View>

              {used && (
                <Text style={styles.used}>
                  Checked in on {new Date(b.checked_in_at as string).toLocaleString()}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  intro: { ...TYPE.body, color: COLORS.textMuted, marginBottom: SPACING.lg },
  error: { ...TYPE.body, color: COLORS.burgundyLight, marginBottom: SPACING.md },
  empty: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyText: { ...TYPE.body, color: COLORS.textMuted },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardUsed: { opacity: 0.6, borderColor: COLORS.hairline },
  eventTitle: { ...TYPE.section, color: COLORS.cream },
  meta: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4 },
  seats: { ...TYPE.body, color: COLORS.cream, marginTop: SPACING.md },
  refLabel: { ...TYPE.caption, color: COLORS.textFaint, marginTop: SPACING.md, letterSpacing: 1 },
  reference: { color: COLORS.gold, fontSize: 22, fontWeight: "700", letterSpacing: 3, marginTop: 2 },
  qrWrap: {
    alignSelf: "center",
    marginTop: SPACING.lg,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: RADIUS.sm,
  },
  qr: { width: 170, height: 170 },
  qrFallback: { ...TYPE.caption, color: "#555", width: 170, height: 170, textAlign: "center" },
  used: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.md, textAlign: "center" },
});

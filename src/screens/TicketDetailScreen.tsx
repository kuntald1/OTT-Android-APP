import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { resolveMediaUrl, extractErrorMessage } from "@/api/apiClient";
import { toggleMyList } from "@/api/videos";
import { fetchMyList } from "@/api/mylist";
import {
  ApprovedEvent,
  TicketTierAvailability,
  TicketBookingOrder,
  fetchTicketAvailability,
  createTicketBookingOrder,
  verifyTicketBookingPayment,
} from "@/api/ticketing";
import { useAuth } from "@/context/AuthContext";
import RazorpayCheckoutWebView, { RazorpaySuccessResult } from "@/components/RazorpayCheckoutWebView";
import { COLORS } from "@/theme/colors";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function TicketDetailScreen() {
  const route = useRoute<any>();
  const event: ApprovedEvent = route.params.event;
  const navigation = useNavigation<any>();
  const { user, isAuthenticated } = useAuth();
  const [inMyList, setInMyList] = useState(false);

  const [availability, setAvailability] = useState<TicketTierAvailability[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [order, setOrder] = useState<TicketBookingOrder | null>(null);
  const lowestPrice = event.ticket_tiers.length
    ? Math.min(...event.ticket_tiers.map((t) => parseFloat(t.price)))
    : null;

  // ApprovedEvent doesn't carry its own "already saved" flag (unlike Video,
  // which has in_my_list) — check against the real list on open so a
  // previously-saved event shows the checkmark immediately, not just
  // right after tapping it in this same session.
  useEffect(() => {
    (async () => {
      try {
        const list = await fetchMyList();
        setInMyList(list.some((item) => item.item_id === event.id));
      } catch {
        // Leave it as not-saved — worst case the button just starts at "+".
      }
    })();
  }, [event.id]);

  const handleAddToList = async () => {
    setInMyList(!inMyList);
    try {
      // Confirmed payload shape from a real network capture.
      const res = await toggleMyList({
        item_id: event.id,
        title: event.event_title,
        image_url: event.poster_image_url,
        meta: `${event.venue} · ${formatDate(event.proposed_date)}, ${event.proposed_time}`,
        section: "Theater",
      });
      setInMyList(res.saved);
    } catch {
      setInMyList(inMyList);
    }
  };

  // Seats left per tier, read from the server rather than from
  // event.ticket_tiers: only the server knows how many are gone.
  const loadAvailability = useCallback(() => {
    fetchTicketAvailability(event.id)
      .then(setAvailability)
      .catch(() => setAvailability([]));
  }, [event.id]);

  useEffect(loadAvailability, [loadAvailability]);

  const selectedTier = availability.find((t) => t.id === selectedTierId) || null;
  const maxForTier = selectedTier ? Math.min(10, selectedTier.available) : 1;
  const total = selectedTier ? parseFloat(selectedTier.price) * quantity : 0;

  const chooseTier = (tier: TicketTierAvailability) => {
    if (tier.sold_out) return;
    setBookError("");
    setSelectedTierId(tier.id);
    setQuantity(1);
  };

  const startBooking = async () => {
    if (!selectedTier) return;
    if (!isAuthenticated) {
      navigation.navigate("Login");
      return;
    }
    setBookError("");
    setBooking(true);
    try {
      setOrder(await createTicketBookingOrder(event.id, selectedTier.id, quantity));
    } catch (e) {
      setBookError(extractErrorMessage(e, "Couldn't start the booking. Please try again."));
    } finally {
      setBooking(false);
    }
  };

  const onCheckoutSuccess = async (result: RazorpaySuccessResult) => {
    const current = order;
    setOrder(null);
    if (!current) return;
    try {
      const confirmed = await verifyTicketBookingPayment({
        booking_id: current.booking_id,
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });
      setSelectedTierId(null);
      loadAvailability();
      Alert.alert(
        "Booking confirmed",
        `${confirmed.quantity} \u00d7 ${confirmed.tier_name}\n\nBooking number: ${confirmed.booking_reference}\n\nShow the QR code from My Bookings at the venue.`,
        [
          { text: "Later", style: "cancel" },
          { text: "My Bookings", onPress: () => navigation.navigate("MyBookings") },
        ]
      );
    } catch (e) {
      setBookError(
        extractErrorMessage(e, "Payment verification failed. If money was deducted, contact support.")
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: resolveMediaUrl(event.poster_image_url) }}
        style={styles.poster}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text style={styles.title}>{event.event_title}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => {
              const first = availability.find((x) => !x.sold_out);
              if (first) chooseTier(first);
            }}
          >
            <Text style={styles.bookButtonText}>
              🎟 Book Tickets{lowestPrice != null ? ` — From ₹${lowestPrice}` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, inMyList && styles.addButtonActive]}
            onPress={handleAddToList}
          >
            <Text style={[styles.addButtonText, inMyList && styles.addButtonTextActive]}>
              {inMyList ? "✓" : "+"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>📍 {event.venue}</Text>
          <Text style={styles.metaText}>
            📅 {formatDate(event.proposed_date)}, {event.proposed_time}
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{event.event_category}</Text>
          </View>
        </View>

        <Text style={styles.description}>{event.event_description}</Text>
        <Text style={styles.presentedBy}>Presented by {event.org_name}</Text>

        {availability.length > 0 && (
          <View style={styles.tiersSection}>
            {availability.map((tier) => {
              const chosen = tier.id === selectedTierId;
              return (
                <TouchableOpacity
                  key={tier.id}
                  style={[
                    styles.tierRow,
                    chosen && styles.tierRowChosen,
                    tier.sold_out && styles.tierRowSoldOut,
                  ]}
                  onPress={() => chooseTier(tier)}
                  disabled={tier.sold_out}
                >
                  <View>
                    <Text style={styles.tierName}>{tier.tier_name}</Text>
                    <Text style={styles.tierSeats}>
                      {tier.sold_out
                        ? "Sold out"
                        : tier.available <= 10
                        ? `Only ${tier.available} left`
                        : `${tier.available} available`}
                    </Text>
                  </View>
                  <Text style={styles.tierPrice}>₹{parseFloat(tier.price)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedTier && (
          <View style={styles.bookingPanel}>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>How many?</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperCount}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setQuantity((q) => Math.min(maxForTier, q + 1))}
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Total</Text>
              <Text style={styles.bookingTotal}>₹{total.toFixed(0)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.payButton, booking && styles.payButtonDisabled]}
              onPress={startBooking}
              disabled={booking}
            >
              <Text style={styles.payButtonText}>
                {booking
                  ? "Opening checkout…"
                  : isAuthenticated
                  ? `Pay ₹${total.toFixed(0)}`
                  : "Sign in to book"}
              </Text>
            </TouchableOpacity>

            {!!bookError && <Text style={styles.bookError}>{bookError}</Text>}
          </View>
        )}
      </View>

      {order && (
        <RazorpayCheckoutWebView
          visible={!!order}
          keyId={order.razorpay_key_id}
          orderId={order.razorpay_order_id}
          amountPaise={Math.round(parseFloat(order.amount) * 100)}
          currency={order.currency}
          name="theomy"
          description={`${order.event_title} — ${order.tier_name} x${order.quantity}`}
          prefillName={user?.name}
          prefillEmail={user?.email}
          prefillContact={user?.phone}
          onSuccess={onCheckoutSuccess}
          onDismiss={() => setOrder(null)}
          onFailure={() => {
            setOrder(null);
            setBookError("Payment failed. Please try again.");
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  poster: { width: "100%", aspectRatio: 16 / 10, backgroundColor: COLORS.burgundyDark },
  content: { padding: 16 },
  title: { color: COLORS.cream, fontSize: 22, fontWeight: "700" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  bookButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  bookButtonText: { color: COLORS.ctaText, fontSize: 14, fontWeight: "700" },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: COLORS.cream, fontSize: 18 },
  addButtonActive: { borderColor: COLORS.gold, backgroundColor: "rgba(212,175,55,0.15)" },
  addButtonTextActive: { color: COLORS.gold },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, marginTop: 16 },
  metaText: { color: COLORS.cream, opacity: 0.8, fontSize: 13 },
  categoryBadge: {
    backgroundColor: "rgba(212,175,55,0.15)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryBadgeText: { color: COLORS.gold, fontSize: 11, fontWeight: "600" },
  description: { color: COLORS.cream, opacity: 0.85, fontSize: 14, lineHeight: 20, marginTop: 16 },
  presentedBy: { color: COLORS.cream, opacity: 0.6, fontSize: 12, marginTop: 10 },
  tiersSection: { marginTop: 24 },
  tierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  tierRowChosen: { borderWidth: 1, borderColor: COLORS.gold, backgroundColor: "rgba(212,175,55,0.12)" },
  tierRowSoldOut: { opacity: 0.45 },
  tierSeats: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  bookingPanel: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(245,235,221,0.05)",
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bookingLabel: { color: COLORS.textMuted, fontSize: 14 },
  bookingTotal: { color: COLORS.gold, fontSize: 18, fontWeight: "700" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245,235,221,0.1)",
  },
  stepperText: { color: COLORS.cream, fontSize: 18, lineHeight: 20 },
  stepperCount: { color: COLORS.cream, fontSize: 15, fontWeight: "700", minWidth: 20, textAlign: "center" },
  payButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { color: COLORS.ctaText, fontSize: 15, fontWeight: "700" },
  bookError: { color: COLORS.burgundyLight, fontSize: 13, marginTop: 10, textAlign: "center" },
  tierName: { color: COLORS.cream, fontSize: 14, fontWeight: "600" },
  tierPrice: { color: COLORS.gold, fontSize: 14, fontWeight: "700" },
});

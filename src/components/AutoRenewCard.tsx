import React, { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AutopayStatus, fetchMyAutopay, cancelMyAutopay } from "@/api/subscriptions";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import ThemedAlert, { ThemedAlertState } from "@/components/ThemedAlert";

// Turning auto-renew off, on the screen the checkout promises it on.
//
// It already lived on Subscription Plans, which is where someone goes to
// BUY — the last place a person trying to stop paying looks. A promise
// people can't find is what turns a renewal into a dispute, so the same
// control belongs here too. Both read the same /payments/autopay/me, so
// neither can show a stale answer after the other has cancelled.
//
// Renders nothing at all when no mandate is running: an empty "off" card
// would just be noise on a screen people open for other reasons.
export default function AutoRenewCard() {
  const [autopay, setAutopay] = useState<AutopayStatus | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [alertState, setAlertState] = useState<ThemedAlertState>(null);

  const load = useCallback(async () => {
    setAutopay(await fetchMyAutopay().catch(() => null));
  }, []);

  // On focus, not on mount: screens stay mounted, so cancelling from the
  // plans screen and coming back here would otherwise still show it on.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!autopay?.active) return null;

  const nextDate = autopay.next_renewal_at
    ? new Date(autopay.next_renewal_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const confirmCancel = () => {
    setAlertState({
      title: "Turn off auto-renew",
      body: nextDate
        ? `No further payments will be taken. You keep ${autopay.plan_name} until ${nextDate}, then access ends.`
        : "No further payments will be taken. You keep access until the period you have already paid for ends.",
      buttons: [
        { label: "Keep it on", style: "cancel" },
        {
          label: "Turn off",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelMyAutopay();
              await load();
            } catch {
              setAlertState({
                title: "Couldn't turn it off",
                body: "Something went wrong. Please try again, or write to us if it keeps failing.",
              });
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🔁 Auto-renew</Text>
      <Text style={styles.body}>
        Your {autopay.plan_name} plan renews automatically. ₹{autopay.total_amount} will be charged
        via UPI Autopay{nextDate ? ` around ${nextDate}` : ""}, then every{" "}
        {(autopay.duration_label || "").toLowerCase()}.
      </Text>

      <TouchableOpacity style={styles.button} onPress={confirmCancel} disabled={cancelling}>
        {cancelling ? (
          <ActivityIndicator size="small" color="#f87171" />
        ) : (
          <Text style={styles.buttonText}>Turn off auto-renew</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footnote}>
        You keep access until the period you have already paid for ends.
      </Text>

      <ThemedAlert alert={alertState} onClose={() => setAlertState(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
  },
  title: { ...TYPE.section, color: COLORS.cream, marginBottom: SPACING.sm },
  body: { ...TYPE.body, color: COLORS.cream, opacity: 0.75, marginBottom: SPACING.md },
  button: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.5)",
    borderRadius: 999,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minWidth: 160,
    alignItems: "center",
  },
  buttonText: { ...TYPE.body, color: "#f87171", fontWeight: "700" },
  footnote: { ...TYPE.caption, color: COLORS.cream, opacity: 0.45, marginTop: SPACING.sm },
});

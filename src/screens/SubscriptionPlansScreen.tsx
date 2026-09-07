import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SubscriptionDuration,
  SubscriptionPlan,
  Subscription,
  Payment,
  VideoPurchase,
  fetchSubscriptionDurations,
  fetchSubscriptionPlans,
  fetchMySubscriptions,
  fetchMyPayments,
  fetchMyVideoPurchases,
  fetchTaxConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
  RazorpayOrder,
} from "@/api/subscriptions";
import { resolveMediaUrl } from "@/api/apiClient";
import { useAuth } from "@/context/AuthContext";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import RazorpayCheckoutWebView from "@/components/RazorpayCheckoutWebView";

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "#4CAF7D",
  created: COLORS.textFaint,
  failed: COLORS.burgundyLight,
};

// monthlyBase = base_price for the 1st screen + per_extra_screen for each
// additional one. Confirmed against a real example: Play plan, 3 screens ->
// "₹100 for 1 screen + ₹60 × 2 extra, per month" = ₹220/month.
function monthlyPriceFor(plan: SubscriptionPlan, screens: number): number {
  return parseFloat(plan.base_price) + parseFloat(plan.per_extra_screen) * (screens - 1);
}

export default function SubscriptionPlansScreen() {
  const { user } = useAuth();
  const [durations, setDurations] = useState<SubscriptionDuration[]>([]);
  const [selectedDurationId, setSelectedDurationId] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [videoPurchases, setVideoPurchases] = useState<VideoPurchase[]>([]);
  const [gstPercent, setGstPercent] = useState(0);
  const [loading, setLoading] = useState(true);

  const [screensByPlan, setScreensByPlan] = useState<Record<string, number>>({});
  const [redeemReward, setRedeemReward] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [modalRedeemReward, setModalRedeemReward] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [razorpayOrder, setRazorpayOrder] = useState<RazorpayOrder | null>(null);

  const rewardBalance = user?.reward_points_balance || 0;

  useEffect(() => {
    (async () => {
      try {
        const [durationsData, plansData, subsData, paymentsData, purchasesData, taxData] = await Promise.all([
          fetchSubscriptionDurations(),
          fetchSubscriptionPlans(),
          fetchMySubscriptions(),
          fetchMyPayments(),
          fetchMyVideoPurchases(),
          fetchTaxConfig(),
        ]);
        setDurations(durationsData);
        setSelectedDurationId(durationsData.find((d) => d.months === 1)?.id || durationsData[0]?.id || null);
        setPlans(plansData);
        setScreensByPlan(Object.fromEntries(plansData.map((p) => [p.id, 1])));
        setSubscriptions(subsData);
        setPayments(paymentsData);
        setVideoPurchases(purchasesData);
        setGstPercent(parseFloat(taxData.gst_percent));
      } catch {
        // Individual sections below just render empty if any one call failed.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedDuration = durations.find((d) => d.id === selectedDurationId);
  const discount = selectedDuration ? parseFloat(selectedDuration.discount_percent) : 0;
  const months = selectedDuration?.months || 1;

  const setScreens = (planId: string, delta: number) =>
    setScreensByPlan((prev) => ({ ...prev, [planId]: Math.max(1, Math.min(10, (prev[planId] || 1) + delta)) }));

  const openCheckout = (plan: SubscriptionPlan) => {
    setModalRedeemReward(redeemReward);
    setCheckoutPlan(plan);
  };

  const refreshAfterPayment = async () => {
    try {
      const [subsData, paymentsData] = await Promise.all([fetchMySubscriptions(), fetchMyPayments()]);
      setSubscriptions(subsData);
      setPayments(paymentsData);
    } catch {
      // Non-critical — the payment itself already succeeded either way.
    }
  };

  const onPay = async (plan: SubscriptionPlan, screens: number, rewardApplied: boolean) => {
    if (!selectedDuration) return;
    setCreatingOrder(true);
    try {
      const order = await createRazorpayOrder({
        plan_name: plan.name,
        duration_label: selectedDuration.label,
        screens,
        reward_points_requested: rewardApplied ? rewardBalance : 0,
      });
      setRazorpayOrder(order);
    } catch {
      Alert.alert("Couldn't start checkout", "Something went wrong preparing this payment. Please try again.");
    } finally {
      setCreatingOrder(false);
    }
  };

  const onCheckoutSuccess = async (result: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => {
    if (!razorpayOrder) return;
    try {
      await verifyRazorpayPayment({
        payment_id: razorpayOrder.payment_id,
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });
      setRazorpayOrder(null);
      setCheckoutPlan(null);
      await refreshAfterPayment();
      Alert.alert("Subscribed!", `You're now on the ${razorpayOrder.plan_name} plan.`);
    } catch {
      setRazorpayOrder(null);
      Alert.alert(
        "Payment received, but couldn't confirm it",
        "Your payment may have gone through — please check Payment History in a moment, or contact support if it doesn't appear."
      );
    }
  };

  const onCheckoutDismiss = () => setRazorpayOrder(null);

  const onCheckoutFailure = (error: any) => {
    setRazorpayOrder(null);
    Alert.alert("Payment failed", error?.description || "The payment didn't go through. Please try again.");
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {subscriptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Subscriptions</Text>
            {subscriptions.map((sub) => (
              <View key={sub.id} style={styles.subCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subPlanName}>{sub.plan_name}</Text>
                  <Text style={styles.subMeta}>
                    {sub.duration_label} · {sub.screens} screen{sub.screens === 1 ? "" : "s"} · ₹{sub.price}
                  </Text>
                  <Text style={styles.subExpiry}>
                    {sub.is_active ? "Renews" : "Expired"} {new Date(sub.expires_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusPill, sub.is_active ? styles.statusPillActive : styles.statusPillInactive]}>
                  <Text style={styles.statusPillText}>{sub.is_active ? "Active" : "Inactive"}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plans</Text>

          {durations.length > 0 && (
            <View style={styles.durationRow}>
              {durations.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.durationPill, selectedDurationId === d.id && styles.durationPillActive]}
                  onPress={() => setSelectedDurationId(d.id)}
                >
                  <Text
                    style={[
                      styles.durationPillText,
                      selectedDurationId === d.id && styles.durationPillTextActive,
                    ]}
                  >
                    {d.label}
                  </Text>
                  {parseFloat(d.discount_percent) > 0 && (
                    <Text style={styles.durationDiscount}>-{parseFloat(d.discount_percent)}%</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {rewardBalance > 0 && (
            <View style={styles.rewardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardTitle}>
                  You have {rewardBalance} reward points (₹{rewardBalance})
                </Text>
                <Text style={styles.rewardSubtitle}>
                  {redeemReward ? "Applying to your total below — tap to remove" : "Tap to redeem toward this subscription"}
                </Text>
              </View>
              <Switch
                value={redeemReward}
                onValueChange={setRedeemReward}
                trackColor={{ true: COLORS.gold, false: COLORS.surfaceStrong }}
                thumbColor={COLORS.cream}
              />
            </View>
          )}

          {plans.map((plan) => {
            const screens = screensByPlan[plan.id] || 1;
            const monthly = monthlyPriceFor(plan, screens);
            const durationTotal = monthly * months * (1 - discount / 100);
            const rewardApplied = redeemReward ? Math.min(rewardBalance, durationTotal) : 0;
            const finalTotal = durationTotal - rewardApplied;

            return (
              <View key={plan.id} style={[styles.planCard, plan.highlighted && styles.planCardHighlighted]}>
                {plan.highlighted && <Text style={styles.highlightedTag}>BEST VALUE</Text>}
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planTagline}>{plan.tagline}</Text>

                <View style={styles.priceRow}>
                  {rewardApplied > 0 && <Text style={styles.priceStrike}>₹{durationTotal.toFixed(0)}</Text>}
                  <Text style={styles.priceMain}>₹{finalTotal.toFixed(0)}</Text>
                  <Text style={styles.priceSuffix}>/{selectedDuration?.label || "month"}</Text>
                </View>
                {rewardApplied > 0 && (
                  <Text style={styles.rewardApplied}>− ₹{rewardApplied.toFixed(0)} reward points applied</Text>
                )}
                <Text style={styles.priceUsd}>
                  ≈ ₹{monthly.toFixed(0)}/month before rewards
                  {discount > 0 ? ` · save ${discount}%` : ""}
                </Text>
                <Text style={styles.unlimited}>Unlimited</Text>

                <View style={styles.screensRow}>
                  <Text style={styles.screensLabel}>🖥 Screens</Text>
                  <TouchableOpacity style={styles.stepperButton} onPress={() => setScreens(plan.id, -1)}>
                    <Text style={styles.stepperButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.screensCount}>{screens}</Text>
                  <TouchableOpacity style={styles.stepperButton} onPress={() => setScreens(plan.id, 1)}>
                    <Text style={styles.stepperButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
                {screens > 1 && (
                  <Text style={styles.screensNote}>
                    ₹{plan.base_price} for 1 screen + ₹{plan.per_extra_screen} × {screens - 1} extra, per month
                  </Text>
                )}

                {plan.features.map((feature) => (
                  <Text key={feature} style={styles.feature}>
                    ✓ {feature}
                  </Text>
                ))}

                <TouchableOpacity style={styles.subscribeButton} onPress={() => openCheckout(plan)}>
                  <Text style={styles.subscribeButtonText}>Switch to this plan</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {videoPurchases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Video Purchases</Text>
            {videoPurchases.map((purchase) => {
              const posterUrl = resolveMediaUrl(purchase.video_poster_url);
              return (
                <View key={purchase.id} style={styles.purchaseRow}>
                  {posterUrl ? (
                    <Image source={{ uri: posterUrl }} style={styles.purchasePoster} resizeMode="cover" />
                  ) : (
                    <View style={[styles.purchasePoster, styles.purchasePosterFallback]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.purchaseTitle} numberOfLines={1}>
                      {purchase.video_title}
                    </Text>
                    <Text style={styles.purchaseDate}>
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.purchaseAmount}>₹{purchase.amount}</Text>
                </View>
              );
            })}
          </View>
        )}

        {payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            {payments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentPlan}>
                    {payment.plan_name} · {payment.duration_label}
                  </Text>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.paymentAmount}>₹{payment.total_amount}</Text>
                  <Text
                    style={[
                      styles.paymentStatus,
                      { color: PAYMENT_STATUS_COLORS[payment.status] || COLORS.textFaint },
                    ]}
                  >
                    {payment.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!checkoutPlan} transparent animationType="fade" onRequestClose={() => setCheckoutPlan(null)}>
        {checkoutPlan &&
          (() => {
            const screens = screensByPlan[checkoutPlan.id] || 1;
            const monthly = monthlyPriceFor(checkoutPlan, screens);
            const durationTotal = monthly * months * (1 - discount / 100);
            const rewardApplied = modalRedeemReward ? Math.min(rewardBalance, durationTotal) : 0;
            const planPrice = durationTotal - rewardApplied;
            const gstAmount = planPrice * (gstPercent / 100);
            const total = planPrice + gstAmount;

            return (
              <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Confirm your subscription</Text>
                  <Text style={styles.modalSubtitle}>
                    {checkoutPlan.name} — {selectedDuration?.label}, {screens} screen{screens === 1 ? "" : "s"}
                  </Text>

                  {rewardBalance > 0 && (
                    <View style={styles.modalRewardRow}>
                      <Text style={styles.modalRewardText}>
                        🎁 Redeem {rewardBalance} reward points (₹{rewardBalance} off)
                      </Text>
                      <Switch
                        value={modalRedeemReward}
                        onValueChange={setModalRedeemReward}
                        trackColor={{ true: COLORS.gold, false: COLORS.surfaceStrong }}
                        thumbColor={COLORS.cream}
                      />
                    </View>
                  )}

                  <View style={styles.modalPriceBlock}>
                    <View style={styles.modalPriceRow}>
                      <Text style={styles.modalPriceLabel}>Plan price</Text>
                      <Text style={styles.modalPriceValue}>₹{planPrice.toFixed(0)}</Text>
                    </View>
                    <View style={styles.modalPriceRow}>
                      <Text style={styles.modalPriceLabel}>GST ({gstPercent}%)</Text>
                      <Text style={styles.modalPriceValue}>₹{gstAmount.toFixed(0)}</Text>
                    </View>
                    <View style={[styles.modalPriceRow, styles.modalTotalRow]}>
                      <Text style={styles.modalTotalLabel}>Total</Text>
                      <Text style={styles.modalTotalValue}>₹{total.toFixed(0)}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => onPay(checkoutPlan, screens, modalRedeemReward)}
                    disabled={creatingOrder}
                  >
                    {creatingOrder ? (
                      <ActivityIndicator size="small" color={COLORS.ctaText} />
                    ) : (
                      <Text style={styles.payButtonText}>Pay ₹{total.toFixed(0)} with Razorpay</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => setCheckoutPlan(null)}
                    disabled={creatingOrder}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}
      </Modal>

      {razorpayOrder && (
        <RazorpayCheckoutWebView
          visible={!!razorpayOrder}
          keyId={razorpayOrder.razorpay_key_id}
          orderId={razorpayOrder.razorpay_order_id}
          amountPaise={Math.round(parseFloat(razorpayOrder.total_amount) * 100)}
          currency={razorpayOrder.currency}
          name="theomy"
          description={`${razorpayOrder.plan_name} — ${razorpayOrder.duration_label}`}
          prefillName={user?.name}
          prefillEmail={user?.email}
          prefillContact={user?.phone}
          onSuccess={onCheckoutSuccess}
          onDismiss={onCheckoutDismiss}
          onFailure={onCheckoutFailure}
        />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { ...TYPE.section, color: COLORS.cream, marginBottom: SPACING.md },
  subCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  subPlanName: { ...TYPE.title, fontSize: 16, color: COLORS.cream },
  subMeta: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  subExpiry: { ...TYPE.caption, color: COLORS.gold, marginTop: 2 },
  statusPill: { borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  statusPillActive: { backgroundColor: "rgba(76,175,125,0.2)" },
  statusPillInactive: { backgroundColor: "rgba(255,255,255,0.08)" },
  statusPillText: { ...TYPE.overline, color: COLORS.cream },
  durationRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  durationPill: {
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  durationPillActive: { backgroundColor: COLORS.gold },
  durationPillText: { ...TYPE.label, color: COLORS.cream },
  durationPillTextActive: { color: COLORS.ctaText, fontWeight: "800" },
  durationDiscount: { ...TYPE.caption, color: COLORS.ctaText, marginTop: 2 },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  rewardTitle: { ...TYPE.label, color: COLORS.cream, fontWeight: "700" },
  rewardSubtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  planCardHighlighted: { borderWidth: 1.5, borderColor: COLORS.gold },
  highlightedTag: { ...TYPE.overline, color: COLORS.gold, marginBottom: 4 },
  planName: { ...TYPE.title, color: COLORS.cream },
  planTagline: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: SPACING.md, flexWrap: "wrap" },
  priceStrike: {
    ...TYPE.body,
    color: COLORS.textFaint,
    textDecorationLine: "line-through",
    marginBottom: 4,
  },
  priceMain: { ...TYPE.display, color: COLORS.gold },
  priceSuffix: { ...TYPE.caption, color: COLORS.textMuted, marginBottom: 4 },
  rewardApplied: { ...TYPE.caption, color: COLORS.gold, marginTop: 2 },
  priceUsd: { ...TYPE.caption, color: COLORS.textFaint, marginTop: 4 },
  unlimited: { ...TYPE.caption, color: COLORS.gold, marginTop: 2, marginBottom: SPACING.md },
  screensRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: 4 },
  screensLabel: { ...TYPE.label, color: COLORS.cream, flex: 1 },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: { color: COLORS.gold, fontSize: 16, fontWeight: "700" },
  screensCount: { ...TYPE.label, color: COLORS.cream, minWidth: 20, textAlign: "center" },
  screensNote: { ...TYPE.caption, color: COLORS.textFaint, marginBottom: SPACING.md },
  feature: { ...TYPE.body, color: COLORS.cream, marginBottom: 4 },
  subscribeButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  subscribeButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
  purchaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  purchasePoster: { width: 48, height: 48, borderRadius: RADIUS.sm, backgroundColor: COLORS.burgundyDark },
  purchasePosterFallback: { backgroundColor: COLORS.surfaceStrong },
  purchaseTitle: { ...TYPE.body, color: COLORS.cream, fontWeight: "700" },
  purchaseDate: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  purchaseAmount: { ...TYPE.label, color: COLORS.gold, fontWeight: "800" },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  paymentPlan: { ...TYPE.body, color: COLORS.cream, fontWeight: "700" },
  paymentDate: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  paymentAmount: { ...TYPE.label, color: COLORS.cream, fontWeight: "800" },
  paymentStatus: { ...TYPE.overline, marginTop: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalCard: { backgroundColor: COLORS.burgundyMuted, borderRadius: RADIUS.lg, padding: SPACING.lg },
  modalTitle: { ...TYPE.title, color: COLORS.cream },
  modalSubtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.lg },
  modalRewardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modalRewardText: { ...TYPE.body, color: COLORS.cream, flex: 1 },
  modalPriceBlock: { marginBottom: SPACING.lg },
  modalPriceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  modalPriceLabel: { ...TYPE.body, color: COLORS.textMuted },
  modalPriceValue: { ...TYPE.body, color: COLORS.cream },
  modalTotalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
    marginTop: 6,
    paddingTop: SPACING.sm,
  },
  modalTotalLabel: { ...TYPE.label, color: COLORS.cream, fontWeight: "800" },
  modalTotalValue: { ...TYPE.label, color: COLORS.gold, fontWeight: "800" },
  payButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  payButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
  modalCancel: { alignItems: "center", marginTop: SPACING.md },
  modalCancelText: { ...TYPE.label, color: COLORS.textMuted },
});

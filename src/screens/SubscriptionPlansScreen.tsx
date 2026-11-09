import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
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
  fetchMyActiveSubscription,
  fetchMyPayments,
  fetchMyVideoPurchases,
  fetchTaxConfig,
  AutopayStatus,
  fetchMyAutopay,
  cancelMyAutopay,
} from "@/api/subscriptions";
import { resolveMediaUrl, extractErrorMessage } from "@/api/apiClient";
import { fetchMyParentAccount } from "@/api/subAccounts";
import { useAuth } from "@/context/AuthContext";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import { WEB_PURCHASE_NOTICE } from "@/utils/purchaseNotice";

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

// Nothing is bought here: the app lists the plans and their prices and says
// that subscribing happens on theomy.com (see utils/purchaseNotice).
//
// A family sub-account shares its parent's plan and never has one of its own,
// so it gets a different message again, naming the account that owns the plan.
export default function SubscriptionPlansScreen() {
  const { user } = useAuth();
  if (user?.parent_id) return <ManagedPlanNotice />;
  return <SubscriptionPurchaseScreen />;
}

function ManagedPlanNotice() {
  const [parentName, setParentName] = useState("");
  const [plan, setPlan] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchMyParentAccount()
      .then((res) => setParentName(res.parent_name || ""))
      .catch(() => {});
    // /subscriptions/me resolves to the PARENT's plan for a sub-account.
    fetchMyActiveSubscription()
      .then(setPlan)
      .catch(() => {});
  }, []);

  const owner = parentName || "the main account holder";
  return (
    <GradientBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={noticeStyles.card}>
          <Text style={noticeStyles.title}>Your plan is managed by {owner}</Text>
          <Text style={noticeStyles.body}>
            This account shares {owner}'s plan, so plans can't be bought or changed here. To change the plan, ask {owner}.
          </Text>
          <Text style={plan ? noticeStyles.plan : noticeStyles.noPlan}>
            {plan
              ? `Current plan: ${plan.plan_name} · ${plan.duration_label} · ${plan.screens} screen${plan.screens === 1 ? "" : "s"}`
              : "There's no active plan on the family account right now."}
          </Text>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const noticeStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.lg },
  title: { ...TYPE.section, color: COLORS.cream, marginBottom: SPACING.sm },
  body: { ...TYPE.body, color: COLORS.textMuted, marginBottom: SPACING.md },
  plan: { ...TYPE.label, color: COLORS.gold },
  noPlan: { ...TYPE.label, color: COLORS.textMuted },
});

function SubscriptionPurchaseScreen() {
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

  // Auto-renew set up on the website. It can be turned off here — a
  // cancellation, not a purchase — but never started here.
  const [autopay, setAutopay] = useState<AutopayStatus | null>(null);
  const [cancellingAutopay, setCancellingAutopay] = useState(false);
  const [showAllSubs, setShowAllSubs] = useState(false);
  const isIndia = user?.country === "India";

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
        if (user?.country === "India") {
          setAutopay(await fetchMyAutopay().catch(() => null));
        }
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

  const loadAutopay = async () => {
    if (!isIndia) return;
    setAutopay(await fetchMyAutopay().catch(() => null));
  };

  const confirmCancelAutopay = () => {
    Alert.alert(
      "Turn off auto-renew?",
      "Your current plan stays active until it expires, and you won't be charged again.",
      [
        { text: "Keep auto-renew", style: "cancel" },
        {
          text: "Turn off",
          style: "destructive",
          onPress: async () => {
            setCancellingAutopay(true);
            try {
              await cancelMyAutopay();
              await loadAutopay();
            } catch (err: any) {
              Alert.alert("Couldn't turn off auto-renew", extractErrorMessage(err, "Please try again in a moment."));
            } finally {
              setCancellingAutopay(false);
            }
          },
        },
      ]
    );
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
        {(() => {
          const current = subscriptions.find((x) => x.is_active && new Date(x.expires_at) > new Date());
          return current ? (
            <View style={styles.currentPlanStrip}>
              <Text style={styles.currentPlanText}>
                You're on the <Text style={{ fontWeight: "800" }}>{current.plan_name}</Text> plan —{" "}
                {current.duration_label}, {current.screens} screen{current.screens === 1 ? "" : "s"}, active until{" "}
                {new Date(current.expires_at).toLocaleDateString()}.
              </Text>
            </View>
          ) : null;
        })()}

        {autopay?.active && (
          <View style={styles.autopayCard}>
            <Text style={styles.autopayText}>
              Auto-renew is on — ₹{autopay.total_amount} will be charged via UPI Autopay
              {autopay.next_renewal_at ? ` around ${new Date(autopay.next_renewal_at).toLocaleDateString()}` : ""}, then
              every {(autopay.duration_label || "").toLowerCase()}.
            </Text>
            <TouchableOpacity
              style={styles.autopayCancel}
              onPress={confirmCancelAutopay}
              disabled={cancellingAutopay}
            >
              {cancellingAutopay ? (
                <ActivityIndicator size="small" color={COLORS.burgundyLight} />
              ) : (
                <Text style={styles.autopayCancelText}>Turn off auto-renew</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Plans</Text>

          <View style={styles.webOnlyNotice}>
            <Text style={styles.webOnlyNoticeText}>{WEB_PURCHASE_NOTICE}</Text>
          </View>

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
                  They come off the price when you subscribe on theomy.com.
                </Text>
              </View>
            </View>
          )}

          {plans.map((plan) => {
            const screens = screensByPlan[plan.id] || 1;
            const monthly = monthlyPriceFor(plan, screens);
            const durationTotal = monthly * months * (1 - discount / 100);

            return (
              <View key={plan.id} style={[styles.planCard, plan.highlighted && styles.planCardHighlighted]}>
                {plan.highlighted && <Text style={styles.highlightedTag}>BEST VALUE</Text>}
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planTagline}>{plan.tagline}</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.priceMain}>₹{durationTotal.toFixed(0)}</Text>
                  <Text style={styles.priceSuffix}>/{selectedDuration?.label || "month"}</Text>
                </View>
                <Text style={styles.priceUsd}>
                  ≈ ₹{monthly.toFixed(0)}/month{gstPercent > 0 ? `, plus ${gstPercent}% GST` : ""}
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

              </View>
            );
          })}
        </View>

        {subscriptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Subscription History</Text>
            {(showAllSubs ? subscriptions : subscriptions.slice(0, 3)).map((sub) => (
              <View key={sub.id} style={styles.subCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subPlanName}>{sub.plan_name}</Text>
                  <Text style={styles.subMeta}>
                    {sub.duration_label} · {sub.screens} screen{sub.screens === 1 ? "" : "s"} · ₹{sub.price}
                  </Text>
                  <Text style={styles.subExpiry}>
                    {sub.is_active && new Date(sub.expires_at) > new Date() ? "Renews" : "Expired"} {new Date(sub.expires_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusPill, sub.is_active && new Date(sub.expires_at) > new Date() ? styles.statusPillActive : styles.statusPillInactive]}>
                  <Text style={styles.statusPillText}>{sub.is_active && new Date(sub.expires_at) > new Date() ? "Active" : "Expired"}</Text>
                </View>
              </View>
            ))}
            {subscriptions.length > 3 && (
              <TouchableOpacity style={styles.showAllButton} onPress={() => setShowAllSubs((v) => !v)}>
                <Text style={styles.showAllText}>
                  {showAllSubs ? "Show fewer" : `Show all ${subscriptions.length}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}


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
  webOnlyNotice: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  webOnlyNoticeText: { ...TYPE.body, color: COLORS.textMuted },
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
  modalAutopayRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modalAutopayText: { ...TYPE.caption, color: COLORS.textMuted, flex: 1, paddingRight: SPACING.sm },
  autopayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  currentPlanStrip: {
    backgroundColor: "rgba(76,175,125,0.12)",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  currentPlanText: { ...TYPE.body, color: COLORS.cream },
  showAllButton: { alignSelf: "center", paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  showAllText: { ...TYPE.label, color: COLORS.gold, fontWeight: "700" },
  autopayText: { ...TYPE.body, color: COLORS.gold },
  autopayCancel: {
    alignSelf: "flex-start",
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.5)",
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  autopayCancelText: { ...TYPE.caption, color: COLORS.burgundyLight, fontWeight: "700" },
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

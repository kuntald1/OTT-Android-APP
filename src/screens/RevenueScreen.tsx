import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  RevenueRate,
  RevenueSummary,
  Withdrawal,
  ContentPerformance,
  RevenueByDay,
  RevenueByCountry,
  fetchRevenueRate,
  fetchRevenueSummary,
  fetchWithdrawals,
  createWithdrawal,
  fetchMyContentPerformance,
  fetchMyRevenueByDay,
  fetchMyRevenueByCountry,
} from "@/api/revenue";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import RevenueBarChart from "@/components/RevenueBarChart";

const WITHDRAWAL_STATUS_COLORS: Record<string, string> = {
  paid: "#4CAF7D",
  pending: COLORS.gold,
  rejected: COLORS.burgundyLight,
};

const CHART_DAYS = 30;

type Tab = "graph" | "details";

export default function RevenueScreen() {
  const [tab, setTab] = useState<Tab>("details");
  const [rate, setRate] = useState<RevenueRate | null>(null);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [performance, setPerformance] = useState<ContentPerformance[]>([]);
  const [byDay, setByDay] = useState<RevenueByDay[]>([]);
  const [byCountry, setByCountry] = useState<RevenueByCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [requesting, setRequesting] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [rateData, summaryData, withdrawalsData, performanceData, byDayData, byCountryData] =
          await Promise.all([
            fetchRevenueRate(),
            fetchRevenueSummary(),
            fetchWithdrawals(),
            fetchMyContentPerformance(),
            fetchMyRevenueByDay(CHART_DAYS),
            fetchMyRevenueByCountry(),
          ]);
        setRate(rateData);
        setSummary(summaryData);
        setWithdrawals(withdrawalsData);
        setPerformance(performanceData);
        setByDay(byDayData);
        setByCountry(byCountryData);
      } catch {
        setError("Couldn't load revenue data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSubmitWithdrawal = async () => {
    const value = parseFloat(amount);
    const available = parseFloat(summary?.available_balance_rupees || "0");
    if (!value || value <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than 0.");
      return;
    }
    if (value > available) {
      Alert.alert("Amount too high", "You can withdraw up to " + available.toFixed(2) + ".");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createWithdrawal(value);
      setWithdrawals((prev) => [created, ...prev]);
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              available_balance_rupees: (available - value).toFixed(2),
              pending_withdrawals_rupees: (parseFloat(prev.pending_withdrawals_rupees) + value).toFixed(2),
            }
          : prev
      );
      setAmount("");
      setRequesting(false);
    } catch (err: any) {
      const detail =
        err && err.response
          ? "HTTP " + err.response.status + ": " + JSON.stringify(err.response.data)
          : (err && err.message) || "Unknown network error";
      Alert.alert("Couldn't submit request", detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </GradientBackground>
    );
  }

  if (error || !summary) {
    return (
      <GradientBackground style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Revenue</Text>
        <Text style={styles.subtitle}>Views, withdrawal requests & payment tracking. Content performance analytics.</Text>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === "graph" && styles.tabActive]} onPress={() => setTab("graph")}>
            <Text style={[styles.tabText, tab === "graph" && styles.tabTextActive]}>Graph</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "details" && styles.tabActive]}
            onPress={() => setTab("details")}
          >
            <Text style={[styles.tabText, tab === "details" && styles.tabTextActive]}>Details</Text>
          </TouchableOpacity>
        </View>

        {tab === "graph" ? (
          <React.Fragment>
            <Text style={styles.sectionTitle}>Your Revenue — Last {CHART_DAYS} Days</Text>
            <View style={styles.chartCard}>
              <RevenueBarChart data={byDay} days={CHART_DAYS} />
            </View>

            <Text style={styles.sectionTitle}>Viewers by Country</Text>
            {byCountry.length === 0 ? (
              <Text style={styles.emptyText}>No viewer data yet.</Text>
            ) : (
              <View style={styles.tableCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, styles.tableCellLeft, { flex: 2 }]}>Country</Text>
                  <Text style={styles.tableHeaderCell}>Viewers</Text>
                  <Text style={styles.tableHeaderCell}>You Earned</Text>
                </View>
                {byCountry.map((c) => (
                  <View key={c.country} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.tableCellLeft, { flex: 2, color: COLORS.gold }]}>{c.country}</Text>
                    <Text style={styles.tableCell}>{c.viewer_count}</Text>
                    <Text style={styles.tableCell}>₹{Number(c.creator_earned_rupees).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </React.Fragment>
        ) : (
          <React.Fragment>
            {rate && (
              <View style={styles.rateCard}>
                <Text style={styles.rateLabel}>PLATFORM DEFAULT RATE</Text>
                <Text style={styles.rateValue}>{rate.rate_display}</Text>
                <Text style={styles.rateNote}>
                  This is only a fallback — used for a video that has no custom Revenue-Share Tiers of its own. Any
                  video with its own tiers (set at upload) earns at those rates instead, per minute watched.
                </Text>
              </View>
            )}

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>₹{summary.total_earned_rupees}</Text>
                <Text style={styles.summaryLabel}>Total earned</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: COLORS.gold }]}>
                  ₹{summary.available_balance_rupees}
                </Text>
                <Text style={styles.summaryLabel}>Available to withdraw</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>₹{summary.pending_withdrawals_rupees}</Text>
                <Text style={styles.summaryLabel}>Pending withdrawal</Text>
              </View>
            </View>

            <View style={styles.withdrawHeader}>
              <Text style={styles.sectionTitleInline}>Withdrawal requests</Text>
              {!requesting && (
                <TouchableOpacity style={styles.requestButton} onPress={() => setRequesting(true)}>
                  <Text style={styles.requestButtonText}>Request withdrawal</Text>
                </TouchableOpacity>
              )}
            </View>

            {requesting && (
              <View style={styles.requestForm}>
                <Text style={styles.requestFormLabel}>
                  AMOUNT (₹) — UP TO ₹{parseFloat(summary.available_balance_rupees).toFixed(2)} AVAILABLE
                </Text>
                <TextInput
                  style={styles.requestInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={COLORS.textFaint}
                />
                <View style={styles.requestFormActions}>
                  <TouchableOpacity
                    style={styles.requestCancel}
                    onPress={() => {
                      setRequesting(false);
                      setAmount("");
                    }}
                    disabled={submitting}
                  >
                    <Text style={styles.requestCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.requestSubmit} onPress={onSubmitWithdrawal} disabled={submitting}>
                    {submitting ? (
                      <ActivityIndicator size="small" color={COLORS.ctaText} />
                    ) : (
                      <Text style={styles.requestSubmitText}>Submit request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.subsectionTitle}>History</Text>
            {withdrawals.length === 0 ? (
              <Text style={styles.emptyText}>No withdrawal requests yet.</Text>
            ) : (
              withdrawals.map((w) => (
                <View key={w.id} style={styles.withdrawalRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.withdrawalAmount}>₹{w.amount_rupees}</Text>
                    <Text style={styles.withdrawalMeta}>
                      Requested {new Date(w.requested_at).toLocaleDateString()}
                      {w.processed_at ? " · Processed " + new Date(w.processed_at).toLocaleDateString() : ""}
                      {w.admin_note ? " · " + w.admin_note : ""}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: (WITHDRAWAL_STATUS_COLORS[w.status] || COLORS.textFaint) + "33" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: WITHDRAWAL_STATUS_COLORS[w.status] || COLORS.textFaint },
                      ]}
                    >
                      {w.status}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Top Performing Content</Text>
            {performance.length === 0 ? (
              <Text style={styles.emptyText}>No performance data yet.</Text>
            ) : (
              <View style={styles.tableCard}>
                <View style={styles.tableHeaderRow}>
                  <Text style={styles.tableHeaderCellRank}>#</Text>
                  <Text style={[styles.tableHeaderCell, styles.tableCellLeft, { flex: 3 }]}>Video</Text>
                  <Text style={styles.tableHeaderCell}>Viewers</Text>
                  <Text style={styles.tableHeaderCell}>Minutes</Text>
                  <Text style={styles.tableHeaderCell}>You Earned</Text>
                </View>
                {performance.map((p, index) => (
                  <View key={p.video_id} style={styles.tableRow}>
                    <Text style={styles.tableCellRank}>{index + 1}</Text>
                    <Text style={[styles.tableCell, styles.tableCellLeft, { flex: 3, color: COLORS.gold }]} numberOfLines={2}>
                      {p.title}
                    </Text>
                    <Text style={styles.tableCell}>{p.unique_viewers}</Text>
                    <Text style={styles.tableCell}>{Number(p.total_watch_minutes).toFixed(2)}</Text>
                    <Text style={styles.tableCell}>₹{Number(p.creator_earned_rupees).toFixed(2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </React.Fragment>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.textMuted },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { ...TYPE.display, color: COLORS.cream },
  subtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.lg },
  tabRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.lg,
    alignSelf: "flex-start",
  },
  tab: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill },
  tabActive: { backgroundColor: COLORS.gold },
  tabText: { ...TYPE.label, color: COLORS.textMuted },
  tabTextActive: { color: COLORS.ctaText, fontWeight: "800" },
  sectionTitle: { ...TYPE.overline, color: COLORS.textMuted, marginBottom: SPACING.sm, marginTop: SPACING.lg },
  sectionTitleInline: { ...TYPE.section, color: COLORS.cream },
  chartCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  rateCard: {
    backgroundColor: "rgba(212,175,55,0.1)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  rateLabel: { ...TYPE.overline, color: COLORS.gold },
  rateValue: { ...TYPE.display, color: COLORS.cream, marginTop: 4 },
  rateNote: { ...TYPE.caption, color: COLORS.textMuted, marginTop: SPACING.sm },
  summaryRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.xl },
  summaryCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md },
  summaryValue: { ...TYPE.title, fontSize: 18, color: COLORS.cream },
  summaryLabel: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4 },
  withdrawHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.md },
  requestButton: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  requestButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
  requestForm: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg },
  requestFormLabel: { ...TYPE.overline, color: COLORS.textMuted, marginBottom: SPACING.sm },
  requestInput: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.cream,
    ...TYPE.body,
    marginBottom: SPACING.md,
  },
  requestFormActions: { flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm },
  requestCancel: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  requestCancelText: { ...TYPE.label, color: COLORS.textMuted },
  requestSubmit: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minWidth: 130,
    alignItems: "center",
  },
  requestSubmitText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
  subsectionTitle: { ...TYPE.label, color: COLORS.textMuted, marginBottom: SPACING.sm },
  emptyText: { ...TYPE.body, color: COLORS.textMuted },
  withdrawalRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  withdrawalAmount: { ...TYPE.title, fontSize: 16, color: COLORS.cream },
  withdrawalMeta: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  statusPill: { borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  statusPillText: { ...TYPE.overline },
  tableCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.15)",
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tableHeaderCell: { ...TYPE.overline, color: COLORS.textMuted, flex: 1, textAlign: "right" },
  tableHeaderCellRank: { ...TYPE.overline, color: COLORS.textMuted, width: 20 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.xs },
  tableCell: { ...TYPE.body, color: COLORS.cream, flex: 1, textAlign: "right" },
  tableCellLeft: { textAlign: "left" },
  tableCellRank: { ...TYPE.body, color: COLORS.textFaint, width: 20 },
});

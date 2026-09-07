import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { RevenueByDay } from "@/api/revenue";
import { COLORS, SPACING, TYPE } from "@/theme";

const CHART_HEIGHT = 140;

// The API only returns days that actually had revenue (sparse) — this
// fills every day in the range with 0 so the bars line up correctly and
// the chart shows a full 30-day span, not just the days with data.
function fillDays(data: RevenueByDay[], days: number): { date: string; amount: number }[] {
  const byDate = new Map(data.map((d) => [d.date, Number(d.creator_earned_rupees) || 0]));
  const result: { date: string; amount: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, amount: byDate.get(key) || 0 });
  }
  return result;
}

export default function RevenueBarChart({ data, days }: { data: RevenueByDay[]; days: number }) {
  const filled = fillDays(data, days);
  const maxAmount = Math.max(...filled.map((d) => d.amount), 0.01);

  return (
    <View>
      <View style={styles.chartRow}>
        {filled.map((d) => (
          <View key={d.date} style={styles.barColumn}>
            <View style={[styles.bar, { height: Math.max(2, (d.amount / maxAmount) * CHART_HEIGHT) }]} />
          </View>
        ))}
      </View>
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{filled[0]?.date.slice(5)}</Text>
        <Text style={styles.axisLabel}>{filled[filled.length - 1]?.date.slice(5)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT,
    gap: 2,
  },
  barColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: CHART_HEIGHT },
  bar: { width: "100%", backgroundColor: COLORS.gold, borderRadius: 2 },
  axisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: SPACING.xs },
  axisLabel: { ...TYPE.caption, color: COLORS.textFaint },
});

import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { LiveEventForm, Section } from "@/utils/liveEventForm";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

// ---------------------------------------------------------------------------
// The scheduling + monetization half of the organiser's live event form,
// shared by the Create form and the Edit sheet on My Live Events so the
// two can't drift. Mirrors the web's shared/LiveEventFields.jsx.
//
// `section` says WHERE the event is listed; `monetization_type` says HOW
// it's paid for. A paid show isn't tied to a plan, so it has no
// plan-shaped section to pick: the control is pinned to "both" and
// locked, which the server enforces again on its side.
// ---------------------------------------------------------------------------

const ACCESS_OPTIONS: { value: "subscription" | "pay_per_stream"; label: string }[] = [
  { value: "subscription", label: "Subscription" },
  { value: "pay_per_stream", label: "Pay Per Streaming" },
];

const SECTIONS: { value: Section; label: string }[] = [
  { value: "both", label: "Both" },
  { value: "play", label: "Contemporary" },
  { value: "archive", label: "Heritage" },
];

export default function LiveEventFormFields({
  values,
  onChange,
}: {
  values: LiveEventForm;
  onChange: (next: LiveEventForm) => void;
}) {
  const paid = values.monetization_type === "pay_per_stream";

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>Shows on</Text>
      <View style={styles.chipRow}>
        {SECTIONS.map((s) => {
          const active = paid ? s.value === "both" : values.section === s.value;
          return (
            <TouchableOpacity
              key={s.value}
              style={[styles.chip, active && styles.chipActive, paid && styles.chipLocked]}
              disabled={paid}
              onPress={() => onChange({ ...values, section: s.value })}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {paid && (
        <Text style={styles.fieldHint}>
          A paid show isn't tied to a plan, so it's listed in both sections.
        </Text>
      )}

      <Text style={styles.fieldLabel}>Access</Text>
      <View style={styles.chipRow}>
        {ACCESS_OPTIONS.map((a) => (
          <TouchableOpacity
            key={a.value}
            style={[styles.chip, values.monetization_type === a.value && styles.chipActive]}
            onPress={() =>
              onChange({
                ...values,
                monetization_type: a.value,
                // Switching to paid pins the section in the same tap,
                // so what's on screen matches what will be saved.
                section: a.value === "pay_per_stream" ? "both" : values.section,
              })
            }
          >
            <Text
              style={[
                styles.chipText,
                values.monetization_type === a.value && styles.chipTextActive,
              ]}
            >
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {paid && (
        <View style={styles.fieldRow}>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Show price (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="199"
              placeholderTextColor={COLORS.textFaint}
              value={values.price_inr}
              onChangeText={(v) => onChange({ ...values, price_inr: v })}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.fieldLabel}>Show price ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="4.99"
              placeholderTextColor={COLORS.textFaint}
              value={values.price_usd}
              onChangeText={(v) => onChange({ ...values, price_usd: v })}
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      <Text style={styles.fieldLabel}>Show date &amp; time</Text>
      <TextInput
        style={styles.input}
        placeholder="02-11-2026 17:00"
        placeholderTextColor={COLORS.textFaint}
        value={values.scheduled_start_at}
        onChangeText={(v) => onChange({ ...values, scheduled_start_at: v })}
      />

      <Text style={styles.fieldLabel}>Promote from</Text>
      <TextInput
        style={styles.input}
        placeholder="31-10-2026"
        placeholderTextColor={COLORS.textFaint}
        value={values.promo_from}
        onChangeText={(v) => onChange({ ...values, promo_from: v })}
      />
      <Text style={styles.fieldHint}>
        Leave both dates empty and the event appears only once it's actually broadcasting. Set them to
        announce it in advance: it's listed from the promote date, showing the show time, but stays
        unplayable until the broadcast really starts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  fieldLabel: { ...TYPE.overline, color: COLORS.textFaint },
  fieldHint: { ...TYPE.caption, color: COLORS.textFaint },
  fieldRow: { flexDirection: "row", gap: SPACING.md },
  fieldHalf: { flex: 1, gap: 4 },
  chipRow: { flexDirection: "row", gap: SPACING.sm, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceStrong,
  },
  chipActive: { backgroundColor: COLORS.gold },
  chipLocked: { opacity: 0.55 },
  chipText: { ...TYPE.label, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.ctaText, fontWeight: "800" },
  input: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.cream,
    fontSize: 14,
  },
});

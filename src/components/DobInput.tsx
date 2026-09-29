import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

// ---------------------------------------------------------------------------
// DobInput — date of birth as three plain Day/Month/Year fields, not a
// native date-picker. Deliberately dependency-free: this app has already
// been through one painful SDK/version upgrade (see LoginScreen's history),
// and @react-native-community/datetimepicker (or similar) isn't confirmed
// installed here — adding a new native module would need a rebuild this
// change shouldn't require. Emits/accepts a plain "YYYY-MM-DD" string,
// matching what the backend's date_of_birth field expects (registerUser
// on the web sends the same ISO shape from an <input type="date">).
// ---------------------------------------------------------------------------

function pad2(n: string): string {
  return n.length === 1 ? `0${n}` : n;
}

export default function DobInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string; // "" or "YYYY-MM-DD"
  onChange: (iso: string) => void;
  disabled?: boolean;
}) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Keep the three fields in sync if `value` is set/cleared from outside
  // (e.g. the parent form resetting after a successful submit).
  useEffect(() => {
    if (!value) {
      setDay(""); setMonth(""); setYear("");
      return;
    }
    const [y, m, d] = value.split("-");
    setYear(y || ""); setMonth(m || ""); setDay(d || "");
  }, [value]);

  const emit = (d: string, m: string, y: string) => {
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange("");
    }
  };

  const onDayChange = (t: string) => {
    const digits = t.replace(/[^0-9]/g, "").slice(0, 2);
    setDay(digits);
    emit(digits.length === 2 ? digits : pad2(digits), month, year);
  };
  const onMonthChange = (t: string) => {
    const digits = t.replace(/[^0-9]/g, "").slice(0, 2);
    setMonth(digits);
    emit(day.length === 2 ? day : pad2(day), digits.length === 2 ? digits : pad2(digits), year);
  };
  const onYearChange = (t: string) => {
    const digits = t.replace(/[^0-9]/g, "").slice(0, 4);
    setYear(digits);
    emit(day.length === 2 ? day : pad2(day), month.length === 2 ? month : pad2(month), digits);
  };

  return (
    <View>
      <Text style={styles.label}>Date of birth (DD-MM-YYYY)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.segment, styles.segmentSmall]}
          value={day}
          onChangeText={onDayChange}
          placeholder="DD"
          placeholderTextColor={COLORS.textFaint}
          keyboardType="number-pad"
          maxLength={2}
          editable={!disabled}
          accessibilityLabel="Date of birth day"
        />
        <TextInput
          style={[styles.segment, styles.segmentSmall]}
          value={month}
          onChangeText={onMonthChange}
          placeholder="MM"
          placeholderTextColor={COLORS.textFaint}
          keyboardType="number-pad"
          maxLength={2}
          editable={!disabled}
          accessibilityLabel="Date of birth month"
        />
        <TextInput
          style={[styles.segment, styles.segmentLarge]}
          value={year}
          onChangeText={onYearChange}
          placeholder="YYYY"
          placeholderTextColor={COLORS.textFaint}
          keyboardType="number-pad"
          maxLength={4}
          editable={!disabled}
          accessibilityLabel="Date of birth year"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...TYPE.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
  row: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  segment: {
    backgroundColor: COLORS.burgundyDark,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    color: COLORS.cream,
    fontSize: 16,
    textAlign: "center",
  },
  segmentSmall: { flex: 1 },
  segmentLarge: { flex: 1.6 },
});

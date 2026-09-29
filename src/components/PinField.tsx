import React from "react";
import { StyleSheet, TextInput } from "react-native";
import { COLORS, RADIUS } from "@/theme";

// ---------------------------------------------------------------------------
// PinField — the 4-digit Family PIN box (Who's watching?, Manage Profile).
// Mirrors the web app's shared/PinField.jsx exactly, including converting
// non-ASCII digits (Bengali ০-৯, Arabic-Indic ٠-٩ / ۰-۹) typed on those
// keyboards to 0-9 — the backend accepts exactly [0-9]{4}, so a PIN typed
// in another script would otherwise silently never match later.
// ---------------------------------------------------------------------------

const NON_ASCII_DIGIT_SETS = ["০১২৩৪৫৬৭৮৯", "٠١٢٣٤٥٦٧٨٩", "۰۱۲۳۴۵۶۷۸۹"];

export function normalizePin(raw: string): string {
  return String(raw ?? "")
    .split("")
    .map((ch) => {
      for (const set of NON_ASCII_DIGIT_SETS) {
        const i = set.indexOf(ch);
        if (i >= 0) return String(i);
      }
      return ch;
    })
    .join("")
    .replace(/[^0-9]/g, "")
    .slice(0, 4);
}

export const isCompletePin = (value: string) => /^[0-9]{4}$/.test(value);

export default function PinField({
  value,
  onChange,
  onEnter,
  autoFocus = false,
  disabled = false,
  accessibilityLabel = "PIN",
  placeholder = "••••",
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  placeholder?: string;
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={(t) => onChange(normalizePin(t))}
      onSubmitEditing={onEnter}
      secureTextEntry
      keyboardType="number-pad"
      maxLength={4}
      autoFocus={autoFocus}
      editable={!disabled}
      accessibilityLabel={accessibilityLabel}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textFaint}
      textAlign="center"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "rgba(245,235,221,0.2)",
    backgroundColor: "rgba(245,235,221,0.06)",
    borderRadius: RADIUS.sm,
    color: COLORS.cream,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 22,
    letterSpacing: 10,
  },
});

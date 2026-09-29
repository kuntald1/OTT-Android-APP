import React, { useMemo, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import { INDIA_CITIES_FLAT } from "@/data/indiaCities";

// ---------------------------------------------------------------------------
// CityPicker — searchable India-city picker used at registration and (once
// a mobile "Complete your profile" screen exists) profile completion.
// Mirrors the web app's src/shared/CityDropdown.jsx: pick from the list, or
// "Other" reveals a free-text box whose value is stored as-is (backend
// never validates city against this list, so it survives the list
// changing later).
// ---------------------------------------------------------------------------

const OTHER = "__other__";

export default function CityPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (city: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isOther = value !== "" && value !== OTHER && !INDIA_CITIES_FLAT.some((c) => c.city === value);
  const showOtherInput = value === OTHER || isOther;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? INDIA_CITIES_FLAT.filter((c) => c.city.toLowerCase().includes(q)) : INDIA_CITIES_FLAT;
    return list.slice(0, 50); // keep the open list short and fast to scroll
  }, [query]);

  const pick = (city: string) => {
    onChange(city);
    setOpen(false);
    setQuery("");
  };

  const label = !value ? "City" : value === OTHER ? "Other" : value;

  return (
    <View>
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        accessibilityLabel="City"
      >
        <Text style={value ? styles.fieldText : styles.fieldPlaceholder}>{label}</Text>
      </TouchableOpacity>

      {showOtherInput && (
        <TextInput
          style={[styles.field, styles.otherInput]}
          value={value === OTHER ? "" : value}
          onChangeText={onChange}
          placeholder="Type your city"
          placeholderTextColor={COLORS.textFaint}
          editable={!disabled}
          accessibilityLabel="Type your city"
        />
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search city…"
              placeholderTextColor={COLORS.textFaint}
              autoFocus
              accessibilityLabel="Search city"
            />
            <FlatList
              data={results}
              keyExtractor={(item) => `${item.state}-${item.city}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => pick(item.city)}>
                  <Text style={[styles.rowText, value === item.city && styles.rowTextActive]}>{item.city}</Text>
                  <Text style={styles.rowState}>{item.state}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No matches — pick "Other" below.</Text>}
              style={styles.list}
            />
            <TouchableOpacity style={styles.otherRow} onPress={() => pick(OTHER)}>
              <Text style={[styles.rowText, isOther && styles.rowTextActive]}>Other (type your city)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => setOpen(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: COLORS.burgundyDark,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    marginBottom: SPACING.md,
  },
  fieldDisabled: { opacity: 0.5 },
  fieldText: { ...TYPE.body, color: COLORS.cream },
  fieldPlaceholder: { ...TYPE.body, color: "#c9b8b8" },
  otherInput: { marginTop: -SPACING.sm },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: COLORS.burgundy,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: "75%",
  },
  searchInput: {
    backgroundColor: COLORS.burgundyDark,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    color: COLORS.cream,
    marginBottom: SPACING.sm,
  },
  list: { maxHeight: 320 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.hairline,
  },
  rowText: { ...TYPE.body, color: COLORS.cream },
  rowTextActive: { color: COLORS.gold, fontWeight: "700" },
  rowState: { ...TYPE.caption, color: COLORS.textFaint },
  emptyText: { ...TYPE.caption, color: COLORS.textMuted, paddingVertical: SPACING.md, textAlign: "center" },
  otherRow: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs },
  closeButton: { alignItems: "center", paddingVertical: SPACING.md },
  closeButtonText: { ...TYPE.label, color: COLORS.gold, fontWeight: "700" },
});

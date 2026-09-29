import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fetchFamilyAccounts, setFamilyPin } from "@/api/family";
import { extractErrorMessage } from "@/api/apiClient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import PinField, { isCompletePin } from "./PinField";

// ---------------------------------------------------------------------------
// Family PIN — set or change it from Manage Profile (next to Family
// Accounts). The PIN is what a family member must enter to get back into
// THIS account from "Who's watching?". Mirrors the web app's
// shared/FamilyPinSection.jsx.
// ---------------------------------------------------------------------------

export default function FamilyPinSection() {
  const [pinSet, setPinSet] = useState<boolean | null>(null); // null while loading
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchFamilyAccounts()
      .then((r) => setPinSet(r.pin_set))
      .catch(() => setPinSet(false));
  }, []);

  const reset = () => {
    setCurrent(""); setNext(""); setConfirm(""); setError("");
  };

  const save = async () => {
    if (busy) return;
    if (pinSet && !isCompletePin(current)) { setError("Enter your current 4-digit PIN."); return; }
    if (!isCompletePin(next)) { setError("Choose a 4-digit PIN."); return; }
    if (next !== confirm) { setError("The two PINs don't match."); return; }
    setError("");
    setBusy(true);
    try {
      await setFamilyPin({ newPin: next, currentPin: pinSet ? current : undefined });
      setPinSet(true);
      setSaved(true);
      setEditing(false);
      reset();
    } catch (e: any) {
      setError(extractErrorMessage(e, "Couldn't save the PIN. Please try again."));
      setCurrent("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>🔑 Family PIN</Text>
            {pinSet !== null && (
              <View style={pinSet ? styles.badgeSet : styles.badgeUnset}>
                <Text style={pinSet ? styles.badgeSetText : styles.badgeUnsetText}>{pinSet ? "Set" : "Not set"}</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            Needed to get back into your account from a family account. Forgot it? Contact support to reset it.
          </Text>
        </View>
        {!editing && pinSet !== null && (
          <TouchableOpacity onPress={() => { setEditing(true); setSaved(false); }} style={styles.editButton}>
            <Text style={styles.editButtonText}>{pinSet ? "Change PIN" : "Set PIN"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {saved && !editing && <Text style={styles.savedText}>Family PIN saved.</Text>}

      {editing && (
        <View style={styles.form}>
          {pinSet && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Current PIN</Text>
              <PinField value={current} onChange={setCurrent} onEnter={save} disabled={busy} accessibilityLabel="Current PIN" autoFocus />
            </View>
          )}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>New PIN</Text>
            <PinField value={next} onChange={setNext} onEnter={save} disabled={busy} accessibilityLabel="New PIN" autoFocus={!pinSet} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Confirm new PIN</Text>
            <PinField value={confirm} onChange={setConfirm} onEnter={save} disabled={busy} accessibilityLabel="Confirm new PIN" />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={save} disabled={busy} style={styles.saveButton}>
              {busy ? <ActivityIndicator size="small" color={COLORS.ctaText} /> : <Text style={styles.saveButtonText}>Save PIN</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEditing(false); reset(); }} disabled={busy} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(245,235,221,0.03)",
    borderWidth: 1,
    borderColor: "rgba(245,235,221,0.08)",
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.sm },
  titleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  title: { ...TYPE.body, color: COLORS.cream, fontWeight: "700" },
  badgeSet: { backgroundColor: "rgba(111,207,151,0.15)", borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeSetText: { fontSize: 10, fontWeight: "700", color: "#6FCF97" },
  badgeUnset: { backgroundColor: "rgba(248,113,113,0.15)", borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeUnsetText: { fontSize: 10, fontWeight: "700", color: "#f87171" },
  subtitle: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 4 },
  editButton: { borderWidth: 1, borderColor: "rgba(212,175,55,0.4)", borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: 6 },
  editButtonText: { fontSize: 12, fontWeight: "700", color: COLORS.gold },
  savedText: { marginTop: SPACING.sm, fontSize: 12, fontWeight: "700", color: "#6FCF97" },
  form: { marginTop: SPACING.md, gap: SPACING.sm },
  field: { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: COLORS.textMuted },
  errorText: { fontSize: 12, fontWeight: "600", color: "#f87171" },
  actionsRow: { flexDirection: "row", gap: SPACING.sm, marginTop: 4 },
  saveButton: { backgroundColor: COLORS.gold, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  saveButtonText: { fontSize: 12, fontWeight: "700", color: COLORS.ctaText },
  cancelButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  cancelButtonText: { fontSize: 12, fontWeight: "600", color: COLORS.textMuted },
});

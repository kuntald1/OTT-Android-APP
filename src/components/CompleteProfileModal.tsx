import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { extractErrorMessage } from "@/api/apiClient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import DobInput from "./DobInput";
import CityPicker from "./CityPicker";

// ---------------------------------------------------------------------------
// CompleteProfileModal — the one-time prompt for date of birth (+ city, for
// India accounts) on any account that doesn't have them yet: an account
// created before this feature shipped, a Google/Facebook signup (which
// never went through the registration form), or a sub-account its parent
// declared an ADULT (api/subAccounts.ts) filling in its own details on its
// own first login. Mirrors the web app's shared/CompleteProfileModal.jsx.
//
// Deliberately not dismissible without submitting (per the confirmed
// decision that these fields are mandatory) — there is no close/skip
// button, and the Android hardware back button is swallowed (see
// onRequestClose below). A declared-minor sub-account never sees this at
// all; AuthContext only sets needsProfileCompletion when the backend says
// needs_profile is true, which is never true for a declared minor.
// ---------------------------------------------------------------------------

export default function CompleteProfileModal() {
  const { user, needsProfileCompletion, completeDemographics } = useAuth();
  const insets = useSafeAreaInsets();
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!needsProfileCompletion) return null;

  const isIndia = (user?.country || "").trim().toLowerCase() === "india";

  const submit = async () => {
    if (submitting) return;
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (isIndia && !city.trim()) {
      setError("Please select your city.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await completeDemographics({ dateOfBirth: dob, city: isIndia ? city.trim() : undefined });
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.backdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.card}>
          <Text style={styles.title}>Complete your profile</Text>
          <Text style={styles.subtitle}>
            A couple of quick details before you continue — this helps us understand who's watching theomy.
          </Text>

          <DobInput value={dob} onChange={setDob} disabled={submitting} />

          {isIndia && (
            <View style={styles.cityWrap}>
              <Text style={styles.fieldLabel}>City</Text>
              <CityPicker value={city} onChange={setCity} disabled={submitting} />
            </View>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? "Saving…" : "Continue"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,1,4,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.burgundy,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  title: { ...TYPE.title, color: COLORS.cream, marginBottom: SPACING.xs },
  subtitle: { ...TYPE.caption, color: COLORS.textMuted, marginBottom: SPACING.lg },
  fieldLabel: { ...TYPE.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
  cityWrap: { marginTop: SPACING.xs },
  error: { ...TYPE.caption, color: COLORS.burgundyLight, marginBottom: SPACING.md },
  button: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  buttonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800" },
});

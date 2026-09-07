import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { submitOrganiserRequest } from "@/api/organiserRequests";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";

export default function RequestOrganiserScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [subject, setSubject] = useState("Need Organiser");
  const [groupName, setGroupName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!subject.trim() || !groupName.trim() || !phone.trim() || !email.trim()) {
      Alert.alert("Missing info", "Subject, group name, phone, and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      await submitOrganiserRequest({
        subject: subject.trim(),
        group_name: groupName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        remarks: remarks.trim() || null,
      });
      Alert.alert("Request submitted", "We'll review your request and get back to you.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Couldn't submit", "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GradientBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.label}>SUBJECT *</Text>
          <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholderTextColor={COLORS.textFaint} />

          <Text style={styles.label}>GROUP NAME *</Text>
          <TextInput style={styles.input} value={groupName} onChangeText={setGroupName} placeholderTextColor={COLORS.textFaint} />

          <Text style={styles.label}>PHONE NUMBER *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.textFaint}
          />

          <Text style={styles.label}>EMAIL *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={COLORS.textFaint}
          />

          <Text style={styles.label}>REMARKS</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={remarks}
            onChangeText={setRemarks}
            multiline
            textAlignVertical="top"
            placeholderTextColor={COLORS.textFaint}
          />

          <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.ctaText} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  label: { ...TYPE.overline, color: COLORS.textMuted, marginTop: SPACING.md, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.cream,
    ...TYPE.body,
  },
  textArea: { minHeight: 100 },
  submitButton: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.xl,
  },
  submitButtonText: { ...TYPE.label, color: COLORS.ctaText, fontWeight: "800", fontSize: 15 },
});

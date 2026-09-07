import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { sendOtp } from "@/api/auth";
import { COLORS } from "@/theme/colors";

// Confirmed flow: POST /auth/otp/send { phone, purpose: "login" }, then
// POST /auth/login-otp { phone, otp } — both captured from a real network
// trace.
export default function OtpLoginScreen() {
  const navigation = useNavigation<any>();
  const { loginWithOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSendCode = async () => {
    if (!phone) {
      setError("Enter your phone number");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await sendOtp(phone, "login");
      setMessage(res.message);
      setCodeSent(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Couldn't send the code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!otp) {
      setError("Enter the OTP");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await loginWithOtp(phone, otp);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.heading}>Log in with OTP</Text>

      <TextInput
        style={styles.input}
        placeholder="Phone number"
        placeholderTextColor="#c9b8b8"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        editable={!codeSent}
      />

      {codeSent && (
        <>
          {message && <Text style={styles.info}>{message}</Text>}
          <TextInput
            style={styles.input}
            placeholder="Enter OTP"
            placeholderTextColor="#c9b8b8"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
          />
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={codeSent ? handleVerify : handleSendCode}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.ctaText} />
        ) : (
          <Text style={styles.buttonText}>
            {codeSent ? "Log In" : "Send Code"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
        <Text style={styles.backLinkText}>Back to password login</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  heading: {
    color: COLORS.gold,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    backgroundColor: COLORS.burgundyDark,
    color: COLORS.cream,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  info: { color: COLORS.gold, marginBottom: 12, textAlign: "center", fontSize: 13 },
  error: { color: COLORS.burgundyLight, marginBottom: 12, textAlign: "center" },
  button: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: COLORS.ctaText, fontSize: 16, fontWeight: "700" },
  backLink: { marginTop: 20, alignItems: "center" },
  backLinkText: { color: COLORS.cream, opacity: 0.8, fontSize: 14 },
});

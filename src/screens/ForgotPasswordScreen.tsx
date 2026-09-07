import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { forgotPassword } from "@/api/auth";
import { COLORS } from "@/theme/colors";

// Confirmed: POST /auth/forgot-password { email } -> { message }
export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError("Enter your email");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Couldn't send, try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.heading}>Forgot Password</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#c9b8b8"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!message}
      />

      {message && <Text style={styles.info}>{message}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      {!message && (
        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={COLORS.ctaText} />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
        <Text style={styles.backLinkText}>Back to login</Text>
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
  info: { color: COLORS.gold, marginBottom: 12, textAlign: "center", fontSize: 14 },
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

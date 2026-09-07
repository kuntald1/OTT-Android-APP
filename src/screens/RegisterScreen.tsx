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
import SocialLoginRow from "@/components/SocialLoginRow";

// Step 1 (name, email, password, country, phone -> "Send verification code")
// mirrors the real web registration form (confirmed via screenshot).
// POST /auth/otp/send { phone, purpose: "registration" } is confirmed.
// The final verify-and-create-account call is NOT confirmed — see
// api/auth.ts register() for what's assumed there.
export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("India");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSendCode = async () => {
    if (!name || !email || !password || !phone) {
      setError("Please fill in all fields");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await sendOtp(phone, "registration");
      setMessage(res.message);
      setCodeSent(true);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Couldn't send the code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (!otp) {
      setError("Enter the OTP");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register({ name, email, password, country, phone, otp });
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Couldn't create the account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.heading}>Create your account</Text>
      <Text style={styles.subheading}>Login is required to browse theomy.</Text>

      <SocialLoginRow />
      <Text style={styles.orDivider}>or</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor="#c9b8b8"
        value={name}
        onChangeText={setName}
        editable={!codeSent}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#c9b8b8"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!codeSent}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#c9b8b8"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!codeSent}
      />
      <TextInput
        style={styles.input}
        placeholder="Country"
        placeholderTextColor="#c9b8b8"
        value={country}
        onChangeText={setCountry}
        editable={!codeSent}
      />
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
            placeholder="Enter verification code"
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
        onPress={codeSent ? handleVerifyAndCreate : handleSendCode}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={COLORS.ctaText} />
        ) : (
          <Text style={styles.buttonText}>
            {codeSent ? "Verify & Create Account" : "Send verification code"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
        <Text style={styles.backLinkText}>Already have an account? Log in</Text>
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
  heading: { color: COLORS.cream, fontSize: 24, fontWeight: "800", marginBottom: 4 },
  subheading: { color: COLORS.cream, opacity: 0.7, fontSize: 13, marginBottom: 24 },
  orDivider: {
    color: COLORS.cream,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 16,
    fontSize: 13,
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

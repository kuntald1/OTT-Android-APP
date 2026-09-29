import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { sendRegistrationEmailOtp } from "@/api/auth";
import { extractErrorMessage } from "@/api/apiClient";
import { COLORS } from "@/theme/colors";
import SocialLoginRow from "@/components/SocialLoginRow";
import GradientBackground from "@/components/GradientBackground";
import DobInput from "@/components/DobInput";
import CityPicker from "@/components/CityPicker";

// Matches the web app's registration form field-for-field (Admin decisions,
// Sept 2026): Date of birth is required for every registration (under-18
// rejected — see auth.MIN_REGISTRATION_AGE on the backend); City is
// required for India only; there is no gender field (retired). Email OTP
// (sendRegistrationEmailOtp) replaced the old WhatsApp/phone OTP — phone is
// still required for India but is no longer itself verified. The backend
// checks email, phone and date of birth for problems BEFORE sending a
// code, so someone who fails one of those checks never receives an email
// at all — this screen just surfaces whatever error comes back.
export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("India");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isIndia = country.trim().toLowerCase() === "india";

  const handleSendCode = async () => {
    if (!name.trim() || !email.trim() || password.length < 8 || (isIndia && !phone.trim()) || !dob) {
      setError("Please fill in all fields");
      return;
    }
    if (isIndia && !city.trim()) {
      setError("Please select your city");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await sendRegistrationEmailOtp(email.trim(), isIndia ? phone.trim() : undefined, dob);
      setMessage(res.message);
      setCodeSent(true);
    } catch (e: any) {
      setError(extractErrorMessage(e, "Couldn't send the code"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndCreate = async () => {
    if (!otp) {
      setError("Enter the verification code");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        country,
        phone: isIndia ? phone.trim() : "",
        otp,
        dateOfBirth: dob,
        city: isIndia ? city.trim() : undefined,
      });
    } catch (e: any) {
      setError(extractErrorMessage(e, "Couldn't create the account"));
    } finally {
      setSubmitting(false);
    }
  };

  // Going back to fix a field after the code was already sent — any field
  // could need a correction (not just email, since the pre-send checks
  // above cover email/phone/date of birth together), so this resets the
  // whole "sent" state rather than singling out one field to re-edit.
  const changeDetails = () => {
    setCodeSent(false);
    setOtp("");
    setMessage(null);
    setError(null);
  };

  return (
    <GradientBackground style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
            placeholder="Password (min. 8 characters)"
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
          {isIndia && (
            <TextInput
              style={styles.input}
              placeholder="Phone number (required)"
              placeholderTextColor="#c9b8b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!codeSent}
            />
          )}

          <DobInput value={dob} onChange={setDob} disabled={codeSent} />

          {isIndia && (
            <View style={styles.cityWrap}>
              <CityPicker value={city} onChange={setCity} disabled={codeSent} />
            </View>
          )}

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
              <TouchableOpacity onPress={changeDetails} style={styles.changeDetailsLink}>
                <Text style={styles.changeDetailsText}>Change details</Text>
              </TouchableOpacity>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  cityWrap: { marginBottom: 0 },
  info: { color: COLORS.gold, marginBottom: 12, textAlign: "center", fontSize: 13 },
  error: { color: COLORS.burgundyLight, marginBottom: 12, textAlign: "center" },
  changeDetailsLink: { alignSelf: "flex-start", marginBottom: 12 },
  changeDetailsText: { color: COLORS.cream, opacity: 0.6, fontSize: 12 },
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

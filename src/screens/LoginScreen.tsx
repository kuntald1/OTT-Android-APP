import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/theme/colors";
import { extractErrorMessage } from "@/api/apiClient";
import SocialLoginRow from "@/components/SocialLoginRow";
import GradientBackground from "@/components/GradientBackground";

const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);

// Visual language adapted from a landing-page spec the user shared (motion/react,
// web-only) into RN's built-in Animated API — no extra native deps, since the
// project just went through a painful SDK/version upgrade. Headline copy is the
// real theomy hero copy from GET /api/page-heroes/plays, not invented text.
function useSlideIn(delay: number) {
  const value = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(value, {
        toValue: 0,
        duration: 700,
        delay,
        easing: EXPO_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        delay,
        easing: EXPO_OUT,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return { transform: [{ translateY: value }], opacity };
}

// Splits a headline into two lines that slide in from opposite sides and
// land together: line 1 enters from the right, line 2 from the left, same
// start time, same duration — no stagger, so they arrive in place at once.
// Loops on a 5s cycle: 850ms slide-in, holds visible, then resets invisibly
// (opacity 0 at the off-screen start position) and replays.
const CYCLE_MS = 5000;
const ENTER_MS = 850;

function useSlideFromSide(fromX: number) {
  const translateX = useRef(new Animated.Value(fromX)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: ENTER_MS,
            easing: EXPO_OUT,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: ENTER_MS,
            easing: EXPO_OUT,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(CYCLE_MS - ENTER_MS),
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: fromX,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return { transform: [{ translateX }], opacity };
}

function splitHeadline(headline: string): [string, string] {
  const words = headline.trim().split(/\s+/);
  if (words.length <= 2) return [headline, ""];
  return [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
}

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const formStyle = useSlideIn(200);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Enter your email and password");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setError(extractErrorMessage(e, "Login failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GradientBackground style={styles.root}>
      <Text style={[styles.brandMark, { top: insets.top + 16 }]}>THEOMY</Text>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View style={formStyle}>
          <SocialLoginRow />

          <Text style={styles.orDivider}>or</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#c9b8b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#c9b8b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.linkRow}>
            <TouchableOpacity onPress={() => navigation.navigate("OtpLogin")}>
              <Text style={styles.linkText}>Log in with OTP instead</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={styles.linkText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.ctaText} />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            style={styles.registerLink}
          >
            <Text style={styles.registerLinkText}>New Registration</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brandMark: {
    position: "absolute",
    left: 20,
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: "800",
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  headline: {
    color: COLORS.cream,
    fontSize: 34,
    fontWeight: "800",
    textTransform: "uppercase",
    lineHeight: 38,
    letterSpacing: 0.5,
  },
  headlineLine2: {
    color: COLORS.gold,
  },
  taglineWrap: {
    marginTop: 24,
    alignItems: "center",
  },
  taglineCentered: {
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    color: COLORS.cream,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  error: {
    color: COLORS.burgundyLight,
    marginBottom: 12,
    textAlign: "center",
  },
  orDivider: {
    color: COLORS.cream,
    opacity: 0.6,
    textAlign: "center",
    marginVertical: 12,
    fontSize: 13,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  linkText: { color: COLORS.gold, fontSize: 13 },
  registerLink: { marginTop: 16, alignItems: "center" },
  registerLinkText: { color: COLORS.gold, fontSize: 14, fontWeight: "600" },
  button: {
    backgroundColor: COLORS.gold,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: COLORS.ctaText,
    fontSize: 17,
    fontWeight: "700",
  },
});

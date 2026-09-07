import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/theme/colors";
import { AUTH_CALLBACK_SCHEME, buildFacebookAuthUrl, buildGoogleAuthUrl } from "@/config/oauth";
import { parseQueryParams } from "@/utils/url";

// Facebook: opens the real Facebook OAuth dialog in an in-app browser tab
// (expo-web-browser), watching for the redirect back to theomy://auth-callback.
// Requires a NEW backend route — see BACKEND_REQUIREMENTS.md — that redirects
// there with the token instead of back to the web frontend. Until that
// backend route exists, this will open Facebook fine but fail to complete
// the loop back into the app.
//
// Google: no confirmed OAuth initiation URL yet (no network capture from
// the site's "Continue with Google" button) — still a placeholder.
export default function SocialLoginRow() {
  const { loginWithOAuthToken } = useAuth();
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(null);

  const handleFacebook = async () => {
    setLoadingProvider("facebook");
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        buildFacebookAuthUrl(),
        AUTH_CALLBACK_SCHEME
      );
      if (result.type === "success" && result.url) {
        const params = parseQueryParams(result.url);
        if (params.token) {
          await loginWithOAuthToken(params.token, {
            id: params.user_id || params.email,
            name: params.name || "",
            email: params.email || "",
          });
        } else {
          Alert.alert(
            "Setup incomplete",
            "Facebook login opened the browser, but the app didn't get a token back — the backend mobile callback route hasn't been added yet (see BACKEND_REQUIREMENTS.md)."
          );
        }
      }
    } catch (e) {
      Alert.alert("Something went wrong", "Couldn't start Facebook login.");
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleGoogle = async () => {
    setLoadingProvider("google");
    try {
      const result = await WebBrowser.openAuthSessionAsync(
        buildGoogleAuthUrl(),
        AUTH_CALLBACK_SCHEME
      );
      if (result.type === "success" && result.url) {
        const params = parseQueryParams(result.url);
        if (params.token) {
          await loginWithOAuthToken(params.token, {
            id: params.user_id || params.email,
            name: params.name || "",
            email: params.email || "",
          });
        } else {
          Alert.alert(
            "Setup incomplete",
            "Google login opened the browser, but the app didn't get a token back — the backend mobile callback route hasn't been added yet (see BACKEND_REQUIREMENTS.md)."
          );
        }
      }
    } catch (e) {
      Alert.alert("Something went wrong", "Couldn't start Google login.");
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.circle, styles.googleCircle]}
        onPress={handleGoogle}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === "google" ? (
          <ActivityIndicator color="#4285F4" size="small" />
        ) : (
          <Text style={styles.googleG}>G</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.circle, styles.facebookCircle]}
        onPress={handleFacebook}
        disabled={loadingProvider !== null}
      >
        {loadingProvider === "facebook" ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.facebookF}>f</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 16 },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  googleCircle: { backgroundColor: "#fff" },
  googleG: { color: "#4285F4", fontSize: 20, fontWeight: "800" },
  facebookCircle: { backgroundColor: "#1877F2" },
  facebookF: { color: "#fff", fontSize: 20, fontWeight: "800" },
});

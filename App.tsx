import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthContext";
import RootNavigator from "@/navigation/RootNavigator";
import IntroAnimation from "@/components/IntroAnimation";
import { COLORS } from "@/theme/colors";

export default function App() {
  // Shown once per app launch, right after the native splash screen
  // (app.json's `splash` key) disappears — a ~3s branded reveal before the
  // real app (Login screen, or the signed-in tabs) appears. AuthProvider
  // stays mounted underneath the whole time, so the stored-token session
  // check runs in the background during the animation instead of adding
  // its own separate loading flash afterward.
  const [showIntro, setShowIntro] = useState(true);

  return (
    // An explicit flex:1 root with theomy's own background color, painted
    // BEFORE anything else — a real device/emulator run showed a brief
    // black band (Android's default window background) behind the status
    // bar and a hard seam where IntroAnimation's own background took over,
    // rather than one seamless colour top to bottom. AuthProvider is a
    // context provider with no View of its own, so IntroAnimation's
    // absolute-fill styling had no definite-sized, correctly-coloured
    // ancestor to size against until this wrapper existed.
    <View style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          {showIntro ? (
            <IntroAnimation onFinish={() => setShowIntro(false)} />
          ) : (
            <RootNavigator />
          )}
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
});

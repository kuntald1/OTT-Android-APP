import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/theme/colors";

// The icon file (assets/app-icon.png) is an opaque PNG with its OWN wine-red
// background baked in — it's built as an Android adaptive-icon foreground
// layer, not a general-purpose transparent image (see the borderRadius
// removal note below, and the logo/BG_MATCH note further down). Any
// background this screen paints has to match that baked-in color closely
// or a visible rectangle shows where the two meet — sampled directly from
// the actual file (average of ~90 border pixels, std dev ~3-5 per
// channel, so a flat fill is a faithful match, not an approximation of a
// visibly-varying gradient).
const BG_MATCH = "#4C1E24";

// ---------------------------------------------------------------------------
// IntroAnimation — brief branded reveal shown once at app launch, after the
// native splash screen (app.json's `splash` key) disappears and before the
// real app (Login screen, or the signed-in tabs) appears.
//
// Modeled on the reference the user shared (JioHotstar's launch animation,
// reviewed frame-by-frame from their video): a logo spins in place with a
// shimmer/glint, then the wordmark fades in below it, holds, then the
// whole thing fades to reveal the app. This version keeps that STRUCTURE
// but uses theomy's own burgundy/gold palette rather than copying
// JioHotstar's blue-purple-pink gradient and metallic star — a splash
// screen is brand identity, and matching a competitor's colors/shape
// exactly wouldn't be right even at this small a scale. What's genuinely
// reproduced is the spin-with-shimmer + delayed wordmark-reveal shape of
// the animation. A literal glossy 3D-faceted spin (light catching
// individual facets as the star rotates in true 3D) isn't achievable with
// RN's own Animated API — that needs a 3D renderer (Skia/Three.js), a new
// dependency this pass deliberately avoids (see this file's git history
// for why: this session was mid-troubleshooting a native-rebuild cycle
// when this was requested). What's built here fakes the shimmer with an
// opacity/highlight sweep instead, which reads similarly at this size and
// duration without needing one.
// ---------------------------------------------------------------------------

const SPIN_DURATION = 1700; // logo spins in place, shimmering
const TEXT_REVEAL_DURATION = 450; // wordmark fades/slides in below it
const HOLD_DURATION = 550; // sits still, fully visible
const FADE_DURATION = 500; // whole screen fades out
// ~1700 + 450 + 550 + 500 ≈ 3200ms total — matches the "~3 sec" ask; trim
// SPIN_DURATION down if it needs to land closer to exactly 3000ms.

export default function IntroAnimation({ onFinish }: { onFinish: () => void }) {
  const spin = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo appears and spins in place — three full turns, slowing into
      // the last one (Easing.out) rather than a constant speed, so it
      // feels like it's settling rather than just stopping abruptly.
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: SPIN_DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(spin, {
          toValue: 1,
          duration: SPIN_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // The "shimmer": a highlight sweeps across the logo twice while it
        // spins, faking the glint of light catching a rotating metallic
        // surface (see this file's header comment on why it's approximated
        // rather than a true 3D-faceted render).
        Animated.loop(
          Animated.sequence([
            Animated.timing(shimmer, { toValue: 1, duration: SPIN_DURATION / 4, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(shimmer, { toValue: 0, duration: SPIN_DURATION / 4, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
          { iterations: 2 }
        ),
      ]),
      // Wordmark fades/slides in below the now-settled logo.
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: TEXT_REVEAL_DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: TEXT_REVEAL_DURATION,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(HOLD_DURATION),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: FADE_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  const rotateY = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "1080deg"], // three full spins
  });
  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] });

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <View style={styles.center}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ perspective: 800 }, { scale: logoScale }, { rotateY }],
          }}
        >
          <Image source={require("../../assets/app-icon.png")} style={styles.logo} resizeMode="contain" />
          <Animated.View pointerEvents="none" style={[styles.shimmerOverlay, { opacity: shimmerOpacity }]} />
        </Animated.View>

        <Animated.Text
          style={[styles.brand, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}
        >
          THEOMY
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG_MATCH,
  },
  center: { alignItems: "center", justifyContent: "center" },
  // No borderRadius here — app-icon.png is an Android adaptive-icon
  // FOREGROUND layer, not a general-purpose transparent image: the OS
  // masks it into a circle/squircle itself on the home screen, but the
  // raw file underneath is an opaque square (a solid black fill outside
  // the mask artwork, confirmed from a real device screenshot). Clipping
  // it to a circle here doesn't remove that fill — it just crops a
  // visible black disc out of the square, which is what showed up.
  // Showing it at its natural square shape avoids that; if a properly
  // transparent app image is ever exported, a rounded/circular version
  // can come back.
  // Sized to the source file's own aspect ratio (1264x841 ≈ 1.5:1, not
  // square) — a mismatched box would letterbox and, before the background
  // fix above, that gap was part of what made the icon look "boxed in".
  logo: { width: 260, height: 173 },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.goldLight,
  },
  brand: {
    marginTop: 20,
    color: COLORS.gold,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
});

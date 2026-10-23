import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "@/theme/colors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// A row-style section that shows just its title + a one-line summary by
// default, expanding to show the full content when the chevron is tapped.
// Designed to be stacked with other CollapsibleSections inside one shared
// card container (see the `divider` prop) rather than standing alone.
export default function CollapsibleSection({
  title,
  summary,
  children,
  defaultExpanded = false,
  divider = true,
  premium = false,
  icon,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  divider?: boolean;
  // premium: renders as its own standalone card (gold hairline border,
  // icon badge, round animated chevron). Default false = the original
  // flat row, so other screens (e.g. Ticketing filters) are unchanged.
  premium?: boolean;
  icon?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rotate = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotate, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [expanded, rotate]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, "easeInEaseOut", "opacity"));
    setExpanded((e) => !e);
  };

  if (premium) {
    const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
    return (
      <LinearGradient
        colors={["rgba(232,193,113,0.75)", "rgba(212,175,55,0.15)", "rgba(232,193,113,0.45)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pBorder}
      >
        <LinearGradient
          colors={["#4a0a1c", "#2c0610"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pCard}
        >
          <TouchableOpacity style={styles.pHeader} onPress={toggle} activeOpacity={0.8}>
            {icon ? (
              <LinearGradient
                colors={["rgba(232,193,113,0.35)", "rgba(212,175,55,0.08)"]}
                style={styles.pIconBadge}
              >
                <Text style={styles.pIconText}>{icon}</Text>
              </LinearGradient>
            ) : null}
            <View style={styles.headerText}>
              <Text style={styles.pTitle}>{title}</Text>
              {!expanded && summary ? (
                <Text style={styles.pSummary} numberOfLines={1}>
                  {summary}
                </Text>
              ) : null}
            </View>
            <View style={styles.pChevronWrap}>
              <Animated.Text style={[styles.pChevron, { transform: [{ rotate: spin }] }]}>⌄</Animated.Text>
            </View>
          </TouchableOpacity>
          {expanded && <View style={styles.pContent}>{children}</View>}
        </LinearGradient>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, divider && styles.divider]}>
      <TouchableOpacity style={styles.header} onPress={toggle}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {!expanded && summary ? (
            <Text style={styles.summary} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerText: { flex: 1, marginRight: 12 },
  title: { color: COLORS.cream, fontSize: 16, fontWeight: "700" },
  summary: { color: COLORS.cream, opacity: 0.6, fontSize: 12, marginTop: 2 },
  chevron: { color: COLORS.gold, fontSize: 14 },
  content: { paddingBottom: 12 },
  // ---- premium variant ----
  pBorder: {
    borderRadius: 20,
    padding: 1.2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  pCard: { borderRadius: 19, overflow: "hidden" },
  pHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  pIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(232,193,113,0.45)",
  },
  pIconText: { fontSize: 20 },
  pTitle: { color: COLORS.cream, fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
  pSummary: { color: COLORS.cream, opacity: 0.6, fontSize: 12, marginTop: 3 },
  pChevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212,175,55,0.14)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.4)",
  },
  pChevron: { color: COLORS.gold, fontSize: 20, lineHeight: 22, fontWeight: "700", marginTop: -4 },
  pContent: {
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(232,193,113,0.25)",
  },
});

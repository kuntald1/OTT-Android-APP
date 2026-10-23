import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import ProfileMenuModal from "@/components/ProfileMenuModal";

// theomy wordmark, a search icon that expands into an input, and a
// Play/Archive pill switcher on its own row underneath (shown on the Home
// and Archive screens). Profile menu lives on the bottom tab bar.
export default function AppHeader({
  activeRoute,
  onSearch,
  showSwitcher = false,
}: {
  activeRoute: string;
  onSearch?: (query: string) => void;
  showSwitcher?: boolean;
}) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { hasPlay, hasArchive, isSubscribed } = useSubscriptionAccess();
  // Which pill the person tapped without having access (null = no alert).
  const [lockedPill, setLockedPill] = useState<"Play" | "Archive" | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    onSearch?.("");
  };

  const renderPill = (label: string, active: boolean, onPress: () => void) =>
    active ? (
      <TouchableOpacity key={label} onPress={onPress}>
        <LinearGradient
          colors={[COLORS.goldLight, COLORS.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.pillActive}
        >
          <Text style={styles.pillTextActive}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity key={label} style={styles.pill} onPress={onPress}>
        <Text style={styles.pillText}>{label}</Text>
      </TouchableOpacity>
    );

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      {searchOpen ? (
        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Text style={styles.searchIconSmall}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#c9a9a9"
              value={query}
              autoFocus
              onChangeText={(text) => {
                setQuery(text);
                onSearch?.(text);
              }}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.closeSearchButton} onPress={closeSearch}>
            <Text style={styles.closeSearchIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.topRow}>
            <Text style={styles.brandMark}>theomy</Text>

            <View style={styles.topRightGroup}>
              <TouchableOpacity style={styles.searchIconButton} onPress={() => setSearchOpen(true)}>
                <Text style={styles.searchIcon}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarButton} onPress={() => setProfileMenuVisible(true)}>
                <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || "?"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showSwitcher && (
            // Both pills are always shown. Tapping one the person has no
            // access to (no plan at all, or a plan without that section)
            // opens the "subscribe?" alert instead of navigating.
            <View style={styles.switcherRow}>
              {renderPill("Play", activeRoute === "Plays", () => {
                if (isSubscribed === false || !hasPlay) setLockedPill("Play");
                else navigation.navigate("MainTabs", { screen: "Home" });
              })}
              {renderPill("Archive", activeRoute === "Archive", () => {
                if (isSubscribed === false || !hasArchive) setLockedPill("Archive");
                else navigation.navigate("MainTabs", { screen: "ArchiveTab" });
              })}
            </View>
          )}
        </>
      )}

      <Modal visible={lockedPill !== null} transparent animationType="fade" onRequestClose={() => setLockedPill(null)}>
        <View style={styles.alertBackdrop}>
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Subscription required</Text>
            <Text style={styles.alertBody}>
              {isSubscribed === false
                ? `You don't have an active plan yet. Subscribe to watch ${lockedPill}.`
                : `${lockedPill} isn't included in your current plan. View plans to get access?`}
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity style={styles.alertNo} onPress={() => setLockedPill(null)}>
                <Text style={styles.alertNoText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setLockedPill(null);
                  navigation.navigate("SubscriptionPlans");
                }}
              >
                <LinearGradient
                  colors={[COLORS.goldLight, COLORS.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.alertYes}
                >
                  <Text style={styles.alertYesText}>Yes, view plans</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ProfileMenuModal visible={profileMenuVisible} onClose={() => setProfileMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: "transparent" },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  brandMark: { color: COLORS.gold, fontSize: 22, fontWeight: "800", textTransform: "uppercase" },
  topRightGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: COLORS.ctaText, fontSize: 13, fontWeight: "700" },
  switcherRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  pill: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  pillActive: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pillText: { ...TYPE.label, fontSize: 15, color: COLORS.cream },
  pillTextActive: { ...TYPE.label, fontSize: 15, fontWeight: "800", color: COLORS.ctaText },
  searchIconButton: { padding: 6 },
  searchIcon: { fontSize: 18, opacity: 0.85 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
  },
  searchIconSmall: { fontSize: 14, opacity: 0.8 },
  searchInput: { flex: 1, color: COLORS.cream, paddingVertical: 8, fontSize: 14, marginLeft: 6 },
  closeSearchButton: { padding: 6 },
  closeSearchIcon: { color: COLORS.cream, fontSize: 16 },
  alertBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center", padding: 28 },
  alertCard: { width: "100%", maxWidth: 360, backgroundColor: "#2a0610", borderRadius: 18, padding: 22, borderWidth: 1, borderColor: "rgba(212,175,55,0.3)" },
  alertTitle: { color: COLORS.cream, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  alertBody: { color: COLORS.cream, opacity: 0.8, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  alertButtons: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12 },
  alertNo: { paddingHorizontal: 14, paddingVertical: 10 },
  alertNoText: { color: COLORS.cream, opacity: 0.7, fontSize: 14, fontWeight: "600" },
  alertYes: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: RADIUS.pill },
  alertYesText: { color: COLORS.ctaText, fontSize: 14, fontWeight: "800" },
});

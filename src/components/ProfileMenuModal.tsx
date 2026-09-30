import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/theme/colors";

const BASE_MENU: { label: string; route: string }[] = [
  { label: "Manage Profile", route: "ManageProfile" },
  { label: "Watch History", route: "WatchHistory" },
  { label: "Subscription Plans", route: "SubscriptionPlans" },
  { label: "Help Center", route: "HelpCenter" },
];

// Not a real screen — intercepted in the onPress handler below to open
// "Who's watching?" instead of navigating.
const SWITCH_ACCOUNT_ROUTE = "__SWITCH_ACCOUNT__";

// Shown only for the "plays_organiser" role, matching the web app's profile
// dropdown — placed after Help Center and before the user/logout block.
// "My Live Events", "Revenue", and "Event Listing Enquiry" are commented
// out (not deleted) per request — the screens/routes themselves still
// exist and work, they're just not linked from this menu for now.
const ORGANISER_MENU: { label: string; route: string }[] = [
  // { label: "My Video List", route: "MyVideoList" },
  { label: "My Live Events", route: "MyLiveEvents" },
  // { label: "Revenue", route: "Revenue" },
  // { label: "Event Listing Enquiry", route: "EventListingEnquiry" },
];

// Opened from the profile avatar in AppHeader's top-right corner — the
// dropdown anchors under that same corner (not centered/bottom), so it
// visually reads as coming from where the avatar was tapped.
export default function ProfileMenuModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const navigation = useNavigation<any>();
  const { user, logout, hasFamily, openFamilyPicker } = useAuth();
  const insets = useSafeAreaInsets();

  // A family sub-account shares its parent's plan and can't buy/change one, so
  // the plans entry is left out for it (see SubscriptionPlansScreen).
  const menuItems = user?.parent_id
    ? BASE_MENU.filter((item) => item.route !== "SubscriptionPlans")
    : [...BASE_MENU];
  if (user?.role === "plays_organiser") {
    menuItems.push(...ORGANISER_MENU);
  }
  // "Switch account" ("Who's watching?") — right after Manage Profile,
  // before Watch History, matching the web app's dropdown order exactly.
  // Only shown when this account actually has a family to switch to.
  if (hasFamily) {
    const manageProfileIndex = menuItems.findIndex((item) => item.route === "ManageProfile");
    menuItems.splice(manageProfileIndex + 1, 0, { label: "Switch account", route: SWITCH_ACCOUNT_ROUTE });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { paddingTop: insets.top + 56 }]}
        onPress={onClose}
      >
        <View style={styles.card}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.item}
              onPress={() => {
                onClose();
                if (item.route === SWITCH_ACCOUNT_ROUTE) {
                  openFamilyPicker();
                } else {
                  navigation.navigate(item.route);
                }
              }}
            >
              <Text style={styles.itemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.divider} />

          <View style={styles.userBlock}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user.role}</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onClose();
              logout();
            }}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "flex-end",
    paddingRight: 16,
  },
  card: {
    backgroundColor: COLORS.burgundyDark,
    borderRadius: 12,
    paddingVertical: 8,
    width: 240,
  },
  item: { paddingHorizontal: 16, paddingVertical: 12 },
  itemText: { color: COLORS.gold, fontSize: 15 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: 4,
  },
  userBlock: { paddingHorizontal: 16, paddingVertical: 8 },
  userName: { color: COLORS.cream, fontWeight: "700", fontSize: 15 },
  userEmail: { color: COLORS.cream, opacity: 0.7, fontSize: 13, marginTop: 2 },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(212,175,55,0.2)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  roleBadgeText: { color: COLORS.gold, fontSize: 11, textTransform: "capitalize" },
  logoutText: { color: COLORS.burgundyLight, fontSize: 15, fontWeight: "600" },
});

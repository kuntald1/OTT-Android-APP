import React from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/theme/colors";

const BASE_MENU: { label: string; route: string }[] = [
  { label: "Manage Profile", route: "ManageProfile" },
  { label: "Watch History", route: "WatchHistory" },
  { label: "Subscription Plans", route: "SubscriptionPlans" },
  { label: "Help Center", route: "HelpCenter" },
];

// "Request as Organiser" only makes sense for a plain "user" — someone
// already approved as plays_organiser (or content_creator) doesn't need it.
const REQUEST_ORGANISER_ITEM = { label: "Request as Organiser", route: "RequestOrganiser" };

// Shown only for the "plays_organiser" role, matching the web app's profile
// dropdown — placed after Help Center and before the user/logout block.
const ORGANISER_MENU: { label: string; route: string }[] = [
  { label: "My Video List", route: "MyVideoList" },
  { label: "My Live Events", route: "MyLiveEvents" },
  { label: "Revenue", route: "Revenue" },
  { label: "Event Listing Enquiry", route: "EventListingEnquiry" },
];

// Now opened from the bottom-right profile avatar (bottom tab bar) instead
// of a top hamburger menu.
export default function ProfileMenuModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();

  const menuItems = [...BASE_MENU];
  if (!user?.role || user.role === "user") {
    menuItems.splice(2, 0, REQUEST_ORGANISER_ITEM);
  }
  if (user?.role === "plays_organiser") {
    menuItems.push(...ORGANISER_MENU);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.item}
              onPress={() => {
                onClose();
                navigation.navigate(item.route);
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
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingRight: 12,
    paddingBottom: 78,
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

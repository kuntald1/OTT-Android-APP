import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import PlaysBrowseScreen from "@/screens/PlaysBrowseScreen";
import CommunityScreen from "@/screens/CommunityScreen";
import TicketingScreen from "@/screens/TicketingScreen";
import MyListScreen from "@/screens/MyListScreen";
import ArchiveScreen from "@/screens/ArchiveScreen";
import CategoriesScreen from "@/screens/CategoriesScreen";
import ProfileMenuModal from "@/components/ProfileMenuModal";
import { useAuth } from "@/context/AuthContext";
import { COLORS, ELEVATION, TYPE } from "@/theme";

const Tab = createBottomTabNavigator();

// The 5th "tab" is actually a button: tapping it opens the profile menu
// modal instead of navigating to a screen (tabBarButton override below).
function ProfileTabPlaceholder() {
  return <View />;
}

export default function MainTabs() {
  const { user } = useAuth();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.burgundyMuted,
            borderTopColor: "rgba(255,255,255,0.1)",
            ...ELEVATION.bar,
            height: 70,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarActiveTintColor: COLORS.gold,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: { ...TYPE.caption },
        }}
      >
        <Tab.Screen
          name="Home"
          component={PlaysBrowseScreen}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="CommunityTab"
          component={CommunityScreen}
          options={{
            title: "Community",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                size={26}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="TicketingTab"
          component={TicketingScreen}
          options={{
            title: "Ticketing",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "ticket" : "ticket-outline"} size={26} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="CategoriesTab"
          component={CategoriesScreen}
          options={{
            title: "Categories",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "grid" : "grid-outline"} size={26} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="ListTab"
          component={MyListScreen}
          options={{
            title: "List",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "bookmark" : "bookmark-outline"} size={26} color={color} />
            ),
          }}
        />
        {/* Reached only via the Play/Archive pill in AppHeader (not a
            bottom-bar icon) — being inside this Tab.Navigator is what makes
            the bottom bar itself show up while browsing Archive, matching
            Home. tabBarButton: null hides it from the bar without removing
            the screen from the navigator. Its own tabBarStyle/tint colors
            switch the bar to Archive's sepia sub-theme while it's focused,
            instead of the burgundy used by every other tab. */}
        <Tab.Screen
          name="ArchiveTab"
          component={ArchiveScreen}
          options={{
            tabBarButton: () => null,
            tabBarStyle: {
              backgroundColor: COLORS.archiveMid,
              borderTopColor: "rgba(255,255,255,0.1)",
              ...ELEVATION.bar,
              height: 70,
              paddingBottom: 10,
              paddingTop: 8,
            },
            tabBarActiveTintColor: COLORS.archiveGold,
            tabBarInactiveTintColor: "rgba(245,235,221,0.5)",
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileTabPlaceholder}
          options={{
            title: "",
            tabBarButton: (props) => (
              <TouchableOpacity
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                onPress={() => setProfileMenuVisible(true)}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: COLORS.gold,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: COLORS.ctaText, fontSize: 13, fontWeight: "700" }}>
                    {user?.name?.[0]?.toUpperCase() || "?"}
                  </Text>
                </View>
              </TouchableOpacity>
            ),
          }}
        />
      </Tab.Navigator>

      <ProfileMenuModal visible={profileMenuVisible} onClose={() => setProfileMenuVisible(false)} />
    </>
  );
}

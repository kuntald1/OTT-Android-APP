import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import PlaysBrowseScreen from "@/screens/PlaysBrowseScreen";
import CommunityScreen from "@/screens/CommunityScreen";
import TicketingScreen from "@/screens/TicketingScreen";
import MyListScreen from "@/screens/MyListScreen";
import ArchiveScreen from "@/screens/ArchiveScreen";
import CategoriesScreen from "@/screens/CategoriesScreen";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { COLORS, ELEVATION, TYPE } from "@/theme";

const Tab = createBottomTabNavigator();

// Order: Home, List, Community, Category, Shows (was Ticketing) — the
// profile avatar now lives in AppHeader (top-right) instead of being a
// 6th bottom-tab item, so this navigator only has real destinations.
export default function MainTabs() {
  const { hasPlay, hasArchive } = useSubscriptionAccess();
  // An Archive-only plan (no Play access) should land the person on
  // Archive when they tap Home — there is nothing for them on the
  // Play screen otherwise. Every other case (Both, Play-only, no
  // active subscription) keeps Home as Play, unchanged.
  const HomeComponent = hasArchive && !hasPlay ? ArchiveScreen : PlaysBrowseScreen;

  return (
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
        component={HomeComponent}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
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
        name="CategoriesTab"
        component={CategoriesScreen}
        options={{
          title: "Category",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TicketingTab"
        component={TicketingScreen}
        options={{
          title: "Shows",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "ticket" : "ticket-outline"} size={26} color={color} />
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
    </Tab.Navigator>
  );
}

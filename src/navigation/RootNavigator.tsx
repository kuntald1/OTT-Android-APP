import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/context/AuthContext";
import LoginScreen from "@/screens/LoginScreen";
import RegisterScreen from "@/screens/RegisterScreen";
import OtpLoginScreen from "@/screens/OtpLoginScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import MainTabs from "@/navigation/MainTabs";
import OrganisersScreen from "@/screens/OrganisersScreen";
import RoomDetailScreen from "@/screens/RoomDetailScreen";
import TicketDetailScreen from "@/screens/TicketDetailScreen";
import BlogDetailScreen from "@/screens/BlogDetailScreen";
import VideoDetailScreen from "@/screens/VideoDetailScreen";
import FilteredVideosScreen from "@/screens/FilteredVideosScreen";
import VideoPlayerScreen from "@/screens/VideoPlayerScreen";
import PersonDetailScreen from "@/screens/PersonDetailScreen";
import PlaceholderScreen from "@/screens/PlaceholderScreen";
import MyLiveEventsScreen from "@/screens/MyLiveEventsScreen";
import ManageProfileScreen from "@/screens/ManageProfileScreen";
import WatchHistoryScreen from "@/screens/WatchHistoryScreen";
import RequestOrganiserScreen from "@/screens/RequestOrganiserScreen";
import HelpCenterScreen from "@/screens/HelpCenterScreen";
import SubscriptionPlansScreen from "@/screens/SubscriptionPlansScreen";
import RevenueScreen from "@/screens/RevenueScreen";
import { COLORS } from "@/theme/colors";

const Stack = createNativeStackNavigator();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    primary: COLORS.gold,
    card: COLORS.burgundyMuted,
    text: COLORS.cream,
  },
};

// Nav-bar destinations and profile-menu destinations that aren't built yet
// render PlaceholderScreen so tapping them never dead-ends or crashes.
const STUB_ROUTES = ["MyVideoList", "EventListingEnquiry"];

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.burgundyMuted },
        headerTintColor: COLORS.cream,
      }}
    >
      {/* MainTabs (Home/Community/Ticketing/List + profile, and the
          hidden Archive tab reached via the header's Play/Archive pill)
          is the bottom tab bar shown after login. Everything else here is
          a full-screen push on top of it — VideoDetail, etc. */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="BlogDetail" component={BlogDetailScreen} options={{ title: "" }} />
      <Stack.Screen name="Organisers" component={OrganisersScreen} options={{ title: "Organisers" }} />
      <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: "Room" }} />
      <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: "" }} />
      <Stack.Screen name="VideoDetail" component={VideoDetailScreen} options={{ title: "" }} />
      <Stack.Screen
        name="FilteredVideos"
        component={FilteredVideosScreen}
        options={({ route }: any) => ({ title: route.params?.title || "" })}
      />
      <Stack.Screen name="PersonDetail" component={PersonDetailScreen} options={{ title: "" }} />
      <Stack.Screen
        name="VideoPlayer"
        component={VideoPlayerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MyLiveEvents"
        component={MyLiveEventsScreen}
        options={{ title: "My Live Events" }}
      />
      <Stack.Screen
        name="ManageProfile"
        component={ManageProfileScreen}
        options={{ title: "Manage Profile" }}
      />
      <Stack.Screen
        name="WatchHistory"
        component={WatchHistoryScreen}
        options={{ title: "Watch History" }}
      />
      <Stack.Screen
        name="RequestOrganiser"
        component={RequestOrganiserScreen}
        options={{ title: "Request as Organiser" }}
      />
      <Stack.Screen
        name="HelpCenter"
        component={HelpCenterScreen}
        options={{ title: "Help Center" }}
      />
      <Stack.Screen
        name="SubscriptionPlans"
        component={SubscriptionPlansScreen}
        options={{ title: "Subscription Plans" }}
      />
      <Stack.Screen name="Revenue" component={RevenueScreen} options={{ title: "Revenue" }} />
      {STUB_ROUTES.map((route) => (
        <Stack.Screen key={route} name={route} component={PlaceholderScreen} />
      ))}
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OtpLogin" component={OtpLoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

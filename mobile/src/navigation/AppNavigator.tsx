import { Pressable, Text, View } from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { RootStackParamList } from "./types";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { useRealtime } from "../hooks/useRealtime";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { AlertsScreen } from "../screens/alerts/AlertsScreen";
import { HistoryScreen } from "../screens/alerts/HistoryScreen";
import { IncidentDetailScreen } from "../screens/alerts/IncidentDetailScreen";
import { NotificationsScreen } from "../screens/alerts/NotificationsScreen";
import { CamerasScreen } from "../screens/cameras/CamerasScreen";
import { CameraDetailScreen } from "../screens/cameras/CameraDetailScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { Loading } from "../components/ui";
import { Toast } from "../components/Toast";
import { theme, radius } from "../theme";
const Root = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();
const ref = createNavigationContainerRef<RootStackParamList>();
const tabIcons = {
  Home: "home-outline",
  Alerts: "warning-outline",
  Cameras: "videocam-outline",
  Profile: "person-outline",
} as const;
function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { borderTopColor: theme.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={tabIcons[route.name as keyof typeof tabIcons]}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Alerts" component={AlertsScreen} />
      <Tabs.Screen name="Cameras" component={CamerasScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}
/** Header bell with the unread notification badge. */
function NotificationBell() {
  const unread = useNotificationStore((s) => s.unread);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ""}`}
      onPress={() => {
        if (ref.isReady()) ref.navigate("Notifications");
      }}
      style={{ padding: 6 }}
    >
      <Ionicons name="notifications-outline" size={24} color={theme.text} />
      {unread > 0 && (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            minWidth: 18,
            paddingHorizontal: 4,
            borderRadius: radius.pill,
            backgroundColor: theme.critical,
            alignItems: "center",
          }}
        >
          <Text
            style={{ color: theme.onPrimary, fontSize: 11, fontWeight: "800" }}
          >
            {unread > 99 ? "99+" : unread}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
export function AppNavigator() {
  const { user, ready } = useAuthStore();
  useRealtime();
  if (!ready) return <Loading />;
  return (
    <View style={{ flex: 1 }}>
      {!user ? (
        <LoginScreen />
      ) : (
        <NavigationContainer ref={ref}>
          <Root.Navigator
            screenOptions={{
              headerTintColor: theme.text,
              headerStyle: { backgroundColor: theme.surface },
              contentStyle: { backgroundColor: theme.background },
            }}
          >
            <Root.Screen
              name="Main"
              component={MainTabs}
              options={{
                title: "Pool Safety",
                headerRight: () => <NotificationBell />,
              }}
            />
            <Root.Screen
              name="IncidentDetail"
              component={IncidentDetailScreen}
              options={{ title: "Incident detail" }}
            />
            <Root.Screen
              name="CameraDetail"
              component={CameraDetailScreen}
              options={{ title: "Camera detail" }}
            />
            <Root.Screen name="Notifications" component={NotificationsScreen} />
            <Root.Screen
              name="History"
              component={HistoryScreen}
              options={{ title: "Incident history" }}
            />
          </Root.Navigator>
        </NavigationContainer>
      )}
      <Toast
        openIncident={(id) => {
          if (user && ref.isReady()) ref.navigate("IncidentDetail", { id });
        }}
      />
    </View>
  );
}

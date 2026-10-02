import { useEffect } from "react";
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
import { useUiStore } from "../stores/uiStore";
import { useRealtime } from "../hooks/useRealtime";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { AlertsScreen } from "../screens/alerts/AlertsScreen";
import { IncidentDetailScreen } from "../screens/alerts/IncidentDetailScreen";
import { NotificationsScreen } from "../screens/alerts/NotificationsScreen";
import { CamerasScreen } from "../screens/cameras/CamerasScreen";
import { CameraDetailScreen } from "../screens/cameras/CameraDetailScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { Loading } from "../components/ui";
import { theme } from "../theme";
const Root = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();
const ref = createNavigationContainerRef<RootStackParamList>();
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
            name={
              route.name === "Home"
                ? "home-outline"
                : route.name === "Alerts"
                  ? "warning-outline"
                  : route.name === "Cameras"
                    ? "videocam-outline"
                    : "person-outline"
            }
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
function History() {
  return <AlertsScreen history />;
}
export function AppNavigator() {
  const { user, ready } = useAuthStore();
  const toast = useUiStore((s) => s.toast);
  const incidentId = useUiStore((s) => s.toastIncidentId);
  useRealtime();
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => useUiStore.setState({ toast: null, toastIncidentId: null }),
      8000,
    );
    return () => clearTimeout(timer);
  }, [toast]);
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
                headerRight: () => (
                  <Ionicons name="water" size={22} color={theme.primary} />
                ),
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
              component={History}
              options={{ title: "Incident history" }}
            />
          </Root.Navigator>
        </NavigationContainer>
      )}
      {toast && (
        <Pressable
          style={{
            position: "absolute",
            top: 60,
            left: 16,
            right: 16,
            padding: 18,
            borderRadius: 12,
            backgroundColor: incidentId ? theme.critical : theme.text,
            elevation: 6,
          }}
          onPress={() => {
            if (user && incidentId && ref.isReady())
              ref.navigate("IncidentDetail", { id: incidentId });
            useUiStore.setState({ toast: null, toastIncidentId: null });
          }}
        >
          <Text
            accessibilityRole="alert"
            style={{ color: "white", fontWeight: "700" }}
          >
            {toast}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

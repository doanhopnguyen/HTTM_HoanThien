import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { restoreAuth } from "./src/stores/authStore";
import { configured } from "./src/api/client";
import {
  InAppNotificationProvider,
  setNotificationProvider,
} from "./src/services/pushNotifications";
import { styles } from "./src/components/ui";
// Foreground in-app delivery; replace with an FCM/APNs provider for background push.
setNotificationProvider(new InAppNotificationProvider());
/** Shown instead of the app when the build has no usable backend address. */
function MissingConfiguration() {
  return (
    <View style={[styles.screen, styles.content, { justifyContent: "center" }]}>
      <Text style={styles.title}>Backend not configured</Text>
      <Text style={styles.text}>
        Set EXPO_PUBLIC_API_BASE_URL in mobile/.env to the backend origin, for
        example http://192.168.1.100:8080 (phone on the same Wi-Fi) or
        http://10.0.2.2:8080 (Android emulator), then restart Metro or rebuild
        the app.
      </Text>
    </View>
  );
}
export default function App() {
  useEffect(() => {
    if (configured) void restoreAuth();
  }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <StatusBar style="dark" />
        {configured ? <AppNavigator /> : <MissingConfiguration />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

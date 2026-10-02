import { useEffect } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { restoreAuth } from "./src/stores/authStore";
export default function App() {
  useEffect(() => {
    void restoreAuth().catch(() => undefined);
  }, []);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <StatusBar style="dark" />
        <AppNavigator />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

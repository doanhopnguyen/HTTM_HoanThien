import { useState } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../navigation/types";
import { api } from "../../api/client";
import { errorMessage } from "@pool-safety/shared";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import { useNotificationStore } from "../../stores/notificationStore";
import {
  Screen,
  styles,
  Button,
  Input,
  Field,
  DetailRow,
} from "../../components/ui";
import { theme } from "../../theme";
export function ProfileScreen() {
  const user = useAuthStore((s) => s.user)!;
  const unread = useNotificationStore((s) => s.unread);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [changing, setChanging] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function change() {
    setBusy(true);
    setError("");
    try {
      await api.auth.changePassword(current, password);
      useUiStore
        .getState()
        .notify("Password changed. Please sign in again.", "success");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Your account and activity</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>{user.fullName}</Text>
        <DetailRow label="Username" value={user.username} />
        <DetailRow label="Email" value={user.email} />
        <DetailRow label="Role" value={user.role} />
      </View>
      <Button
        label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        secondary
        onPress={() => navigation.navigate("Notifications")}
      />
      <Button
        label="Incident history"
        secondary
        onPress={() => navigation.navigate("History")}
      />
      <Button
        label="Change password"
        secondary
        onPress={() => setChanging(!changing)}
      />
      {changing && (
        <View style={[styles.card, { marginTop: 18 }]}>
          <Field label="Current password">
            <Input value={current} onChangeText={setCurrent} secureTextEntry />
          </Field>
          <Field label="New password (10–72 characters)">
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              maxLength={72}
            />
          </Field>
          <Text style={styles.muted}>
            Changing your password signs out all sessions.
          </Text>
          {error && (
            <Text accessibilityRole="alert" style={{ color: theme.critical }}>
              {error}
            </Text>
          )}
          <Button
            label="Save password"
            disabled={busy || !current || password.length < 10}
            onPress={() => void change()}
          />
        </View>
      )}
      <Button
        label="Sign out"
        danger
        disabled={busy}
        onPress={() =>
          void api.auth
            .logout()
            .catch((e) =>
              useUiStore.getState().notify(errorMessage(e), "critical"),
            )
        }
      />
    </Screen>
  );
}

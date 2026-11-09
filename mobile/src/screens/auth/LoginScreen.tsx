import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from "react-native";
import { errorMessage } from "@pool-safety/shared";
import { api, baseUrl } from "../../api/client";
import { restoreAuth, useAuthStore } from "../../stores/authStore";
import { Button, Field, Input, Screen, styles } from "../../components/ui";
import { theme } from "../../theme";
const logo = require("../../../assets/icon.png");
export function LoginScreen() {
  const offline = useAuthStore((s) => s.offline);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function login() {
    setBusy(true);
    setError("");
    try {
      await api.auth.login(username.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <View style={{ marginTop: 70, marginBottom: 40 }}>
          <Image
            source={logo}
            accessibilityLabel="Pool Safety Monitoring logo"
            style={{ width: 72, height: 72, borderRadius: 16 }}
          />
          <Text style={[styles.title, { marginTop: 20 }]}>
            Pool Safety{"\n"}Monitoring
          </Text>
          <Text style={styles.subtitle}>Stay alert. Respond together.</Text>
        </View>
        {offline && (
          <View style={styles.error}>
            <Text style={{ color: theme.critical }}>
              Cannot reach the server. Your saved session was kept; check the
              connection and retry.
            </Text>
            <Button
              label="Retry connection"
              secondary
              onPress={() => void restoreAuth()}
            />
          </View>
        )}
        <Field label="Username">
          <Input
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
          />
        </Field>
        <Field label="Password">
          <Input
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />
        </Field>
        {error && (
          <View style={styles.error}>
            <Text accessibilityRole="alert" style={{ color: theme.critical }}>
              {error}
            </Text>
          </View>
        )}
        <Button
          label={busy ? "Signing in…" : "Login"}
          disabled={busy || !username || !password}
          onPress={() => void login()}
        />
        <Text style={[styles.muted, { marginTop: 22 }]}>
          Lifeguard access{__DEV__ ? ` · ${baseUrl}` : ""}
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

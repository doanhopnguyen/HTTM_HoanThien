import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, baseUrl } from "../../api/client";
import { errorMessage } from "@pool-safety/shared";
import { Button, Field, Input, Screen, styles } from "../../components/ui";
import { theme } from "../../theme";
export function LoginScreen() {
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
        <View style={{ marginTop: 85, marginBottom: 45 }}>
          <Ionicons name="water" size={54} color={theme.primary} />
          <Text style={[styles.title, { marginTop: 20 }]}>
            Pool Safety{"\n"}Monitoring
          </Text>
          <Text style={styles.subtitle}>Stay alert. Respond together.</Text>
        </View>
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
            <Text style={{ color: theme.critical }}>{error}</Text>
          </View>
        )}
        <Button
          label={busy ? "Signing in…" : "Sign in"}
          disabled={busy || !username || !password}
          onPress={() => void login()}
        />
        <Text style={[styles.muted, { marginTop: 22 }]}>
          Lifeguard access · {baseUrl}
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

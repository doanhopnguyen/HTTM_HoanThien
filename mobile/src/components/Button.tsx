import { Pressable, Text } from "react-native";
import { theme } from "../theme";
import { styles } from "./styles";
export function Button({
  label,
  onPress,
  disabled,
  danger,
  secondary,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        danger && { backgroundColor: theme.critical },
        secondary && { backgroundColor: theme.border },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

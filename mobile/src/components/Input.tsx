import { cloneElement, isValidElement, type ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { theme } from "../theme";
import { styles } from "./styles";
export function Input(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor={theme.muted}
    />
  );
}
/** Labelled form control; the label doubles as the accessibility label. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {isValidElement<Record<string, unknown>>(children)
        ? cloneElement(children, { accessibilityLabel: label })
        : children}
    </View>
  );
}

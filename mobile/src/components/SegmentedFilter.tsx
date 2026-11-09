import { Pressable, Text, View } from "react-native";
import { theme, radius } from "../theme";
/** Horizontal set of mutually exclusive filter chips. */
export function SegmentedFilter<T extends string>({
  options,
  value,
  onChange,
  label = (option) => option.replaceAll("_", " "),
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label?: (option: T) => string;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 18,
      }}
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: selected ? theme.primary : theme.border,
              backgroundColor: selected ? theme.primary : theme.surface,
            }}
          >
            <Text
              style={{
                color: selected ? theme.onPrimary : theme.text,
                fontSize: 12,
                fontWeight: "700",
              }}
            >
              {label(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

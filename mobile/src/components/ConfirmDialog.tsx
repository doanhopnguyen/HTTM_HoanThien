import { Modal, Text, View } from "react-native";
import { Button } from "./Button";
import { Field, Input } from "./Input";
import { styles } from "./styles";
import { theme } from "../theme";
/**
 * Confirmation sheet. With `noteLabel` it also collects a required note
 * (resolution note / false alarm reason).
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  busy,
  error,
  noteLabel,
  note = "",
  onNoteChange,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  noteLabel?: string;
  note?: string;
  onNoteChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onCancel();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.heading}>{title}</Text>
          {message && (
            <Text style={[styles.text, { marginBottom: 12 }]}>{message}</Text>
          )}
          {noteLabel && (
            <Field label={noteLabel}>
              <Input
                value={note}
                onChangeText={onNoteChange}
                multiline
                numberOfLines={4}
                maxLength={5000}
                style={{ minHeight: 110, textAlignVertical: "top" }}
              />
            </Field>
          )}
          {error && (
            <Text accessibilityRole="alert" style={{ color: theme.critical }}>
              {error}
            </Text>
          )}
          <Button
            label={confirmLabel}
            danger={danger}
            disabled={busy || (!!noteLabel && !note.trim())}
            onPress={onConfirm}
          />
          <Button label="Cancel" secondary disabled={busy} onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

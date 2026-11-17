import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "@/theme/colors";

// The app's own confirmation dialog, in place of the white native
// Alert.alert. Same look as the "Couldn't start playback" box on the video
// screen (burgundy card, gold border, gold pill button).
//
// With no `buttons` it shows a single OK. With buttons, "cancel" renders as
// plain text, "destructive" in red, and the rest as the gold pill.
export type ThemedAlertButton = {
  label: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export type ThemedAlertState = {
  title: string;
  body: string;
  buttons?: ThemedAlertButton[];
} | null;

export default function ThemedAlert({
  alert,
  onClose,
}: {
  alert: ThemedAlertState;
  onClose: () => void;
}) {
  const buttons = alert?.buttons?.length ? alert.buttons : [{ label: "OK" }];
  return (
    <Modal visible={!!alert} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{alert?.title}</Text>
          <Text style={styles.body}>{alert?.body}</Text>
          <View style={styles.actions}>
            {buttons.map((b, i) => {
              const kind = (b as ThemedAlertButton).style || "default";
              return (
                <TouchableOpacity
                  key={i}
                  style={kind === "cancel" ? styles.plainButton : kind === "destructive" ? styles.dangerButton : styles.button}
                  onPress={() => {
                    onClose();
                    (b as ThemedAlertButton).onPress?.();
                  }}
                >
                  <Text style={kind === "cancel" ? styles.plainText : kind === "destructive" ? styles.dangerText : styles.buttonText}>
                    {b.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  box: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.burgundyDark,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.35)",
  },
  title: { color: COLORS.cream, fontSize: 17, fontWeight: "700", marginBottom: 8 },
  body: { color: COLORS.cream, opacity: 0.85, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 18 },
  button: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.gold },
  buttonText: { color: COLORS.ctaText, fontSize: 14, fontWeight: "700" },
  plainButton: { paddingHorizontal: 12, paddingVertical: 8 },
  plainText: { color: COLORS.cream, opacity: 0.7, fontSize: 14, fontWeight: "600" },
  dangerButton: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(248,113,113,0.9)" },
  dangerText: { color: "#1a0206", fontSize: 14, fontWeight: "700" },
});

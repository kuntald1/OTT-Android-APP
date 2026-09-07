import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, SPACING, TYPE } from "@/theme";

// Section title row with an optional count and a "See All" pill button.
export default function SectionHeader({
  title,
  count,
  onPressMore,
}: {
  title: string;
  count?: number;
  onPressMore?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {count != null && <Text style={styles.count}>{count}</Text>}
      <View style={styles.spacer} />
      {onPressMore && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={onPressMore}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.more}>See All ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  title: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.2, color: COLORS.cream },
  count: {
    ...TYPE.caption,
    color: COLORS.textFaint,
    marginLeft: SPACING.sm,
  },
  spacer: { flex: 1 },
  moreButton: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  more: { ...TYPE.caption, color: COLORS.gold },
});

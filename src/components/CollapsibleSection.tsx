import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "@/theme/colors";

// A row-style section that shows just its title + a one-line summary by
// default, expanding to show the full content when the chevron is tapped.
// Designed to be stacked with other CollapsibleSections inside one shared
// card container (see the `divider` prop) rather than standing alone.
export default function CollapsibleSection({
  title,
  summary,
  children,
  defaultExpanded = false,
  divider = true,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  divider?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={[styles.container, divider && styles.divider]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded((e) => !e)}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {!expanded && summary ? (
            <Text style={styles.summary} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerText: { flex: 1, marginRight: 12 },
  title: { color: COLORS.cream, fontSize: 16, fontWeight: "700" },
  summary: { color: COLORS.cream, opacity: 0.6, fontSize: 12, marginTop: 2 },
  chevron: { color: COLORS.gold, fontSize: 14 },
  content: { paddingBottom: 12 },
});

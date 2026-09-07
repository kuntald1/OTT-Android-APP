import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { COLORS, RADIUS, SPACING, TYPE } from "@/theme";

// Maps a category name (as it comes from the backend) to an icon — falls
// back to a generic tag icon for anything not in the list, so new
// categories never render blank.
const CATEGORY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  drama: "drama-masks",
  theatre: "theater",
  theater: "theater",
  "stand-up": "microphone-variant",
  standup: "microphone-variant",
  comedy: "microphone-variant",
  documentary: "movie-open-outline",
  musical: "music-note-outline",
  music: "music-note-outline",
};

function iconFor(category: string): keyof typeof MaterialCommunityIcons.glyphMap {
  return CATEGORY_ICONS[category.trim().toLowerCase()] || "shape-outline";
}

export default function CategoryRow({
  categories,
  onPressCategory,
}: {
  categories: string[];
  onPressCategory: (category: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category}
          style={styles.item}
          activeOpacity={0.8}
          onPress={() => onPressCategory(category)}
        >
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name={iconFor(category)} size={26} color={COLORS.gold} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
  item: { alignItems: "center", width: 76 },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  label: { ...TYPE.caption, color: COLORS.textMuted, textAlign: "center" },
});

import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { COLORS } from "@/theme/colors";

// The search box that sits at the top of a list: inside each expanded
// Community section, and again at the top of the full-list screen that
// section's "View all" opens. One component so the two can't drift apart
// — someone who learns the box on the Community page meets the same box
// everywhere else.
//
// Deliberately uncontrolled about WHAT it searches: the caller owns the
// filtering, so the same field narrows blog posts, rooms or organisers.
export default function SearchField({
  value,
  onChangeText,
  placeholder,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  style?: any;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(245,235,221,0.45)"
        returnKeyType="search"
        autoCorrect={false}
        // Typing a capital first letter then having to delete it is the
        // usual annoyance with a search box on Android.
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText("")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.clear}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
  },
  icon: { fontSize: 13, opacity: 0.8 },
  input: {
    flex: 1,
    color: COLORS.cream,
    fontSize: 14,
    // Height set by padding rather than a fixed height: the two
    // platforms size a TextInput's text box differently.
    paddingVertical: 9,
  },
  clear: { color: COLORS.cream, opacity: 0.6, fontSize: 14, paddingHorizontal: 2 },
});

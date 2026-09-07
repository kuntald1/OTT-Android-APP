import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Video } from "@/types";
import { COLORS, SPACING } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import MediaCard from "@/components/MediaCard";

// Reached from CategoriesScreen's genre/language/studio tiles. The matching
// videos are passed straight through via navigation params (already
// filtered client-side from the list CategoriesScreen fetched), so this
// screen needs no API call of its own. Plain flex-wrap + .map() — no
// FlatList — same pattern already confirmed to render posters correctly
// elsewhere in this app.
export default function FilteredVideosScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { title, videos } = route.params as { title: string; videos: Video[] };

  const goToDetail = (item: Video) =>
    navigation.navigate("VideoDetail", {
      video: item,
      relatedVideos: videos.filter((v) => v.id !== item.id),
    });

  return (
    <GradientBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{videos.length} title{videos.length === 1 ? "" : "s"}</Text>

        <View style={styles.grid}>
          {videos.map((item) => (
            <MediaCard key={item.id} video={item} onPress={() => goToDetail(item)} />
          ))}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { color: COLORS.cream, fontSize: 24, fontWeight: "800" },
  count: { color: COLORS.textMuted, marginTop: 4, marginBottom: SPACING.lg },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
});

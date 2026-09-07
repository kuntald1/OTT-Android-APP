import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchPlays } from "@/api/videos";
import { Video } from "@/types";
import { COLORS, SPACING } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import AppHeader from "@/components/AppHeader";
import SectionHeader from "@/components/SectionHeader";
import BrowseTile from "@/components/BrowseTile";

// One row per way of slicing the catalog. Everything here is derived
// client-side from the same /videos list Home already fetches — no new
// backend endpoints needed. "Studio" = uploaded_by_name, since that's the
// only uploader field videos carry; there's no organiser_id on Video to
// join against /organisers, so this groups by that name directly.
function buildRows(videos: Video[]) {
  const firstPosterFor = (matches: Video[]) =>
    matches.find((v) => v.poster_image_url || v.thumbnail_url);

  const genreMap = new Map<string, Video[]>();
  const languageMap = new Map<string, Video[]>();
  const studioMap = new Map<string, Video[]>();

  for (const video of videos) {
    for (const genre of video.categories) {
      if (!genreMap.has(genre)) genreMap.set(genre, []);
      genreMap.get(genre)!.push(video);
    }
    for (const lang of video.languages) {
      if (!languageMap.has(lang)) languageMap.set(lang, []);
      languageMap.get(lang)!.push(video);
    }
    if (video.uploaded_by_name) {
      if (!studioMap.has(video.uploaded_by_name)) studioMap.set(video.uploaded_by_name, []);
      studioMap.get(video.uploaded_by_name)!.push(video);
    }
  }

  const toRow = (map: Map<string, Video[]>) =>
    Array.from(map.entries()).map(([label, matches]) => ({
      label,
      matches,
      poster: firstPosterFor(matches)?.poster_image_url || firstPosterFor(matches)?.thumbnail_url,
    }));

  return { genres: toRow(genreMap), languages: toRow(languageMap), studios: toRow(studioMap) };
}

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setVideos(await fetchPlays());
      } catch {
        setError("Couldn't load categories");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { genres, languages, studios } = useMemo(() => buildRows(videos), [videos]);

  const openList = (title: string, matches: Video[]) =>
    navigation.navigate("FilteredVideos", { title, videos: matches });

  return (
    <GradientBackground style={styles.screen}>
      <AppHeader activeRoute="Categories" onSearch={setQuery} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {genres.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Genres" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {genres.map(({ label, matches, poster }) => (
                  <BrowseTile
                    key={label}
                    label={label}
                    posterUrl={poster}
                    onPress={() => openList(label, matches)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {languages.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Languages" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {languages.map(({ label, matches, poster }) => (
                  <BrowseTile
                    key={label}
                    label={label}
                    posterUrl={poster}
                    onPress={() => openList(label, matches)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {studios.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Studios" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {studios.map(({ label, matches, poster }) => (
                  <BrowseTile
                    key={label}
                    label={label}
                    posterUrl={poster}
                    onPress={() => openList(label, matches)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.textMuted },
  scrollContent: { paddingBottom: SPACING.xxl },
  section: { marginTop: SPACING.xl },
  row: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
});

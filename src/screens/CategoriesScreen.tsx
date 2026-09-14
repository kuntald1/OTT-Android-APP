import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  fetchPlays,
  fetchLanguages,
  fetchStudios,
  fetchVideosByLanguage,
  LanguageOption,
  StudioOption,
} from "@/api/videos";
import { Video } from "@/types";
import { COLORS, SPACING } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import AppHeader from "@/components/AppHeader";
import SectionHeader from "@/components/SectionHeader";
import BrowseTile from "@/components/BrowseTile";

const SECTION: "play" = "play";

// Genres has no dedicated backend endpoint (unlike Languages/Studios,
// confirmed via /videos/languages and /videos/studios), so it's still
// derived client-side from the full Play video list.
function buildGenreRow(videos: Video[]) {
  const map = new Map<string, Video[]>();
  for (const video of videos) {
    for (const genre of video.categories) {
      if (!map.has(genre)) map.set(genre, []);
      map.get(genre)!.push(video);
    }
  }
  return Array.from(map.entries()).map(([label, matches]) => ({
    label,
    matches,
    poster: matches.find((v) => v.poster_image_url || v.thumbnail_url)?.poster_image_url,
  }));
}

export default function CategoriesScreen() {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [studios, setStudios] = useState<StudioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loadingLanguage, setLoadingLanguage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [playVideos, languageOptions, studioOptions] = await Promise.all([
          fetchPlays(),
          fetchLanguages(SECTION),
          fetchStudios(SECTION),
        ]);
        setVideos(playVideos);
        setLanguages(languageOptions);
        setStudios(studioOptions);
      } catch {
        setError("Couldn't load categories");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const genres = useMemo(() => buildGenreRow(videos), [videos]);

  const openGenre = (title: string, matches: Video[]) =>
    navigation.navigate("FilteredVideos", { title, videos: matches });

  const openLanguage = async (language: string) => {
    setLoadingLanguage(language);
    try {
      const matches = await fetchVideosByLanguage(SECTION, language);
      navigation.navigate("FilteredVideos", { title: language, videos: matches });
    } finally {
      setLoadingLanguage(null);
    }
  };

  const openStudio = (studio: StudioOption) =>
    navigation.navigate("StudioProfile", { userId: studio.user_id, name: studio.name, section: SECTION });

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
                    onPress={() => openGenre(label, matches)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {languages.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Languages" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {languages.map((l) => (
                  <BrowseTile
                    key={l.language}
                    label={l.language}
                    posterUrl={l.poster_image_url || undefined}
                    loading={loadingLanguage === l.language}
                    onPress={() => openLanguage(l.language)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {studios.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Studios" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {studios.map((s) => (
                  <BrowseTile
                    key={s.user_id}
                    label={s.name}
                    posterUrl={s.poster_image_url || undefined}
                    onPress={() => openStudio(s)}
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

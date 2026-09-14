import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { fetchArchive, fetchLanguages, fetchStudios, fetchVideosByLanguage, LanguageOption, StudioOption } from "@/api/videos";
import { fetchArchiveHeroSlides, ArchiveHeroSlide } from "@/api/archive";
import { resolveMediaUrl } from "@/api/apiClient";
import { Video } from "@/types";
import { COLORS, ELEVATION, SPACING, TYPE } from "@/theme";
import AppHeader from "@/components/AppHeader";
import GradientBackground from "@/components/GradientBackground";
import SectionHeader from "@/components/SectionHeader";
import ArchiveCompactCard from "@/components/ArchiveCompactCard";
import BrowseTile from "@/components/BrowseTile";

const SLIDE_INTERVAL_MS = 5000;
// Reference-matched: a short, wide banner (like a typical streaming-app
// hero carousel) instead of a near-full-screen height — much shorter than
// before, per explicit feedback that the old height (65% of screen) was
// too tall.
const HERO_HEIGHT = Dimensions.get("window").width * 0.55;

function groupByCategory(videos: Video[]): { category: string; videos: Video[] }[] {
  const order: string[] = [];
  const map = new Map<string, Video[]>();
  for (const video of videos) {
    for (const category of video.categories) {
      if (!map.has(category)) {
        map.set(category, []);
        order.push(category);
      }
      map.get(category)!.push(video);
    }
  }
  return order.map((category) => ({ category, videos: map.get(category)! }));
}

// Archive keeps its own sepia-bronze sub-theme — intentionally distinct
// from the burgundy of the rest of the app, for a vintage feel.
export default function ArchiveScreen() {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [slides, setSlides] = useState<ArchiveHeroSlide[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [studios, setStudios] = useState<StudioOption[]>([]);
  const [loadingLanguage, setLoadingLanguage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setVideos(await fetchArchive());
    } catch {
      setError("Couldn't load, try again");
    }
    try {
      setSlides(await fetchArchiveHeroSlides());
    } catch {
      setSlides([]);
    }
    try {
      setLanguages(await fetchLanguages("archive"));
    } catch {
      setLanguages([]);
    }
    try {
      setStudios(await fetchStudios("archive"));
    } catch {
      setStudios([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setSlideIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [slides.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sections = useMemo(
    () =>
      groupByCategory(
        query.trim()
          ? videos.filter((v) => v.title.toLowerCase().includes(query.trim().toLowerCase()))
          : videos
      ),
    [videos, query]
  );

  const activeSlide = slides[slideIndex];

  const goToDetail = (item: Video) =>
    navigation.navigate("VideoDetail", {
      video: item,
      relatedVideos: videos.filter(
        (v) => v.id !== item.id && v.categories.some((c) => item.categories.includes(c))
      ),
    });

  const openLanguage = async (language: string) => {
    setLoadingLanguage(language);
    try {
      const matches = await fetchVideosByLanguage("archive", language);
      navigation.navigate("FilteredVideos", { title: language, videos: matches });
    } finally {
      setLoadingLanguage(null);
    }
  };

  const openStudio = (studio: StudioOption) =>
    navigation.navigate("StudioProfile", { userId: studio.user_id, name: studio.name, section: "archive" });

  return (
    <GradientBackground
      style={styles.screen}
      colors={[COLORS.archiveBackground, COLORS.archiveMid, COLORS.archiveDark]}
    >
      <AppHeader activeRoute="Archive" onSearch={setQuery} showSwitcher />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.archiveGold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.archiveGold} />
          }
        >
          {activeSlide && !query.trim() && (
            <View style={styles.hero}>
              <Image
                source={{ uri: resolveMediaUrl(activeSlide.image_url) }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", "rgba(20,12,4,0.72)", "rgba(20,12,4,0.95)"]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroText}>
                {activeSlide.eyebrow && (
                  <Text style={styles.heroEyebrow}>{activeSlide.eyebrow.toUpperCase()}</Text>
                )}
                <Text style={styles.heroHeadline} numberOfLines={1}>
                  {activeSlide.headline}
                </Text>
                {activeSlide.subtext && (
                  <Text style={styles.heroSubtext} numberOfLines={1}>
                    {activeSlide.subtext}
                  </Text>
                )}
              </View>
              {slides.length > 1 && (
                <View style={styles.dotsRow}>
                  {slides.map((s, i) => (
                    <View key={s.id} style={[styles.dot, i === slideIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          )}

          {sections.length === 0 && (
            <View style={styles.center}>
              <Text style={styles.errorText}>Nothing found</Text>
            </View>
          )}

          {sections.map(({ category, videos: categoryVideos }) => (
            <View key={category} style={styles.section}>
              <SectionHeader title={category} count={categoryVideos.length} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}
              >
                {categoryVideos.map((item) => (
                  <ArchiveCompactCard key={item.id} video={item} onPress={() => goToDetail(item)} />
                ))}
              </ScrollView>
            </View>
          ))}

          {languages.length > 0 && !query.trim() && (
            <View style={styles.section}>
              <SectionHeader title="Popular Languages" />
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

          {studios.length > 0 && !query.trim() && (
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
  container: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xxl,
  },
  errorText: { ...TYPE.body, color: COLORS.textMuted },
  hero: {
    height: HERO_HEIGHT,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: COLORS.archiveDark,
    ...ELEVATION.hero,
  },
  heroText: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xs },
  heroEyebrow: { ...TYPE.overline, color: COLORS.archiveGold },
  heroHeadline: { ...TYPE.title, fontSize: 20, color: COLORS.cream, marginTop: 2 },
  heroSubtext: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  dotsRow: { flexDirection: "row", gap: 5, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)" },
  dotActive: { backgroundColor: COLORS.archiveGold, width: 16 },
  section: { marginTop: SPACING.xl },
  row: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
});

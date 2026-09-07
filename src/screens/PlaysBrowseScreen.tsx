import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  fetchContinueWatching,
  fetchPlays,
  fetchRecommendations,
  ContinueWatchingItem,
} from "@/api/videos";
import { Video } from "@/types";
import { COLORS, SPACING, TYPE } from "@/theme";
import AppHeader from "@/components/AppHeader";
import GradientBackground from "@/components/GradientBackground";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import SectionHeader from "@/components/SectionHeader";
import MediaCard from "@/components/MediaCard";
import CategoryRow from "@/components/CategoryRow";

// Groups videos by category the same way the web app's rows work — a video
// with multiple categories appears in each of its category rows.
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

export default function PlaysBrowseScreen() {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [recommended, setRecommended] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({}).current;

  const load = useCallback(async () => {
    try {
      setError(null);
      setVideos(await fetchPlays());
    } catch {
      setError("Couldn't load, try again");
    }
    try {
      setContinueWatching(await fetchContinueWatching());
    } catch {
      setContinueWatching([]);
    }
    try {
      setRecommended(await fetchRecommendations());
    } catch {
      setRecommended([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // NOTE: no confirmed backend search endpoint yet — filters the loaded
  // list client-side by title as a working stand-in.
  const filtered = useMemo(() => {
    if (!query.trim()) return videos;
    const q = query.trim().toLowerCase();
    return videos.filter((v) => v.title.toLowerCase().includes(q));
  }, [videos, query]);

  const sections = useMemo(() => groupByCategory(filtered), [filtered]);
  const searching = !!query.trim();

  const goToDetail = (item: Video) =>
    navigation.navigate("VideoDetail", {
      video: item,
      relatedVideos: videos.filter(
        (v) => v.id !== item.id && v.categories.some((c) => item.categories.includes(c))
      ),
    });

  const scrollToCategory = (category: string) => {
    const y = sectionOffsets[category];
    if (y != null) scrollRef.current?.scrollTo({ y, animated: true });
  };

  return (
    <GradientBackground style={styles.screen}>
      <AppHeader activeRoute="Plays" onSearch={setQuery} showSwitcher />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
          }
        >
          {videos.length > 0 && !searching && (
            <View style={styles.carouselSection}>
              <FeaturedCarousel videos={videos.slice(0, 8)} onPressCard={goToDetail} />
            </View>
          )}

          {continueWatching.length > 0 && !searching && (
            <View style={styles.section}>
              <SectionHeader title="Continue Watching" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {continueWatching.map((item) => {
                  const fullVideo = videos.find((v) => v.id === item.video_id);
                  if (!fullVideo) return null;
                  return (
                    <MediaCard
                      key={item.video_id}
                      video={fullVideo}
                      progressPercent={item.progress_percent}
                      onPress={() => goToDetail(fullVideo)}
                    />
                  );
                })}
              </ScrollView>
            </View>
          )}

          {sections.length > 0 && !searching && (
            <View style={styles.section}>
              <SectionHeader title="Categories" />
              <CategoryRow
                categories={sections.map((s) => s.category)}
                onPressCategory={scrollToCategory}
              />
            </View>
          )}

          {recommended.length > 0 && !searching && (
            <View style={styles.section}>
              <SectionHeader title="Recommended for You" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {recommended.map((item) => (
                  <MediaCard key={item.id} video={item} onPress={() => goToDetail(item)} />
                ))}
              </ScrollView>
            </View>
          )}

          {sections.length === 0 && (
            <View style={styles.center}>
              <Text style={styles.errorText}>Nothing found</Text>
            </View>
          )}

          {sections.map(({ category, videos: categoryVideos }) => (
            <View
              key={category}
              style={styles.section}
              onLayout={(e) => {
                sectionOffsets[category] = e.nativeEvent.layout.y;
              }}
            >
              <SectionHeader title={category} count={categoryVideos.length} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {categoryVideos.map((item) => (
                  <MediaCard key={item.id} video={item} onPress={() => goToDetail(item)} />
                ))}
              </ScrollView>
            </View>
          ))}
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
  carouselSection: { marginTop: SPACING.sm },
  section: { marginTop: SPACING.xl },
  row: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
});

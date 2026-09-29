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
  fetchArchive,
  fetchRecommendations,
  fetchLanguages,
  fetchStudios,
  fetchVideosByLanguage,
  fetchSpecialCategories,
  ContinueWatchingItem,
  LanguageOption,
  StudioOption,
  SpecialCategory,
} from "@/api/videos";
import { Video } from "@/types";
import { onSubscriptionChanged } from "@/hooks/useSubscriptionAccess";
import { COLORS, SPACING, TYPE } from "@/theme";
import AppHeader from "@/components/AppHeader";
import GradientBackground from "@/components/GradientBackground";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import SectionHeader from "@/components/SectionHeader";
import MediaCard from "@/components/MediaCard";
import BrowseTile from "@/components/BrowseTile";

export default function PlaysBrowseScreen() {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<Video[]>([]);
  // A Section Wise Video row can be curated with videos from EITHER
  // section (Admin's picker searches all published videos, not just
  // this section's) — so a Play-screen row can legitimately contain
  // an Archive video, and vice versa. This second pool exists purely
  // so resolveFullVideo below can still find the REAL has_access,
  // categories, languages, etc. for such a video instead of falling
  // back to the special-categories endpoint's minimal shape — that
  // fallback is what caused a "Both" subscriber to see "subscription
  // needed" on a video they actually have access to (has_access came
  // through as simply missing, not confirmed false). Never rendered
  // as its own row here — only used for this lookup.
  const [otherSectionVideos, setOtherSectionVideos] = useState<Video[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [recommended, setRecommended] = useState<Video[]>([]);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [studios, setStudios] = useState<StudioOption[]>([]);
  const [specialCategories, setSpecialCategories] = useState<SpecialCategory[]>([]);
  const [loadingLanguage, setLoadingLanguage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const scrollRef = useRef<ScrollView>(null);

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
    try {
      setLanguages(await fetchLanguages("play"));
    } catch {
      setLanguages([]);
    }
    try {
      setStudios(await fetchStudios("play"));
    } catch {
      setStudios([]);
    }
    try {
      setSpecialCategories(await fetchSpecialCategories("play"));
    } catch {
      setSpecialCategories([]);
    }
    try {
      setOtherSectionVideos(await fetchArchive());
    } catch {
      setOtherSectionVideos([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  // Refresh access flags (lock badges) right after a subscription change —
  // silently (no spinner), so the scroll position stays put.
  useEffect(() => onSubscriptionChanged(() => { load(); }), [load]);

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

  const searching = !!query.trim();

  // Dated Special Categories (a temporary banner, e.g. "Sunday
  // Special") always render first, above everything. Permanent ones
  // ("Section Wise Video" in Admin, no end date) sit where an
  // auto-generated category row (Drama, Popular Shows, etc.) used to
  // go — those were removed at a client's request in favour of fully
  // hand-picked, hand-ordered rows. See the web app's identical split
  // in VideoStreaming/VideoBrowsePage.jsx.
  //
  // The special-categories endpoint returns a MINIMAL video shape
  // (id/title/poster/trailer only — no has_access, categories,
  // monetization_type, etc.), so each entry is resolved against the
  // full `videos` list (same list Continue Watching already uses this
  // way) to get the real object. Without this, MediaCard's lock badge
  // reads `has_access` as undefined -> falsy -> shows "locked" on
  // EVERY card in these rows regardless of actual access, and
  // relatedVideos' categories-crash from before would resurface for
  // anything opened straight from here. Falls back to the minimal
  // data only if a video isn't found in the current listing.
  const resolveFullVideo = useCallback(
    (minimal: Video) =>
      videos.find((v) => v.id === minimal.id) ||
      otherSectionVideos.find((v) => v.id === minimal.id) ||
      minimal,
    [videos, otherSectionVideos]
  );
  const datedSpecials = useMemo(
    () => specialCategories.filter((sc) => sc.visible_from).map((sc) => ({ ...sc, videos: sc.videos.map(resolveFullVideo) })),
    [specialCategories, resolveFullVideo]
  );
  const permanentSpecials = useMemo(
    () => specialCategories.filter((sc) => !sc.visible_from).map((sc) => ({ ...sc, videos: sc.videos.map(resolveFullVideo) })),
    [specialCategories, resolveFullVideo]
  );

  const goToDetail = (item: Video) =>
    navigation.navigate("VideoDetail", {
      video: item,
      relatedVideos: videos.filter(
        (v) => v.id !== item.id && (v.categories || []).some((c) => (item.categories || []).includes(c))
      ),
    });

  const openLanguage = async (language: string) => {
    setLoadingLanguage(language);
    try {
      const matches = await fetchVideosByLanguage("play", language);
      navigation.navigate("FilteredVideos", { title: language, videos: matches });
    } finally {
      setLoadingLanguage(null);
    }
  };

  const openStudio = (studio: StudioOption) =>
    navigation.navigate("StudioProfile", { userId: studio.user_id, name: studio.name, section: "play" });

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

          {searching ? (
            <View style={styles.section}>
              <SectionHeader title="Search Results" count={filtered.length} />
              {filtered.length === 0 ? (
                <View style={styles.center}>
                  <Text style={styles.errorText}>Nothing found</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                  {filtered.map((item) => (
                    <MediaCard key={item.id} video={item} onPress={() => goToDetail(item)} />
                  ))}
                </ScrollView>
              )}
            </View>
          ) : (
            <>
              {datedSpecials.map((sc) => (
                <View key={sc.id} style={styles.section}>
                  <SectionHeader title={sc.title} count={sc.videos.length} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {sc.videos.map((item) => (
                      <MediaCard key={item.id} video={item} onPress={() => goToDetail(item)} />
                    ))}
                  </ScrollView>
                </View>
              ))}

              {recommended.length > 0 && (
                <View style={styles.section}>
                  <SectionHeader title="Recommended for You" />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {recommended.map((item) => (
                      <MediaCard key={item.id} video={item} onPress={() => goToDetail(item)} />
                    ))}
                  </ScrollView>
                </View>
              )}

              {permanentSpecials.map((sc) => (
                <View key={sc.id} style={styles.section}>
                  <SectionHeader title={sc.title} count={sc.videos.length} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                    {sc.videos.map((item) => (
                      <MediaCard key={item.id} video={item} onPress={() => goToDetail(item)} />
                    ))}
                  </ScrollView>
                </View>
              ))}

              {continueWatching.length > 0 && (
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

              {languages.length > 0 && (
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
            </>
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
  carouselSection: { marginTop: SPACING.sm },
  section: { marginTop: SPACING.xl },
  row: { paddingHorizontal: SPACING.lg, gap: SPACING.md },
});

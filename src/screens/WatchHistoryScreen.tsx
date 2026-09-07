import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchPlays, fetchArchive, fetchWatchHistory, WatchHistoryItem } from "@/api/videos";
import { Video } from "@/types";
import { COLORS, SPACING } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import MediaCard from "@/components/MediaCard";

// Watch history only returns id/title/poster/progress, not the full Video
// object MediaCard/VideoDetail need (categories, monetization, etc.) — so
// this matches each history entry against the full Play+Archive catalog by
// id to get the full object, the same way Continue Watching already does
// on Home.
export default function WatchHistoryScreen() {
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [historyData, playVideos, archiveVideos] = await Promise.all([
          fetchWatchHistory(),
          fetchPlays(),
          fetchArchive(),
        ]);
        setHistory(historyData);
        setVideos([...playVideos, ...archiveVideos]);
      } catch {
        setError("Couldn't load watch history");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goToDetail = (item: Video) =>
    navigation.navigate("VideoDetail", { video: item, relatedVideos: [] });

  return (
    <GradientBackground style={styles.screen}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>You haven't watched anything yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {history.map((item) => {
              const fullVideo = videos.find((v) => v.id === item.video_id);
              if (!fullVideo) return null;
              const progressPercent = item.finished
                ? 100
                : Math.min(100, (item.position_seconds / item.duration_seconds) * 100);
              return (
                <MediaCard
                  key={item.video_id}
                  video={fullVideo}
                  progressPercent={progressPercent}
                  onPress={() => goToDetail(fullVideo)}
                />
              );
            })}
          </View>
        </ScrollView>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.textMuted },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
});

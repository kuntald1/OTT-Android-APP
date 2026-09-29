import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { fetchMyVideos } from "@/api/videos";
import { resolveMediaUrl } from "@/api/apiClient";
import { Video, VideoStatus } from "@/types";
import { COLORS, SPACING, TYPE } from "@/theme";

// View-only on mobile — the web app's edit actions (Change poster,
// Replace trailer, subtitle upload) aren't reproduced here, only the
// list itself. Tapping a row reuses the existing VideoDetailScreen.
export default function MyVideoListScreen() {
  const navigation = useNavigation<any>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setVideos(await fetchMyVideos());
    } catch {
      setError("Couldn't load your videos");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statusStyle = (status: VideoStatus) => {
    switch (status) {
      case "published":
        return styles.statusPublished;
      case "pending":
        return styles.statusPending;
      case "rejected":
        return styles.statusRejected;
      default:
        return styles.statusDisabled;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      {error && <Text style={styles.errorText}>{error}</Text>}

      {!error && videos.length === 0 && (
        <Text style={styles.emptyText}>You haven't uploaded any videos yet.</Text>
      )}

      {videos.map((video) => (
        <TouchableOpacity
          key={video.id}
          style={styles.row}
          onPress={() => navigation.navigate("VideoDetail", { video })}
        >
          <Image
            source={{ uri: resolveMediaUrl(video.poster_image_url) || resolveMediaUrl(video.thumbnail_url) }}
            style={styles.poster}
            resizeMode="cover"
          />
          <View style={styles.rowContent}>
            <Text style={styles.title} numberOfLines={1}>
              {video.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {video.release_year} · {Math.round(video.duration_seconds / 60)}m
              {video.languages.length > 0 ? ` · ${video.languages.join(", ")}` : ""}
            </Text>
            {video.categories.length > 0 && (
              <Text style={styles.categories} numberOfLines={1}>
                {video.categories.join(" · ")}
              </Text>
            )}
            <View style={styles.rowFooter}>
              <View style={[styles.statusBadge, statusStyle(video.status)]}>
                <Text style={styles.statusText}>
                  {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                </Text>
              </View>
              {video.created_at && (
                <Text style={styles.submittedText}>
                  Submitted {new Date(video.created_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg },
  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { ...TYPE.body, color: COLORS.burgundyLight, textAlign: "center", marginTop: SPACING.xl },
  emptyText: { ...TYPE.body, color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.xl },
  row: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: SPACING.sm,
  },
  poster: {
    width: 90,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.burgundyDark,
  },
  rowContent: { flex: 1, justifyContent: "center" },
  title: { ...TYPE.body, color: COLORS.cream, fontWeight: "700", fontSize: 15 },
  meta: { ...TYPE.caption, color: COLORS.gold, marginTop: 4 },
  categories: { ...TYPE.caption, color: COLORS.textMuted, marginTop: 2 },
  rowFooter: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusPublished: { backgroundColor: "rgba(74,222,128,0.18)" },
  statusPending: { backgroundColor: "rgba(250,204,21,0.18)" },
  statusRejected: { backgroundColor: "rgba(248,113,113,0.18)" },
  statusDisabled: { backgroundColor: "rgba(255,255,255,0.12)" },
  statusText: { ...TYPE.caption, color: COLORS.cream, fontSize: 11, fontWeight: "700" },
  submittedText: { ...TYPE.caption, color: COLORS.textMuted, fontSize: 11 },
});

import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { fetchVideosByStudio } from "@/api/videos";
import { fetchPublicOrganiserSections, fetchOrganiserCover, ProfileSection } from "@/api/organiserProfile";
import { resolveMediaUrl } from "@/api/apiClient";
import { htmlToPlainText } from "@/utils/html";
import { Video } from "@/types";
import { COLORS, SPACING, TYPE } from "@/theme";
import GradientBackground from "@/components/GradientBackground";
import FullWidthMediaCard from "@/components/FullWidthMediaCard";

export default function StudioProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId, name, section } = route.params as {
    userId: string;
    name: string;
    section: "play" | "archive";
  };

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [sections, setSections] = useState<ProfileSection[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cover, aboutSections, studioVideos] = await Promise.all([
          fetchOrganiserCover(userId).catch(() => ({ cover_image_url: null })),
          fetchPublicOrganiserSections(userId).catch(() => []),
          fetchVideosByStudio(section, userId).catch(() => []),
        ]);
        setCoverUrl(resolveMediaUrl(cover.cover_image_url));
        setSections(aboutSections);
        setVideos(studioVideos);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, section]);

  const goToDetail = (item: Video) =>
    navigation.navigate("VideoDetail", {
      video: item,
      relatedVideos: videos.filter((v) => v.id !== item.id),
    });

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {coverUrl && <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />}

        <Text style={styles.name}>{name}</Text>

        {sections.map((s) => (
          <View key={s.id} style={styles.aboutBlock}>
            {s.title && s.title !== name && <Text style={styles.aboutTitle}>{s.title}</Text>}
            <Text style={styles.aboutText}>{htmlToPlainText(s.content_html)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>
          {videos.length} title{videos.length === 1 ? "" : "s"}
        </Text>
        <View style={styles.stack}>
          {videos.map((item) => (
            <FullWidthMediaCard key={item.id} video={item} onPress={() => goToDetail(item)} />
          ))}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: SPACING.xxl },
  cover: { width: "100%", height: 180 },
  name: { ...TYPE.display, color: COLORS.cream, paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  aboutBlock: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  aboutTitle: { ...TYPE.section, color: COLORS.gold, marginBottom: SPACING.xs },
  aboutText: { ...TYPE.body, color: COLORS.textMuted, lineHeight: 20 },
  sectionTitle: {
    ...TYPE.section,
    color: COLORS.cream,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  stack: { paddingHorizontal: SPACING.lg, gap: SPACING.lg },
});
